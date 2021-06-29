import mapboxgl from "mapbox-gl";
import * as _ from "lodash";
import { createGeoJSONCircle } from "../isptoolbox-mapbox-draw/DrawModeUtils";
import { Geometry, GeoJsonProperties, FeatureCollection, Feature }  from 'geojson';
import * as StyleConstants from '../isptoolbox-mapbox-draw/styles/StyleConstants';
import { BuildingCoverage, EMPTY_BUILDING_COVERAGE } from "../workspace/BuildingCoverage";
import { WorkspaceEvents, WorkspaceFeatureTypes } from "../workspace/WorkspaceConstants";
import { AccessPoint, CoverageArea, CPE } from "../workspace/WorkspaceFeatures";
import LOSCheckWS, { AccessPointCoverageResponse } from "../LOSCheckWS";
import { WorkspaceManager } from "../workspace/WorkspaceManager";
import { LinkCheckTowerPopup, MarketEvaluatorTowerPopup } from "../isptoolbox-mapbox-draw/popups/TowerPopups";
import { MarketEvaluatorWorkspaceManager } from "../workspace/MarketEvaluatorWorkspaceManager";
import { MapboxSDKClient } from "../MapboxSDKClient";
import { LinkCheckBasePopup } from "../isptoolbox-mapbox-draw/popups/LinkCheckBasePopup";
import { LinkCheckCPEClickCustomerConnectPopup, LinkCheckCustomerConnectPopup } from "../isptoolbox-mapbox-draw/popups/LinkCheckCustomerConnectPopup";
import { BaseWorkspaceFeature } from "../workspace/BaseWorkspaceFeature";
import { getCookie } from "../utils/Cookie";

const ACCESS_POINT_RADIUS_VIS_DATA = 'ap_vis_data_source';
const ACCESS_POINT_RADIUS_VIS_LAYER_LINE = 'ap_vis_data_layer-line';
export const ACCESS_POINT_RADIUS_VIS_LAYER_FILL = 'ap_vis_data_layer-fill';

const BUILDING_DATA_SOURCE = 'building_data_source';
export const BUILDING_LAYER = 'building_layer';

const BUILDING_OUTLINE_LAYER = 'building_outline_layer';

const EMPTY_SOURCE_AFTER_BUILDING = 'empty_building_source';
export const EMPTY_LAYER_AFTER_BUILDING = "empty_building_layer";

const IS_ACTIVE_AP = 'active_ap';
const ACTIVE_AP = 'true';
const INACTIVE_AP = 'false';

abstract class RadiusAndBuildingCoverageRenderer {
    map: mapboxgl.Map;
    draw: MapboxDraw;
    workspaceManager: any;
    apPopup: any;

