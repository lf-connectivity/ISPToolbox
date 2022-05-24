import mapboxgl from 'mapbox-gl';
import * as _ from 'lodash';
import { Geometry } from 'geojson';
import {
    SQM_2_SQFT,
    WorkspaceEvents,
    WorkspaceFeatureTypes
} from '../workspace/WorkspaceConstants';
import { MarketEvaluatorTowerPopup } from '../isptoolbox-mapbox-draw/popups/TowerPopups';
import { MarketEvaluatorWorkspaceManager } from '../workspace/MarketEvaluatorWorkspaceManager';
import MarketEvaluatorWS, {
    BuildingOverlaysResponse,
    MarketEvalWSEvents,
    MarketEvalWSRequestType
} from '../MarketEvaluatorWS';
import { GeometryCollection } from '@turf/helpers';
//@ts-ignore
import geojsonArea from '@mapbox/geojson-area';
import { MarketEvaluatorSectorPopup } from '../isptoolbox-mapbox-draw/popups/AjaxSectorPopups';
import {
    BUILDING_DATA_SOURCE,
    BUILDING_LAYER,
    RadiusAndBuildingCoverageRenderer
} from './RadiusAndBuildingCoverageRenderer';

export class MarketEvaluatorRadiusAndBuildingCoverageRenderer extends RadiusAndBuildingCoverageRenderer {
    buildingOverlays: GeometryCollection;
    buildingFilterSize: [number, number];
    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        super(
            map,
            draw,
            MarketEvaluatorWorkspaceManager,
            MarketEvaluatorTowerPopup,
            MarketEvaluatorSectorPopup
        );

        this.buildingOverlays = {
            type: 'GeometryCollection',
            geometries: []
        };
        PubSub.subscribe(
            MarketEvalWSEvents.BUILDING_OVERLAYS_MSG,
            this.onBuildingOverlayMsg.bind(this)
        );
    }

    updateBuildingFilterSize(range: [number, number]) {
        this.buildingFilterSize = range;
        this.renderBuildings();
    }

    addBuildingLayer() {
        this.map.addLayer({
            id: BUILDING_LAYER,
            type: 'fill',
            source: BUILDING_DATA_SOURCE,
            layout: {},
            paint: {
                'fill-color': '#FAFF00',
                'fill-opacity': 0.65
            }
        });
        // Wait for mapbox draw to finish loading - once complete place buildings above mapbox draw layers
        // If you can think of a better way to do this - feel free to replace
        const addBuildingLayerHelper = (r: mapboxgl.MapDataEvent) => {
            const draw_layers_loaded = r.target
                .getStyle()
                .layers?.some(
                    (l) => l.type === 'line' && (l.source as string).includes('mapbox-gl-draw')
                );
            if (draw_layers_loaded) {
                this.map.moveLayer(BUILDING_LAYER);
                this.map.off('styledata', addBuildingLayerHelper);
            }
        };
        this.map.on('styledata', addBuildingLayerHelper);
    }

    drawDeleteCallback({ features }: { features: Array<any> }) {
        this.sendCoverageRequest({ features: this.draw.getSelected().features });
        super.drawDeleteCallback({ features });
    }

    drawUpdateCallback({
        features,
        action
    }: {
        features: Array<GeoJSON.Feature>;
        action: undefined | 'read' | 'move' | 'change_coordinates';
    }) {
        if (action === 'move' || action === 'change_coordinates') {
            this.last_selection = '';
            this.map.fire('draw.selectionchange', { features: features });
        } else if (action === 'read') {
            this.sendCoverageRequest({ features: this.draw.getSelected().features });
            this.renderBuildings();
        }
    }

    sendCoverageRequest({ features }: any) {
        let geometries: Geometry[] = [];

        features = this.addSectorsToSelection(features);
        features = features.filter(this.shouldRenderFeature).filter((f: GeoJSON.Feature) => {
            return (
                f.properties &&
                (f.properties.feature_type === WorkspaceFeatureTypes.COVERAGE_AREA ||
                    f.properties.feature_type === WorkspaceFeatureTypes.SECTOR)
            );
        });

        let featuresToProcess;
        if (features.length === 0) {
            featuresToProcess = this.draw.getAll().features;
        } else {
            featuresToProcess = features;
        }
        MarketEvaluatorWS.getInstance().cancelCurrentRequest(MarketEvalWSRequestType.POLYGON);
        this.buildingOverlays.geometries = [];

        featuresToProcess.forEach((f: GeoJSON.Feature) => {
            if (f.properties && f.properties.feature_type && this.shouldRenderFeature(f)) {
                switch (f.properties.feature_type) {
                    case WorkspaceFeatureTypes.COVERAGE_AREA:
                        geometries.push(f.geometry);
                        break;
                    case WorkspaceFeatureTypes.SECTOR:
                        geometries.push(this.processSectorFeature(f));
                        break;
                }
            }
        });

        if (geometries.length > 0) {
            MarketEvaluatorWS.getInstance().sendPolygonRequest({
                type: 'GeometryCollection',
                geometries: geometries
            });
        } else {
            PubSub.publish(WorkspaceEvents.NO_ITEMS);
        }
    }

    renderBuildings() {
        const buildingSource = this.map.getSource(BUILDING_DATA_SOURCE);
        if (buildingSource.type === 'geojson') {
            const polygons = [];
            for (const poly of this.buildingOverlays.geometries) {
                const area = SQM_2_SQFT * geojsonArea.geometry(poly);
                if (this.buildingFilterSize[0] <= area && area <= this.buildingFilterSize[1]) {
                    polygons.push(poly);
                }
            }
            buildingSource.setData({
                type: 'Feature',
                geometry: { type: 'GeometryCollection', geometries: polygons },
                properties: {}
            });
        }
    }

    onBuildingOverlayMsg(msg: string, response: BuildingOverlaysResponse) {
        let bounds: number[] = [Number.MIN_VALUE, Number.MAX_VALUE];
        if (response.gc !== null && response.offset !== null) {
            if (response.offset === '0') {
                this.buildingOverlays.geometries = [];
            }
            this.buildingOverlays.geometries.push(...response.gc.geometries);
            bounds = this.calculateMinMaxBuildingSizes();
        }
        PubSub.publish('filter.bounds_update', bounds);
        this.renderBuildings();
    }

    calculateMinMaxBuildingSizes() {
        const areas = this.buildingOverlays.geometries.map((g) => {
            return SQM_2_SQFT * geojsonArea.geometry(g);
        });
        return [Math.floor(Math.min(...areas)), Math.ceil(Math.max(...areas))];
    }

    private addSectorsToSelection(features: Array<any>) {
        let feats = features.filter(this.shouldRenderFeature);
        let newIds = new Set(feats.map((f) => f.id));
        let sectorsAdded: boolean = true;
        feats.forEach((f: GeoJSON.Feature) => {
            if (
                f.properties &&
                f.properties.feature_type === WorkspaceFeatureTypes.AP &&
                this.shouldRenderFeature(f) &&
                f.properties.sectors
            ) {
                f.properties.sectors.forEach((id: string) => {
                    if (!newIds.has(id)) {
                        sectorsAdded = false;
                        newIds.add(id);
                    }
                });
            }
        });

        return Array.from(newIds).map((id) => this.draw.get(id));
    }

    private processSectorFeature(f: GeoJSON.Feature) {
        if (f.properties?.geojson_json) {
            return JSON.parse(f.properties?.geojson_json);
        } else {
            // edge case
            return f;
        }
    }
}
