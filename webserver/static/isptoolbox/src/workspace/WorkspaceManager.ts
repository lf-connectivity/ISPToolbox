import mapboxgl, * as MapboxGL from "mapbox-gl";
import * as _ from "lodash";
import { Geometry, GeoJsonProperties }  from 'geojson';
import { createGeoJSONCircle } from "../isptoolbox-mapbox-draw/RadiusModeUtils.js";
import { getCookie } from '../utils/Cookie';
import LOSCheckWS from '../LOSCheckWS';
import type { AccessPointCoverageResponse } from '../LOSCheckWS';
import PubSub from 'pubsub-js';
import {isUnitsUS} from '../utils/MapPreferences';
import { WorkspaceEvents, WorkspaceFeatureTypes } from './WorkspaceConstants';
import { BaseWorkspaceFeature } from './BaseWorkspaceFeature';
import { AccessPoint, APToCPELink, CPE } from './WorkspaceFeatures';
import { LinkCheckCPEClickCustomerConnectPopup, LinkCheckCustomerConnectPopup } from '../isptoolbox-mapbox-draw/popups/LinkCheckCustomerConnectPopup';
import { MapboxSDKClient } from "../MapboxSDKClient";
import { LinkCheckBasePopup } from "../isptoolbox-mapbox-draw/popups/LinkCheckBasePopup";
import { ViewshedTool } from "../organisms/ViewshedTool";
import { BuildingCoverage, BuildingCoverageStatus, EMPTY_BUILDING_COVERAGE } from "./BuildingCoverage";
import { LinkCheckTowerPopup } from "../isptoolbox-mapbox-draw/popups/LinkCheckTowerPopup";
import * as StyleConstants from '../isptoolbox-mapbox-draw/styles/StyleConstants';
import { FeatureCollection } from "@turf/turf";
import { getStreetAndAddressInfo } from "../LinkCheckUtils";
import { getSessionID } from '../utils/MapPreferences';
import { debounce } from "lodash";

const DEFAULT_AP_HEIGHT = 30.48;
const DEFAULT_CPE_HEIGHT = 1.0;
const DEFAULT_NO_CHECK_RADIUS = 0.01;
const DEFAULT_AP_NAME = 'Unnamed AP';
const DEFAULT_CPE_NAME = 'Unnamed CPE';
const DEFAULT_LINK_FREQUENCY = 5.4925;
const DEBOUNCE_VIEWSHED_S = 2000;

const ACCESS_POINT_RADIUS_VIS_DATA = 'ap_vis_data_source';
const ACCESS_POINT_RADIUS_VIS_LAYER_LINE = 'ap_vis_data_layer-line';
export const ACCESS_POINT_RADIUS_VIS_LAYER_FILL = 'ap_vis_data_layer-fill';

const ACCESS_POINT_BUILDING_DATA = 'ap_building_source';
export const ACCESS_POINT_BUILDING_LAYER = 'ap_building_layer';

const ACCESS_POINT_BUILDING_OUTLINE_LAYER = 'ap_building_outline_layer';

const EMPTY_SOURCE_AFTER_BUILDING = 'empty_building_source';
export const EMPTY_LAYER_AFTER_BUILDING = "empty_building_layer";

export class LOSModal {
    selector: string;
    map: mapboxgl.Map;
    draw: MapboxDraw;
    constructor(selector: string, map: mapboxgl.Map, draw: MapboxDraw) {
        this.selector = selector;
        this.map = map;
        this.draw = draw;

        // Add pubsub modal callbacks
        PubSub.subscribe(WorkspaceEvents.LOS_MODAL_OPENED, this.getAccessPoints.bind(this));
        PubSub.subscribe(WorkspaceEvents.APS_LOADED, this.addModalCallbacks.bind(this));
        PubSub.subscribe(WorkspaceEvents.AP_DELETED, this.deleteAccessPoint.bind(this));

        // Modal Callbacks
        $(this.selector).on(
            'shown.bs.modal',
            () => {
                PubSub.publish(WorkspaceEvents.LOS_MODAL_OPENED);
            }
        );

        // Open Modal

    }

