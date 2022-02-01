import mapboxgl from 'mapbox-gl';
import * as _ from 'lodash';
import { createGeoJSONCircle } from '../isptoolbox-mapbox-draw/DrawModeUtils';
import { Geometry, GeoJsonProperties, FeatureCollection, Feature } from 'geojson';
import { BuildingCoverage, EMPTY_BUILDING_COVERAGE } from '../workspace/BuildingCoverage';
import { WorkspaceEvents, WorkspaceFeatureTypes } from '../workspace/WorkspaceConstants';
import { AccessPoint } from '../workspace/WorkspaceFeatures';

import { GeometryCollection } from '@turf/helpers';

import { MapLayerSidebarManager } from '../workspace/MapLayerSidebarManager';
import { BaseWorkspaceManager } from '../workspace/BaseWorkspaceManager';
import { miles2km } from '../LinkCalcUtils';
import { isBeta } from '../LinkCheckUtils';
import { AjaxTowerPopup } from '../isptoolbox-mapbox-draw/popups/AjaxTowerPopup';
import { AccessPointSector } from '../workspace/WorkspaceSectorFeature';
import { IMapboxDrawPlugin, initializeMapboxDrawInterface } from '../utils/IMapboxDrawPlugin';
import { BaseTowerPopup } from '../isptoolbox-mapbox-draw/popups/TowerPopups';
import { clickedOnMapCanvas } from '../utils/MapboxEvents';

const ACCESS_POINT_RADIUS_VIS_DATA = 'ap_vis_data_source';
const ACCESS_POINT_RADIUS_VIS_LAYER_LINE = 'ap_vis_data_layer-line';
export const ACCESS_POINT_RADIUS_VIS_LAYER_FILL = 'ap_vis_data_layer-fill';

export const BUILDING_DATA_SOURCE = 'building_data_source';
export const BUILDING_LAYER = 'building_layer';
export const BUILDING_OUTLINE_LAYER = 'building_outline_layer';

const EMPTY_SOURCE_AFTER_BUILDING = 'empty_building_source';
export const EMPTY_LAYER_AFTER_BUILDING = 'empty_building_layer';

const IS_ACTIVE_AP = 'active_ap';
const ACTIVE_AP = 'true';
const INACTIVE_AP = 'false';

// TODO: Remove RenderCloudRF option from here, it will go into WorkspaceManager
export abstract class RadiusAndBuildingCoverageRenderer implements IMapboxDrawPlugin {
    map: mapboxgl.Map;
    draw: MapboxDraw;
    workspaceManager: any;
    apPopup: BaseTowerPopup;
    sectorPopup: any;
    renderCloudRF: boolean;
    last_selection: string = '';

    constructor(
        map: mapboxgl.Map,
        draw: MapboxDraw,
        workspaceManagerClass: any,
        apPopupClass: any,
        sectorPopupClass: any,
        options?: {
            // TODO: remove renderCloudRF from renderer
            renderCloudRF?: boolean;
        }
    ) {
        initializeMapboxDrawInterface(this, map);
        this.map = map;
        this.draw = draw;
        this.apPopup = isBeta() ? AjaxTowerPopup.getInstance() : apPopupClass.getInstance();
        this.sectorPopup = sectorPopupClass.getInstance();
        this.workspaceManager = BaseWorkspaceManager.getInstance();

        this.renderCloudRF = options?.renderCloudRF || false;

        this.map.addSource(BUILDING_DATA_SOURCE, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });
        this.addBuildingLayer();