    constructor(map: mapboxgl.Map, draw: MapboxDraw, workspaceManagerClass: any, apPopupClass: any) {
        this.map = map;
        this.draw = draw;
        this.apPopup = apPopupClass.getInstance();
        this.workspaceManager = workspaceManagerClass.getInstance();

        this.map.addSource(BUILDING_DATA_SOURCE, {type: 'geojson', data: {type: 'FeatureCollection', features : []}});
        this.addBuildingLayer();

        this.map.addSource(ACCESS_POINT_RADIUS_VIS_DATA, {type: 'geojson', data: {type: 'FeatureCollection', features : []}});
        this.map.addLayer({
            'id': ACCESS_POINT_RADIUS_VIS_LAYER_FILL,
            'type': 'fill',
            'source': ACCESS_POINT_RADIUS_VIS_DATA,
            'layout': {},
            'paint': {
                'fill-color': [
                    'match',
                    ['get', IS_ACTIVE_AP],
                    ACTIVE_AP,
                    '#5692d1',
                    INACTIVE_AP,
                    '#1172a9',
                    '#1172a9'
                ],
                'fill-opacity': 0.4,
            }
        }, BUILDING_LAYER);
        this.map.addLayer({
            'id': ACCESS_POINT_RADIUS_VIS_LAYER_LINE,
            'type': 'line',
            'source': ACCESS_POINT_RADIUS_VIS_DATA,
            'layout': {},
            'paint': {
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
                'line-width': 2
            }
        }, BUILDING_LAYER);

        this.map.addSource(EMPTY_SOURCE_AFTER_BUILDING, {type: 'geojson', data: {type: 'FeatureCollection', features : []}});
        this.map.addLayer({
            'id': EMPTY_LAYER_AFTER_BUILDING,
            'type': 'fill',
            'source': EMPTY_SOURCE_AFTER_BUILDING,
            'layout': {},
            'paint': {}
        }, BUILDING_LAYER);

        this.map.on('draw.selectionchange', this.drawSelectionChangeCallback.bind(this));
        this.map.on('draw.delete', this.deleteAPRender.bind(this));

        PubSub.subscribe(WorkspaceEvents.AP_UPDATE, this.updateBuildingCoverage.bind(this));
        PubSub.subscribe(WorkspaceEvents.AP_RENDER_SELECTED, this.renderSelectedAccessPoints.bind(this));
        PubSub.subscribe(WorkspaceEvents.AP_RENDER_GIVEN, this.renderGivenApFeatures.bind(this));

        // Add building layer callbacks
        const hideLinkCheckProfile = () => {
            //@ts-ignore
            $('#data-container').collapse('hide');
        }

        const onClickAP = (e: any) => {
            // Show tooltip if only one AP is selected.
            const selectedAPs = this.workspaceManager.filterByType(this.draw.getSelected().features, WorkspaceFeatureTypes.AP);
            if (selectedAPs.length === 1) {
                hideLinkCheckProfile();
                let ap = this.workspaceManager.features[selectedAPs[0].properties.uuid] as AccessPoint;
                // Setting this timeout so the natural mouseclick close popup trigger resolves
                // before this one
                setTimeout(() => {
                    this.apPopup.hide();
                    this.apPopup.setAccessPoint(ap);
                    this.apPopup.show();
                }, 1);
            }
            else if (selectedAPs.length > 1) {
                this.apPopup.hide();
            }
        }

        // Keep trying to load the AP onClick event handler until we can find layers
        // to do this, then stop.
        const loadOnClick = () => {
            this.map.getStyle().layers?.forEach((layer: any) => {
                if (layer.id.includes('gl-draw-point-ap')) {
                    this.map.on('click', layer.id, onClickAP);
                    this.renderAPRadiusAndBuildings(this.draw.getSelected());
                    this.map.off('idle', loadOnClick);
                }
            });
        }
        this.map.on('idle', loadOnClick);
    }

    /**
     * Make sure to add a layer with `BUILDING_LAYER` as the `id`
     * and `BUILDING_DATA_SOURCE` as the `source`.
     */
    abstract addBuildingLayer(): void;

    abstract sendCoverageRequest(f: any): void; 

    drawSelectionChangeCallback({features}: {features: Array<any>}){
        PubSub.publish(WorkspaceEvents.AP_RENDER_SELECTED, {});
        const aps = this.workspaceManager.filterByType(features, WorkspaceFeatureTypes.AP);
        const currentPopupAp = this.apPopup.getAccessPoint();

        aps.forEach((apFeature: any) => {
            // Hide AP tooltip if user is dragging AP.
            if (currentPopupAp &&
                apFeature.properties.uuid == currentPopupAp.workspaceId &&
                this.apPopup.isAPMoving()) {
                this.apPopup.hide();
            }
        });
    }

    updateBuildingCoverage(msg: string, data: {features: Array<GeoJSON.Feature>}){
        data.features.forEach((f: GeoJSON.Feature) => {
            if(f.properties){
                this.sendCoverageRequest(f);
                PubSub.publish(WorkspaceEvents.AP_RENDER_SELECTED, {});
            }
        });
    }

    renderSelectedAccessPoints(msg: string, data: any){
        // If there are selected APs or coverage areas, only render circles/buildings for those, otherwise render all.
        let fc = this.draw.getSelected();
        this.debouncedRenderAPRadius(fc);
    }

    renderGivenApFeatures(msg: string, data: any){
        this.debouncedRenderAPRadius(data);
    }
    
