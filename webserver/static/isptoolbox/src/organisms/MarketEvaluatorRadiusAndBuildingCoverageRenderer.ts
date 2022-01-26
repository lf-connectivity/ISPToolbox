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
} from './APCoverageRenderer';
import { BaseWorkspaceManager } from '../workspace/BaseWorkspaceManager';
import { AccessPoint } from '../workspace/WorkspaceFeatures';
import { AccessPointSector } from '../workspace/WorkspaceSectorFeature';

export class MarketEvaluatorRadiusAndBuildingCoverageRenderer extends RadiusAndBuildingCoverageRenderer {
    buildingOverlays: GeometryCollection;
    buildingFilterSize: [number, number];
    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        super(
            map,
            draw,
            MarketEvaluatorWorkspaceManager,
            MarketEvaluatorTowerPopup,
            MarketEvaluatorSectorPopup,
            {
                renderCloudRF: true
            }
        );

        this.buildingOverlays = {
            type: 'GeometryCollection',
            geometries: []
        };
        PubSub.subscribe(
            MarketEvalWSEvents.BUILDING_OVERLAYS_MSG,
            this.onBuildingOverlayMsg.bind(this)
        );
        PubSub.subscribe(
            WorkspaceEvents.CLOUDRF_COVERAGE_UPDATED,
            this.viewshedLoadedCallback.bind(this)
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
                'fill-color': '#42B72A',
                'fill-opacity': 0.8
            }
        });
    }

    drawDeleteCallback({ features }: { features: Array<any> }) {
        this.sendCoverageRequest({ features: [] });
        super.drawDeleteCallback({ features });
    }

    drawSelectionChangeCallback({ features }: { features: Array<any> }) {
        let finalFeatures = features;
        // Add tower sectors to selection if a tower is selected
        if (this.draw.getMode() === 'simple_select' && !this.isDragging) {
            let { sectorsAdded, newFeatures, newIds } = this.addSectorsToSelection(features);

            if (!sectorsAdded) {
                // I guess delaying the selection change actually makes it work
                setTimeout(() => {
                    this.draw.changeMode('simple_select', {
                        featureIds: Array.from(newIds)
                    });
                }, 10);

                finalFeatures = newFeatures;
            }
        }

        super.drawSelectionChangeCallback({ features: finalFeatures });
    }

    drawUpdateCallback({
        features,
        action
    }: {
        features: Array<GeoJSON.Feature>;
        action: undefined | 'move' | 'change_coordinates';
    }) {
        if (action === 'move' || action === 'change_coordinates') {
            this.last_selection = '';
            this.isDragging = false;
            this.map.fire('draw.selectionchange', { features: features });
        }
    }

    sendCoverageRequest({ features }: any) {
        let geometries: Geometry[] = [];

        features = features.filter(this.shouldRenderFeature);

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
        if (response.gc !== null && response.offset !== null) {
            if (response.offset === '0') {
                this.buildingOverlays.geometries = [];
            }
            this.buildingOverlays.geometries.push(...response.gc.geometries);
        }
        PubSub.publish('filter.bounds_update', this.calculateMinMaxBuildingSizes());
        this.renderBuildings();
    }

    calculateMinMaxBuildingSizes() {
        const areas = this.buildingOverlays.geometries.map((g) => {
            return geojsonArea.geometry(g);
        });
        return [SQM_2_SQFT * Math.min(...areas), SQM_2_SQFT * Math.max(...areas)];
    }

    private viewshedLoadedCallback(event: string) {
        let { newFeatures } = this.addSectorsToSelection(this.draw.getSelected().features);
        this.sendCoverageRequest({ features: newFeatures });
        this.renderBuildings();
    }

    private addSectorsToSelection(features: Array<any>) {
        let feats = features.filter(this.shouldRenderFeature);
        let newIds = new Set(feats.map((f) => f.id));
        let sectorsAdded: boolean = true;
        feats.forEach((f: GeoJSON.Feature) => {
            if (
                f.properties &&
                f.properties.feature_type === WorkspaceFeatureTypes.AP &&
                this.shouldRenderFeature(f)
            ) {
                let ap = BaseWorkspaceManager.getFeatureByUuid(f.properties.uuid) as AccessPoint;
                ap.sectors.forEach((sector: AccessPointSector) => {
                    if (!newIds.has(sector.mapboxId)) {
                        sectorsAdded = false;
                        newIds.add(sector.mapboxId);
                    }
                });
            }
        });

        return {
            sectorsAdded: sectorsAdded,
            newIds: Array.from(newIds),
            newFeatures: Array.from(newIds).map((id) => this.draw.get(id))
        };
    }

    private processSectorFeature(f: GeoJSON.Feature) {
        if (this.cloudRFExists(f)) {
            return JSON.parse(f.properties?.cloudrf_coverage_geojson_json);
        } else {
            return JSON.parse(f.properties?.geojson_json);
        }
    }
}