        this.map.addSource(ACCESS_POINT_RADIUS_VIS_DATA, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });
        this.map.addLayer(
            {
                id: ACCESS_POINT_RADIUS_VIS_LAYER_FILL,
                type: 'fill',
                source: ACCESS_POINT_RADIUS_VIS_DATA,
                layout: {},
                paint: {
                    'fill-color': [
                        'match',
                        ['get', IS_ACTIVE_AP],
                        ACTIVE_AP,
                        '#5692d1',
                        INACTIVE_AP,
                        '#1172a9',
                        '#1172a9'
                    ],
                    'fill-opacity': 0.4
                }
            },
            BUILDING_LAYER
        );
        this.map.addLayer(
            {
                id: ACCESS_POINT_RADIUS_VIS_LAYER_LINE,
                type: 'line',
                source: ACCESS_POINT_RADIUS_VIS_DATA,
                layout: {},
                paint: {
                    'line-color': [
                        'match',
                        ['get', IS_ACTIVE_AP],
                        ACTIVE_AP,
                        '#5692d1',
                        INACTIVE_AP,
                        '#1172a9',
                        '#1172a9'
                    ],
                    'line-dasharray': [0.2, 2],
                    'line-width': 0.4
                }
            },
            BUILDING_LAYER
        );

        this.map.addSource(EMPTY_SOURCE_AFTER_BUILDING, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });
        this.map.addLayer(
            {
                id: EMPTY_LAYER_AFTER_BUILDING,
                type: 'fill',
                source: EMPTY_SOURCE_AFTER_BUILDING,
                layout: {},
                paint: {}
            },
            BUILDING_LAYER
        );

        PubSub.subscribe(WorkspaceEvents.AP_UPDATE, this.AP_updateCallback.bind(this));

        const onClickAP = (e: any) => {
            // Show tooltip if only one AP is selected.
            const selectedAPs = this.workspaceManager.filterByType(
                this.draw.getSelected().features,
                WorkspaceFeatureTypes.AP
            );
            if (selectedAPs.length === 1) {
                let ap = BaseWorkspaceManager.getFeatureByUuid(
                    selectedAPs[0].properties.uuid
                ) as AccessPoint;
                // Setting this timeout so the natural mouseclick close popup trigger resolves
                // before this one
                setTimeout(() => {
                    this.apPopup.hide();
                    this.apPopup.setAccessPoint(ap);
                    this.apPopup.show();
                }, 1);
            } else if (selectedAPs.length > 1) {
                this.apPopup.hide();
            }
        };

        const onClickPolygon = (e: mapboxgl.MapLayerMouseEvent) => {
            if (this.map.queryRenderedFeatures(e.point, { layers: [BUILDING_LAYER] }).length > 0) {
                return;
            }
            // Show tooltip if only one AP is selected.
            const selectedSectors = this.workspaceManager.filterByType(
                this.draw.getSelected().features,
                WorkspaceFeatureTypes.SECTOR
            );
            if (selectedSectors.length === 1) {
                let sector = BaseWorkspaceManager.getFeatureByUuid(
                    selectedSectors[0].properties.uuid
                ) as AccessPointSector;
                // Setting this timeout so the natural mouseclick close popup trigger resolves
                // before this one

                // Only clicking on the mapboxgl canvas triggers the event. (no marker trigger)
                if (clickedOnMapCanvas(e)) {
                    setTimeout(() => {
                        this.sectorPopup.hide();
                        this.sectorPopup.setSector(sector);
                        this.sectorPopup.show();
                    }, 1);
                }
            } else if (selectedSectors.length > 1) {
                this.apPopup.hide();
            }
        };

        // Keep trying to load the AP onClick event handler until we can find layers
        // to do this, then stop.
        const loadAPOnClick = () => {
            this.map.getStyle().layers?.forEach((layer: any) => {
                if (layer.id.includes('gl-draw-point-ap')) {
                    this.map.on('click', layer.id, onClickAP);
                    this.renderBuildings();
                    this.renderAPRadius();
                    this.map.off('idle', loadAPOnClick);
                }
            });
        };

        const loadSectorOnClick = (e: any) => {
            this.map.getStyle().layers?.forEach((layer: any) => {
                if (layer.id.includes('gl-draw-polygon-fill')) {
                    this.map.on('click', layer.id, onClickPolygon);
                    this.map.off('idle', loadSectorOnClick);
                }
            });
        };

        this.map.on('idle', loadAPOnClick);
        this.map.on('idle', loadSectorOnClick);
    }

    /**
     * Make sure to add a layer with `BUILDING_LAYER` as the `id`
     * and `BUILDING_DATA_SOURCE` as the `source`.
     */
    abstract addBuildingLayer(): void;

    abstract sendCoverageRequest({ features }: any): void;

    drawDeleteCallback({ features }: { features: Array<any> }) {
        this.renderAPRadius();
        this.renderBuildings();
    }

    drawSelectionChangeCallback({ features }: { features: Array<any> }) {
        // Mapbox will count dragging a point features as a selection change event
        // Use this to determine if we are dragging or just selected a new feature
        let ids = features.map((feat) => feat.id);
        ids.sort();
        let selection = ids.join(',');
        let dragging = false;

        if (selection === this.last_selection) {
            dragging = true;
        } else {
            this.last_selection = selection;
        }

        // Hide AP tooltip if user is dragging AP.
        if (dragging) {
            this.apPopup.hide();
        } else {
            this.sendCoverageRequest({ features });

            // TODO: Unbeta this!!!
            this.renderAPRadius();
            this.renderBuildings();
        }
    }

    AP_updateCallback(msg: string, { features }: { features: Array<any> }) {
        this.sendCoverageRequest({ features });
        this.renderAPRadius();
        this.renderBuildings();
        if (
            features.length === 1 &&
            features[0].properties?.feature_type === WorkspaceFeatureTypes.AP
        ) {
            let ap = BaseWorkspaceManager.getFeatureByUuid(
                features[0].properties.uuid
            ) as AccessPoint;
            if (this.apPopup.getAccessPoint() !== ap) {
                this.apPopup.hide();
                this.apPopup.setAccessPoint(ap);
                this.apPopup.show();
            }
        }
    }

    updateBuildingCoverage(msg: string, data: { features: Array<GeoJSON.Feature> }) {
        data.features.forEach((f: GeoJSON.Feature) => {
            if (f.properties) {
                this.sendCoverageRequest(f);
            }
        });
    }

    /**
     * Renders access point circles
     */
    renderAPRadius() {
        // TODO: DELETE THIS WE DON'T NEED IT AFTER AP SECTOR LAUNCH
        if (!isBeta()) {
            const circle_feats: { [id: string]: Feature<Geometry, GeoJsonProperties> } = {};
            let fc = this.draw.getSelected();
            let selectedAPs = new Set(
                fc.features
                    .filter((f) => f.properties?.feature_type === WorkspaceFeatureTypes.AP)
                    .map((f) => f.id)
            );
            let aps = this.draw
                .getAll()
                .features.filter((f) => f.properties?.feature_type === WorkspaceFeatureTypes.AP);

            // Render all APs.
            aps.forEach((feat: any) => {
                if (feat && (feat.properties.radius || feat.properties.radius_miles)) {
                    if (feat.geometry.type === 'Point') {
                        let new_feat;
                        if (this.renderCloudRF && this.cloudRFExists(feat)) {
                            // CloudRF coverage is a geometrycollection; turn this into a feature.
                            let geometryCollection = JSON.parse(
                                feat.properties?.cloudrf_coverage_geojson_json
                            );
                            new_feat = {
                                type: 'Feature',
                                geometry: geometryCollection,
                                properties: {}
                            } as Feature<GeometryCollection, GeoJsonProperties>;
                        } else {
                            let radius =
                                feat.properties.radius || miles2km(feat.properties.radius_miles);
                            new_feat = createGeoJSONCircle(feat.geometry, radius, feat.id);
                        }

                        // @ts-ignore
                        new_feat.properties[IS_ACTIVE_AP] = selectedAPs.has(feat.id)
                            ? ACTIVE_AP
                            : INACTIVE_AP;
                    }
                }
            });

            // Replace radius features with selected
            const radiusSource = this.map.getSource(ACCESS_POINT_RADIUS_VIS_DATA);
            if (radiusSource.type === 'geojson') {
                radiusSource.setData({
                    type: 'FeatureCollection',
                    features: Object.values(circle_feats)
                });
            }
        }
    }

    /**
     * Renders building layer
     */
    renderBuildings() {
        let fc = this.draw.getSelected();
        let aps = fc.features.filter(this.shouldRenderFeature);
        if (aps.length === 0) {
            fc = this.draw.getAll();
        }
        const renderFeatures = fc.features.filter(this.shouldRenderFeature);
        // Replace building features with selected

        const buildingSource = this.map.getSource(BUILDING_DATA_SOURCE);
        if (buildingSource.type === 'geojson') {
            const coverage = BuildingCoverage.union(
                renderFeatures.map((feat) => {
                    let coverage_object = BaseWorkspaceManager.getFeatureByUuid(
                        feat.properties?.uuid
                    ) as AccessPoint | AccessPointSector;
                    return coverage_object?.coverage || EMPTY_BUILDING_COVERAGE;
                })
            );
            buildingSource.setData({
                type: 'FeatureCollection',
                features: coverage.toFeatureArray()
            });
        }
    }

    protected cloudRFExists(feat: Feature) {
        return (
            feat.properties?.cloudrf_coverage_geojson_json &&
            feat.properties?.cloudrf_coverage_geojson_json !== null
        );
    }

    protected shouldRenderFeature(f: GeoJSON.Feature): boolean {
        return f.properties?.hidden === undefined;
    }
}