    /**
     * Renders access point circles and buildings from the given features.
     * @param fc - FeatureCollection of features to select and render APs from.
     */
    renderAPRadiusAndBuildings(fc: FeatureCollection<Geometry, GeoJsonProperties>){
        const circle_feats: {[id: string]: Feature<Geometry, GeoJsonProperties>} = {};
        const coverageToRender : Array<AccessPoint | CoverageArea> = [];
        const allFeats = this.draw.getAll();


        // Render all APs.
        allFeats.features.forEach((feat: any) => {
            if (feat && feat.properties.radius) {
                if(feat.geometry.type === 'Point'){
                    const new_feat = createGeoJSONCircle(
                            feat.geometry,
                            feat.properties.radius,
                            feat.id);
                    
                    // @ts-ignore
                    new_feat.properties[IS_ACTIVE_AP] = INACTIVE_AP; 
                    circle_feats[feat.id] = new_feat;
                }
            }
        });

        fc.features.forEach((feat: any) => {
            if(feat.properties.radius){
                if(feat.geometry.type === 'Point'){
                    // @ts-ignore
                    circle_feats[feat.id].properties[IS_ACTIVE_AP] = ACTIVE_AP; 

                    // render coverage
                    if (feat.properties.uuid) {
                        let ap = this.workspaceManager.features[feat.properties.uuid] as AccessPoint;
                        if (ap) {
                            if (!ap.awaitingCoverage && ap.coverage === EMPTY_BUILDING_COVERAGE) {
                                this.sendCoverageRequest(feat);
                            }
                            coverageToRender.push(ap);
                        }
                    }
                }
            }
            else if (feat.geometry.type === 'Polygon') {
                if (feat.properties.uuid) {
                    let polygon = this.workspaceManager.features[feat.properties.uuid] as CoverageArea;
                    if (!polygon.awaitingCoverage && polygon.coverage === EMPTY_BUILDING_COVERAGE) {
                        this.sendCoverageRequest(feat);
                    }
                    coverageToRender.push(polygon);
                }
            }
        });
        // Replace radius features with selected
        const radiusSource = this.map.getSource(ACCESS_POINT_RADIUS_VIS_DATA);
        if(radiusSource.type ==='geojson'){
            radiusSource.setData({type: 'FeatureCollection', features: Object.values(circle_feats)});
        }

        // Replace building features with selected
        const buildingSource = this.map.getSource(BUILDING_DATA_SOURCE);
        if(buildingSource.type ==='geojson'){
            const coverage = BuildingCoverage.union(coverageToRender.map(workspaceFeature => {
                return workspaceFeature.coverage;
            }));
            buildingSource.setData({type: 'FeatureCollection', features: coverage.toFeatureArray()});
        }
    }

    debouncedRenderAPRadius = _.debounce(this.renderAPRadiusAndBuildings, 50);

    deleteAPRender({ features }: { features: Array<any> }) {
        features.forEach((feature) => {
            if (feature.properties.uuid) {
                if (this.map.getLayer(feature.properties.uuid)) {
                    this.map.removeLayer(feature.properties.uuid);
                }
                if (this.map.getSource(feature.properties.layer)) {
                    this.map.removeSource(feature.properties.uuid);
                }
            }
        });

        // rerender AP radii.
        PubSub.publish(WorkspaceEvents.AP_RENDER_SELECTED, {});
    }
}


export class LinkCheckRadiusAndBuildingCoverageRenderer extends RadiusAndBuildingCoverageRenderer {
    ws: LOSCheckWS;

    constructor(map: mapboxgl.Map, draw: MapboxDraw, ws: LOSCheckWS) {
        super(map, draw, WorkspaceManager, LinkCheckTowerPopup);
        this.ws = ws;
        this.ws.setAccessPointCallback(this.accessPointStatusCallback.bind(this));

        // Building Layer click callback
        this.map.on('click', BUILDING_LAYER, (e: any) => {
            // Only activate if in simple select mode
            if (this.draw.getMode() == 'simple_select') {
                // Check if we clicked on a CPE
                const features = this.map.queryRenderedFeatures(e.point);
                if (! features.some((feat) => {return feat.source.includes('mapbox-gl-draw')})){
                    let building = this.map.queryRenderedFeatures(e.point, {layers: [BUILDING_LAYER]})[0];
                    let buildingId = building.properties?.msftid;
                    let lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
                    let mapboxClient = MapboxSDKClient.getInstance();
                    mapboxClient.reverseGeocode(lngLat, (response: any) => {
                        let popup = LinkCheckBasePopup.createPopupFromReverseGeocodeResponse(LinkCheckCustomerConnectPopup, lngLat, response);
                        popup.setBuildingId(buildingId);

                        // Render all APs
                        popup.show();
                    });
                }
            }
        });

        // Change the cursor to a pointer when the mouse is over the states layer.
        this.map.on('mouseenter', BUILDING_LAYER, () => {
            this.map.getCanvas().style.cursor = 'pointer';
        });

        // Change it back to a pointer when it leaves.
        this.map.on('mouseleave', BUILDING_LAYER, () => {
            this.map.getCanvas().style.cursor = '';
        });

        const onClickCPE = (e: any) => {
            // Show tooltip if only one CPE is selected.
            const selectedCPEs = this.workspaceManager.filterByType(this.draw.getSelected().features, WorkspaceFeatureTypes.CPE);
            let cpePopup = LinkCheckCPEClickCustomerConnectPopup.getInstance();
            if (selectedCPEs.length === 1) {
                let cpe = this.workspaceManager.features[selectedCPEs[0].properties.uuid] as CPE;
                let mapboxClient = MapboxSDKClient.getInstance();
                let lngLat = cpe.getFeatureGeometry().coordinates as [number, number];
                mapboxClient.reverseGeocode(lngLat, (resp: any) => {
                    cpePopup = LinkCheckBasePopup.createPopupFromReverseGeocodeResponse(LinkCheckCPEClickCustomerConnectPopup, lngLat, resp);
                    cpePopup.hide();
                    cpePopup.setCPE(cpe);
                    cpePopup.show();
                });
            }
            else if (selectedCPEs.length > 1) {
                cpePopup.hide();
            }
        }

        // Keep trying to load the AP onClick event handler until we can find layers
        // to do this, then stop.
        const loadCPEOnClick = () => {
            this.map.getStyle().layers?.forEach((layer: any) => {
                if (layer.id.includes('gl-draw-point-cpe')) {
                    this.map.on('click', layer.id, onClickCPE);
                    this.map.off('idle', loadCPEOnClick);
                }
            });
        }
        this.map.on('idle', loadCPEOnClick);
    }