    getAccessPoints(msg: string, data : {session: string | null, ordering: string | null | undefined, page: number | string | null | undefined} | null) {
        if (data != null){
            data['session'] = getSessionID();
        } else {
            data = {session: getSessionID(), ordering: undefined, page : undefined};
        }
        $.get('/pro/workspace/api/ap-los/', data ? data : '', (result) => {
            $('#ap-list-modal-body').html(result);
        }, 'html').done(() => { PubSub.publish(WorkspaceEvents.APS_LOADED) });
    }

    updateAccessPoint(msg: string, feature: any) {
        if(feature.properties.uuid){
            $.ajax({
                url: `/pro/workspace/api/ap-los/${feature.properties.uuid}/`,
                method: "PATCH",
                data: {
                    max_radius: feature.properties.radius,
                    location: JSON.stringify(feature.geometry),
                    height: feature.properties.height,
                    name: feature.properties.name
                },
                headers: {
                    'X-CSRFToken': getCookie('csrftoken'),
                    'Accept': 'application/json'
                }
            }).done(() => {
                PubSub.publish(WorkspaceEvents.LOS_MODAL_OPENED);
            });
        }
    }

    deleteAccessPoint(uuid: string | null) {
        if (typeof uuid === 'string') {
            $.ajax({
                url: `/pro/workspace/api/ap-los/${uuid}/`, method: "DELETE", headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                }
            }).done(() => {
                PubSub.publish(WorkspaceEvents.LOS_MODAL_OPENED);
            });
        }
    }

    addModalCallbacks() {
        $(`.ap-delete-btn`).on('click', (event) => {
            const uuid = event.currentTarget.getAttribute('data-target');
            if (typeof uuid === 'string') {
                const fc = this.draw.getAll();
                const feats = fc.features.filter((feat: any) => feat.properties.uuid === uuid);
                const feat_ids = feats.map((feat: any) => feat.id);
                this.draw.delete(feat_ids);
                this.map.fire('draw.delete', { features: feats });
            }
        });

        $('.ap-edit-btn').on('click', (event) => {
            const uuid = event.currentTarget.getAttribute('data-target');
            event.currentTarget.classList.add('d-none');
            if (typeof uuid === 'string') {
                $(`input[ap-uuid-target='${uuid}']`).removeAttr('disabled');
                // $(`input[ap-uuid-target!='${uuid}']`).prop('disabled', true);
                $(`#ap-save-edit-${uuid}`).removeClass('d-none');
            }
        });

        $('.ap-save-edit-btn').on('click', (event) => {
            const uuid = event.currentTarget.getAttribute('data-target');
            const drawn_features = this.draw.getAll();
            const ap = drawn_features.features.filter((feat: any) => feat.properties.uuid === uuid);
            $(`input[ap-uuid-target=${uuid}]`).each((idx, elem)=>{
                ap.forEach((feat :any) => {
                    let attr_name = elem.getAttribute('name');
                    let val = $(elem).val();
                    if (isUnitsUS()){
                    switch (attr_name){
                        case 'height':
                            //@ts-ignore
                            val = parseFloat(val) * 0.3048;
                            break;
                        case 'max_radius':
                            attr_name = 'radius';
                            //@ts-ignore
                            val = parseFloat(val) * 1.60934;
                            break;
                        default:
                    }
                    }
                    if(attr_name) {
                        this.draw.setFeatureProperty(feat.id, attr_name, val);
                    }
                });
            })
            const feats = ap.map((feat:any) => this.draw.get(feat.id));
            this.map.fire('draw.update', {features: feats, action: 'move'});
            PubSub.publish(WorkspaceEvents.AP_UPDATE, feats[0]);
        });

        $('.sort-ap').on('click', (event) => {
            const ordering = event.currentTarget.getAttribute('ordering-target');
            const page = $('#ap-modal-page-num').val();
            PubSub.publish(WorkspaceEvents.LOS_MODAL_OPENED, {ordering, page});
        })

        $('.ap-modal-page-change').on('click', (event) => {
            const ordering = $('#ap-modal-ordering').val();
            const page = event.currentTarget.getAttribute('page-target');
            PubSub.publish(WorkspaceEvents.LOS_MODAL_OPENED, {ordering, page});
        })
    }
}


export class WorkspaceManager {
    map: MapboxGL.Map;
    draw: MapboxDraw;
    ws: LOSCheckWS;
    readonly features: { [workspaceId: string] : BaseWorkspaceFeature }; // Map from workspace UUID to feature
    view: LOSModal;
    viewshed: ViewshedTool;
    private static _instance: WorkspaceManager;

