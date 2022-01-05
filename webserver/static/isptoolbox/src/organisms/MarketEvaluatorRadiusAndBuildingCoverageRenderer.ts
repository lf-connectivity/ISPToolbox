import mapboxgl from 'mapbox-gl';
import * as _ from 'lodash';
import { createGeoJSONCircle } from '../isptoolbox-mapbox-draw/DrawModeUtils';
import { Geometry} from 'geojson';
import {
    SQM_2_SQFT,
    WorkspaceEvents,
    WorkspaceFeatureTypes
} from '../workspace/WorkspaceConstants';
import {
    MarketEvaluatorTowerPopup
} from '../isptoolbox-mapbox-draw/popups/TowerPopups';
import { MarketEvaluatorWorkspaceManager } from '../workspace/MarketEvaluatorWorkspaceManager';
import MarketEvaluatorWS, {
    BuildingOverlaysResponse,
    MarketEvalWSEvents,
    MarketEvalWSRequestType
} from '../MarketEvaluatorWS';
import { GeometryCollection } from '@turf/helpers';
//@ts-ignore
import geojsonArea from '@mapbox/geojson-area';
import {
    MarketEvaluatorSectorPopup
} from '../isptoolbox-mapbox-draw/popups/AjaxSectorPopups';
import { BUILDING_DATA_SOURCE, BUILDING_LAYER, RadiusAndBuildingCoverageRenderer } from './APCoverageRenderer';


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

    sendCoverageRequest({ features }: any) {
        let geometries: Geometry[] = [];

        features = this.draw.getSelected().features.filter(this.shouldRenderFeature);

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
                    case WorkspaceFeatureTypes.AP:
                        if (this.cloudRFExists(f)) {
                            const geometryCollection = JSON.parse(
                                f.properties?.cloudrf_coverage_geojson_json
                            );
                            geometries.push(...geometryCollection.geometries);
                        } else {
                            const new_feat = createGeoJSONCircle(
                                f.geometry,
                                f.properties.radius ?? 0.1,
                                f.id
                            );
                            geometries.push(new_feat.geometry);
                        }
                    case WorkspaceFeatureTypes.COVERAGE_AREA:
                        geometries.push(f.geometry);
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
}