    addBuildingLayer() {
        this.map.addLayer({
            'id': BUILDING_OUTLINE_LAYER,
            'type': 'line',
            'source': BUILDING_DATA_SOURCE,
            'layout': {},
            'paint': {
                'line-color': [
                    'match',
                    ['get', 'serviceable'],
                    'unserviceable',
                    StyleConstants.UNSERVICEABLE_BUILDINGS_COLOR ,
                    'serviceable',
                    StyleConstants.SERVICEABLE_BUILDINGS_COLOR,
                /* other */ StyleConstants.UNKNOWN_BUILDINGS_COLOR
                ],
                'line-width': 1,
                'line-opacity': 0.9,
            }
        });

        this.map.addLayer({
            'id': BUILDING_LAYER,
            'type': 'fill',
            'source': BUILDING_DATA_SOURCE,
            'layout': {},
            'paint': {
                'fill-opacity': 0,
            }
        },BUILDING_OUTLINE_LAYER);
    }

    sendCoverageRequest(f: any) {
        let ap = this.workspaceManager.features[f.properties.uuid] as AccessPoint;
        ap.awaitNewCoverage();
        this.ws.sendAPRequest(f.properties.uuid, f.properties.height);
    }

    accessPointStatusCallback(message: AccessPointCoverageResponse) {
        $.ajax({
            url: `/pro/workspace/api/ap-los/coverage/${message.uuid}/`,
            success: (resp) => { this.updateCoverageFromAjaxResponse(resp, message.uuid) },
            "method": "GET",
            "headers": {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        $.ajax({
            url: `/pro/workspace/api/ap-los/coverage/stats/${message.uuid}/`,
            success: (resp) => {
                const features =
                    this.draw.getAll().features.filter(
                        (f: GeoJSON.Feature) => {return f.properties?.uuid === message.uuid}
                    );
                
                // Set last updated time
                // TODO: non-US formats when we expand internationally with isUnitsUS false
                const now = Intl.DateTimeFormat('en-US', {
                    year: '2-digit',
                    month: '2-digit',
                    day: '2-digit'
                }).format(Date.now());
                
                // Set serviceable, unserviceable, and unknown
                features.forEach((feat: GeoJSON.Feature) => {
                    for (const [key, value] of Object.entries(resp)) {
                        this.draw.setFeatureProperty(
                            (feat.id as string), key, value
                        );
                    }
                    this.draw.setFeatureProperty((feat.id as string), 'last_updated', now);
                });
                this.apPopup.onAPUpdate(this.workspaceManager.features[message.uuid] as AccessPoint);
            },
            "method": "GET",
            "headers": {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
    }

    updateCoverageFromAjaxResponse(resp: any, uuid: string) {
        const ap = this.workspaceManager.features[uuid] as AccessPoint;
        ap.setCoverage(resp.features);
        PubSub.publish(WorkspaceEvents.AP_RENDER_SELECTED, {});
        PubSub.publish(WorkspaceEvents.AP_COVERAGE_UPDATED, {'uuid': uuid});
    }
}


export class MarketEvaluatorRadiusAndBuildingCoverageRenderer extends RadiusAndBuildingCoverageRenderer {
    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        super(map, draw, MarketEvaluatorWorkspaceManager, MarketEvaluatorTowerPopup);
    }

    addBuildingLayer() {
        this.map.addLayer({
            id: BUILDING_LAYER,
            type: 'fill',
            source: BUILDING_DATA_SOURCE,
            layout: {},
            paint: {
                'fill-color': '#42B72A',
                'fill-opacity': 0.8,
            },
        });
    }

    sendCoverageRequest(f: any) {
        console.log(`Sending coverage for ${f}`);
    }
}