    constructor(selector: string, map: MapboxGL.Map, draw: MapboxDraw, ws: LOSCheckWS, initialFeatures: any) {
        if (WorkspaceManager._instance) {
            return WorkspaceManager._instance;
        }
        this.map = map;
        this.draw = draw;
        this.ws = ws;
        this.view = new LOSModal(selector, this.map, this.draw);
        this.viewshed = new ViewshedTool(this.map, this.draw);

        // Initialize features
        this.features = {};

        // Add Workspace features from user, if they exist.
        if (initialFeatures) {
            const nonLinks = initialFeatures?.features.filter((feature: any) => {
                return feature.properties.feature_type !== undefined &&
                       (feature.properties.feature_type === WorkspaceFeatureTypes.AP ||
                        feature.properties.feature_type === WorkspaceFeatureTypes.CPE);
            });

            nonLinks.forEach((feature: any) => {
                let feature_type = feature.properties.feature_type;
                let workspaceFeature = undefined;

                // Add all the APs and CPEs
                if (feature_type === WorkspaceFeatureTypes.AP) {
                    feature.properties.radius = feature.properties.max_radius;
                    feature.properties.center = feature.geometry.coordinates;
                    workspaceFeature = new AccessPoint(this.map, this.draw, feature);
                }
                else {
                    workspaceFeature = new CPE(this.map, this.draw, feature);
                }
                this.features[workspaceFeature.workspaceId] = workspaceFeature;
            });

            // Add links
            const links = initialFeatures?.features.filter((feature: any) => {
                return feature.properties.feature_type !== undefined &&
                       feature.properties.feature_type === WorkspaceFeatureTypes.AP_CPE_LINK;
            });

            links.forEach((feature: any) => {
                let apWorkspaceId = feature.properties.ap;
                let cpeWorkspaceId = feature.properties.cpe;
                let ap = this.features[apWorkspaceId] as AccessPoint;
                let cpe = this.features[cpeWorkspaceId] as CPE;
                let workspaceFeature = new APToCPELink(this.map, this.draw, feature, ap, cpe);
                ap.links.set(cpe, workspaceFeature);
                cpe.ap = ap;
                this.features[workspaceFeature.workspaceId] = workspaceFeature;
            });
        }

        // Initialize Constructors
        this.map.on('draw.create', this.saveFeatures.bind(this));
        this.map.on('draw.delete', this.deleteFeatures.bind(this));
        this.map.on('draw.update', this.updateFeatures.bind(this));
        this.map.on('draw.selectionchange', this.drawSelectionChangeCallback.bind(this));
        this.map.on('draw.modechange', this.drawModeChangeCallback.bind(this));

        // Add Visualization Layers
        this.map.addSource(ACCESS_POINT_BUILDING_DATA, {type: 'geojson', data: {type: 'FeatureCollection', features : []}});
        this.map.addLayer({
            'id': ACCESS_POINT_BUILDING_OUTLINE_LAYER,
            'type': 'line',
            'source': ACCESS_POINT_BUILDING_DATA,
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
            'id': ACCESS_POINT_BUILDING_LAYER,
            'type': 'fill',
            'source': ACCESS_POINT_BUILDING_DATA,
            'layout': {},
            'paint': {
                'fill-opacity': 0,
            }
        },ACCESS_POINT_BUILDING_OUTLINE_LAYER);

        this.map.addSource(ACCESS_POINT_RADIUS_VIS_DATA, {type: 'geojson', data: {type: 'FeatureCollection', features : []}});
        this.map.addLayer({
            'id': ACCESS_POINT_RADIUS_VIS_LAYER_FILL,
            'type': 'fill',
            'source': ACCESS_POINT_RADIUS_VIS_DATA,
            'layout': {},
            'paint': {
            'fill-color': '#1172a9',
            'fill-opacity': 0.4,
        }}, ACCESS_POINT_BUILDING_LAYER);
        this.map.addLayer({
            'id': ACCESS_POINT_RADIUS_VIS_LAYER_LINE,
            'type': 'line',
            'source': ACCESS_POINT_RADIUS_VIS_DATA,
            'layout': {},
            'paint': {
            'line-color': '#1172a9',
            'line-dasharray': [0.2, 2],
            'line-width': 2
        }}, ACCESS_POINT_BUILDING_LAYER);

        this.map.addSource(EMPTY_SOURCE_AFTER_BUILDING, {type: 'geojson', data: {type: 'FeatureCollection', features : []}});
        this.map.addLayer({
            'id': EMPTY_LAYER_AFTER_BUILDING,
            'type': 'fill',
            'source': EMPTY_SOURCE_AFTER_BUILDING,
            'layout': {},
            'paint': {}
        }, ACCESS_POINT_BUILDING_LAYER);

        // Add Pubsub Callbacks
        this.ws.setAccessPointCallback(this.accessPointStatusCallback.bind(this));
        PubSub.subscribe(WorkspaceEvents.AP_UPDATE, this.sendCoverageRequest.bind(this));
        PubSub.subscribe(WorkspaceEvents.AP_RENDER_SELECTED, this.renderSelectedAccessPoints.bind(this));
        PubSub.subscribe(WorkspaceEvents.AP_RENDER_GIVEN, this.renderGivenApFeatures.bind(this));
        // @ts-ignore
        // $('#bulkUploadAccessPoint').modal('show');

        // Add building layer callbacks
        this.map.on('click', ACCESS_POINT_BUILDING_LAYER, (e: any) => {
            // Only activate if in simple select mode
            if (this.draw.getMode() == 'simple_select') {
                // Check if we clicked on a CPE
                const features = this.map.queryRenderedFeatures(e.point);
                if (! features.some((feat) => {return feat.source.includes('mapbox-gl-draw')})){
                    let building = this.map.queryRenderedFeatures(e.point, {layers: [ACCESS_POINT_BUILDING_LAYER]})[0];
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

        const hideLinkCheckProfile = () => {
            //@ts-ignore
            $('#data-container').collapse('hide');
        }

        const onClickAP = (e: any) => {
            // Show tooltip if only one AP is selected.
            const selectedAPs = this.filterByType(this.draw.getSelected().features, WorkspaceFeatureTypes.AP);
            const apPopup = LinkCheckTowerPopup.getInstance();
            if (selectedAPs.length === 1) {
                hideLinkCheckProfile();
                let ap = this.features[selectedAPs[0].properties.uuid] as AccessPoint;
                // Setting this timeout so the natural mouseclick close popup trigger resolves
                // before this one
                setTimeout(() => {
                    apPopup.hide();
                    apPopup.setAccessPoint(ap);
                    apPopup.show();
                }, 1);
            }
            else if (selectedAPs.length > 1) {
                apPopup.hide();
            }
        }

        const onClickCPE = (e: any) => {
            // Show tooltip if only one CPE is selected.
            const selectedCPEs = this.filterByType(this.draw.getSelected().features, WorkspaceFeatureTypes.CPE);
            let cpePopup = LinkCheckCPEClickCustomerConnectPopup.getInstance();
            if (selectedCPEs.length === 1) {
                let cpe = this.features[selectedCPEs[0].properties.uuid] as CPE;
                let mapboxClient = MapboxSDKClient.getInstance();
                let lngLat = cpe.featureData.geometry.coordinates as [number, number];
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
        const loadOnClick = () => {
            this.map.getStyle().layers?.forEach((layer: any) => {
                if (layer.id.includes('gl-draw-point-ap')) {
                    this.map.on('click', layer.id, onClickAP);
                    this.map.off('idle', loadOnClick);
                }
                else if (layer.id.includes('gl-draw-point-cpe')) {
                    this.map.on('click', layer.id, onClickCPE);
                    this.map.off('idle', loadOnClick);
                }
            });
        }
        this.map.on('idle', loadOnClick)

        // Change the cursor to a pointer when the mouse is over the states layer.
        this.map.on('mouseenter', ACCESS_POINT_BUILDING_LAYER, () => {
            this.map.getCanvas().style.cursor = 'pointer';
        });

        // Change it back to a pointer when it leaves.
        this.map.on('mouseleave', ACCESS_POINT_BUILDING_LAYER, () => {
            this.map.getCanvas().style.cursor = '';
        });

        WorkspaceManager._instance = this;
    }
    saveFeatures({ features }: any) {
        const mode = String(this.draw.getMode());

        // Ignore features already saved in this.features
        const unsavedFeatures = features.filter((feature: any) => {
            return (!feature.properties.uuid || !(feature.properties.uuid in this.features));
        });

        const mapboxClient = MapboxSDKClient.getInstance();

        // Determine whether or not we're drawing an AP, CPE, or link
        // based on the mode.
        // Mode draw_radius: Points are APs.
        // Mode draw_cpe: Points are CPEs.
        // Mode simple_select: Points are CPEs, LineStrings are links.
        unsavedFeatures.forEach((feature: any) => {
            let workspaceFeature: BaseWorkspaceFeature | undefined = undefined;
            switch(mode) {
                case 'draw_radius':
                    if (feature.geometry.type == 'Point') {
                        const newCircle = {
                            ...feature,
                            properties: {
                                radius: feature.properties.radius / 1000,
                                max_radius: feature.properties.radius / 1000,
                                center: feature.geometry.coordinates,
                                height: DEFAULT_AP_HEIGHT,
                                default_cpe_height: DEFAULT_CPE_HEIGHT,
                                no_check_radius: DEFAULT_NO_CHECK_RADIUS,
                                name: DEFAULT_AP_NAME
                            },
                            id: feature.id,
                        }
                        workspaceFeature = new AccessPoint(this.map, this.draw, newCircle);
                        workspaceFeature.create((resp) => {
                            if (feature.properties.ptpLinksToRemove) {
                                feature.properties.ptpLinksToRemove.forEach((id: string) => {
                                    let featToDelete = this.draw.get(id);
                                    this.draw.delete(id);
                                    this.map.fire('draw.delete', {features: [featToDelete]});
                                });
                            }

                            if (feature.properties.cpeLngLats) {
                                feature.properties.cpeLngLats.forEach((lngLat: [number, number]) => {
                                    mapboxClient.reverseGeocode(lngLat, (mapboxResponse: any) => {
                                        let result = mapboxResponse.body.features;
                                        let street = getStreetAndAddressInfo(result[0].place_name);
                                        let newCPE = {
                                            'type': 'Feature',
                                            'geometry': {
                                                'type': 'Point',
                                                'coordinates': lngLat
                                            },
                                            'properties': {
                                                'name': street.street,

                                                // @ts-ignore
                                                'ap': workspaceFeature.workspaceId,
                                                'feature_type': WorkspaceFeatureTypes.CPE,
                                                'height': DEFAULT_CPE_HEIGHT
                                            }
                                        };
                                        this.map.fire('draw.create', {features: [newCPE]});
                                    });
                                });
                            }
                            // @ts-ignore
                            this.features[workspaceFeature.workspaceId] = workspaceFeature;
                        });
                    }
                    break;

                case 'draw_cpe':
                    if (feature.geometry.type == 'Point') {
                        const newFeature = {
                            ...feature,
                            id: feature.id,
                            properties: {
                                name: feature.properties.name ? feature.properties.name : DEFAULT_CPE_NAME,
                                height: feature.properties.height ? feature.properties.height : DEFAULT_CPE_HEIGHT
                            }
                        }
                        workspaceFeature = new CPE(this.map, this.draw, newFeature);
                        workspaceFeature.create((resp) => {
                            // @ts-ignore
                            this.features[workspaceFeature.workspaceId] = workspaceFeature;
                        });
                    }
                    break;

                case 'simple_select':
                    // Adding CPE also adds link from CPE to specified AP (see customer popup)
                    if(feature.geometry.type == 'Point') {
                        workspaceFeature = new CPE(this.map, this.draw, feature);
                        workspaceFeature.create((resp) => {
                            // @ts-ignore
                            this.features[workspaceFeature.workspaceId] = workspaceFeature;
                            let cpe = workspaceFeature as CPE;
                            let apUUID = feature.properties.ap;
                            let ap = this.features[apUUID] as AccessPoint;
                            let link = cpe.linkAP(ap);
                            link.create((resp) => {
                                this.features[link.workspaceId] = link;
                                this.map.fire('draw.create', {features: [link.featureData]})
                            });
                        });
                    }
                    break;
            }
        });
    }

    /**
     * Callback for when user deletes mapbox draw feature
     * @param features - Array of geojson features
     */
    deleteFeatures({ features }: { features: Array<any> }) {
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

        features.forEach((feature) => {
            if (feature.properties.uuid) {
                let workspaceFeature = this.features[feature.properties.uuid];
                let featureType = workspaceFeature.getFeatureType();

                switch(featureType) {
                    case WorkspaceFeatureTypes.AP:
                        let popup = LinkCheckTowerPopup.getInstance()
                        let ap = workspaceFeature as AccessPoint;

                        // Get rid of tower tooltip if the APs match
                        if (popup.getAccessPoint() === ap) {
                            popup.hide();
                        }
                        workspaceFeature.delete((resp) => {
                            delete this.features[feature.properties.uuid];
                        });
                        break;
                    case WorkspaceFeatureTypes.CPE:
                        // Delete CPE and link, if that exists.
                        workspaceFeature.delete((resp) => {
                            delete this.features[feature.properties.uuid];
                        });
                        break;

                    // Do not invoke delete on links whose AP or CPEs don't exist anymore. It will 404.
                    case WorkspaceFeatureTypes.AP_CPE_LINK:
                        let link = workspaceFeature as APToCPELink;
                        if (this.draw.get(link.ap.mapboxId) && this.draw.get(link.cpe.mapboxId)) {
                            workspaceFeature.delete((resp) => {
                                delete this.features[feature.properties.uuid];
                            });
                        }
                        else {
                            delete this.features[feature.properties.uuid];
                        }
                        break;
                }
            }
        });

        PubSub.publish(WorkspaceEvents.AP_RENDER_SELECTED, {});
    }

    filterByType(list: Array<any>, feat_type: WorkspaceFeatureTypes) {
        return list.filter((feat: any) => {
            return (feat.properties && feat.properties.feature_type) ?
                feat.properties.feature_type === feat_type : false;
        });
    }

    drawSelectionChangeCallback({features}: {features: Array<any>}){
        PubSub.publish(WorkspaceEvents.AP_RENDER_SELECTED, {});
        const aps = this.filterByType(features, WorkspaceFeatureTypes.AP);
        const apPopup = LinkCheckTowerPopup.getInstance();
        const currentPopupAp = apPopup.getAccessPoint();

        aps.forEach((apFeature: any) => {
            // Request coverage for any AP that doesn't have coverage and isn't awaiting any either
            if (apFeature.properties.uuid) {
                let ap = this.features[apFeature.properties.uuid] as AccessPoint;
                if (!ap.awaitingCoverage && ap.coverage === EMPTY_BUILDING_COVERAGE) {
                    this.sendCoverageRequest('', {features: [apFeature]});   
                }
            }

            // Hide AP tooltip if user is dragging AP.
            if (currentPopupAp &&
                apFeature.properties.uuid == currentPopupAp.workspaceId &&
                (
                    apFeature.geometry.coordinates[0] !== currentPopupAp.featureData.geometry.coordinates[0] ||
                    apFeature.geometry.coordinates[1] !== currentPopupAp.featureData.geometry.coordinates[1]
                )
                ) {
                apPopup.hide();
            }
        });
    }

    drawModeChangeCallback(a: any) {
    }

    updateFeatures({ features, action }: { features: Array<any>, action: 'move' | 'change_coordinates' }) {
        const apPopup = LinkCheckTowerPopup.getInstance();

        features.forEach((feature: any) => {
            if (feature.properties.uuid) {
                switch(feature.properties.feature_type) {
                    case WorkspaceFeatureTypes.AP:
                        let ap = this.features[feature.properties.uuid] as AccessPoint;
                        ap.move(feature.geometry.coordinates as [number, number], () => {
                            ap.update(feature, () => {
                                Object.keys(BuildingCoverageStatus).forEach((status: string) => {
                                    this.draw.setFeatureProperty(ap.mapboxId, status, null);
                                });
                                ap.coverage = EMPTY_BUILDING_COVERAGE;
                                LinkCheckTowerPopup.onAPUpdate(ap);
                            });
                        });
                        break;
                    case WorkspaceFeatureTypes.CPE:
                        let cpe = this.features[feature.properties.uuid] as CPE;
                        let mapboxClient = MapboxSDKClient.getInstance();
                        mapboxClient.reverseGeocode(feature.geometry.coordinates, (response: any) => {
                            let result = response.body.features;
                            feature.properties.name = getStreetAndAddressInfo(result[0].place_name).street;
                            cpe.move(feature.geometry.coordinates as [number, number], () => {
                                cpe.update(feature);

                                // I hate this hack
                                $(`#radio_name-1`).text(feature.properties.name);
                            });
                        });
                        break;
                    default:
                        this.features[feature.properties.uuid].update(feature);
                        break;
                }
            }
        });

        const aps = this.filterByType(features, WorkspaceFeatureTypes.AP);
        PubSub.publish(WorkspaceEvents.AP_RENDER_SELECTED, {});
    }

    renderSelectedAccessPoints(msg: string, data: any){
        // If there are selected APs, only render circles/buildings for those, otherwise render all.
        let fc = this.draw.getSelected();
        if (this.filterByType(fc.features, WorkspaceFeatureTypes.AP).length === 0) {
            fc = this.draw.getAll();
        }
        this.debouncedRenderAPRadius(fc);
    }

    renderGivenApFeatures(msg: string, data: any){
        let fc = data;
        this.debouncedRenderAPRadius(fc);
    }
    
    /**
     * Renders access point circles and buildings from the given features.
     * @param fc - FeatureCollection of features to select and render APs from.
     */
    renderAccessPointRadius(fc: FeatureCollection<Geometry, GeoJsonProperties>){
        const circle_feats : Array<any> = [];
        const selectedAPs : Array<AccessPoint> = [];
        fc.features.forEach((feat: any) => {
            if(feat.properties.radius){
                if(feat.geometry.type === 'Point'){
                    const new_feat = createGeoJSONCircle(
                            feat.geometry,
                            feat.properties.radius,
                            feat.id);
                    circle_feats.push(new_feat);

                    // render coverage
                    if (feat.properties.uuid) {
                        let ap = this.features[feat.properties.uuid] as AccessPoint;
                        selectedAPs.push(ap);
                    }
                }
            }
        });
        // Replace radius features with selected
        const radiusSource = this.map.getSource(ACCESS_POINT_RADIUS_VIS_DATA);
        if(radiusSource.type ==='geojson'){
            radiusSource.setData({type: 'FeatureCollection', features: circle_feats});
        }

        // Replace building features with selected
        const buildingSource = this.map.getSource(ACCESS_POINT_BUILDING_DATA);
        if(buildingSource.type ==='geojson'){
            const coverage = BuildingCoverage.union(selectedAPs.map(ap => {
                return ap.coverage;
            }));
            buildingSource.setData({type: 'FeatureCollection', features: coverage.toFeatureArray()});
        }
    }

    debouncedRenderAPRadius = _.debounce(this.renderAccessPointRadius, 50);

    sendCoverageRequest(msg: string, data: {features: Array<GeoJSON.Feature>}){
        data.features.forEach((f: GeoJSON.Feature) => {
            if(f.properties){
                // clear coverage for UUID
                let ap = this.features[f.properties.uuid] as AccessPoint;
                ap.awaitNewCoverage();
                this.ws.sendAPRequest(f.properties.uuid, f.properties.height);
                PubSub.publish(WorkspaceEvents.AP_RENDER_SELECTED, {});
            }
        });
    }

    accessPointStatusCallback(message: AccessPointCoverageResponse) {
        $.ajax({
            url: `/pro/workspace/api/ap-los/coverage/${message.uuid}/`,
            success: (resp) => { this.updateCoverage(resp, message.uuid) },
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
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
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
                LinkCheckTowerPopup.onAPUpdate(this.features[message.uuid] as AccessPoint);
            },
            "method": "GET",
            "headers": {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
    }

    updateCoverage(resp: any, uuid: string) {
        const ap = this.features[uuid] as AccessPoint;
        ap.setCoverage(resp.features);
        PubSub.publish(WorkspaceEvents.AP_RENDER_SELECTED, {});
    }

    static getInstance() {
        if (WorkspaceManager._instance) {
            return WorkspaceManager._instance;
        }
        else {
            throw new Error('No instance of WorkspaceManager instantiated.')
        }
    }

    static getFeatures(feat_type: WorkspaceFeatureTypes) {
        return WorkspaceManager._instance.draw.getAll()['features'].filter((feat) => {
            return (feat.properties && feat.properties.feature_type) ?
                feat.properties.feature_type === feat_type : false;
        })
    }
}
