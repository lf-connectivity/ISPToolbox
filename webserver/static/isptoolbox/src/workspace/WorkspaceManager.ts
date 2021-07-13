import mapboxgl, * as MapboxGL from "mapbox-gl";
import * as _ from "lodash";
import { Geometry, GeoJsonProperties, FeatureCollection }  from 'geojson';
import { createGeoJSONCircle } from "../isptoolbox-mapbox-draw/DrawModeUtils";
import { getCookie } from '../utils/Cookie';
import LOSCheckWS, { LOSWSEvents } from '../LOSCheckWS';
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
import { LinkCheckTowerPopup } from "../isptoolbox-mapbox-draw/popups/TowerPopups";
import * as StyleConstants from '../isptoolbox-mapbox-draw/styles/StyleConstants';
import { getStreetAndAddressInfo } from "../LinkCheckUtils";
import { getSessionID } from '../utils/MapPreferences';
import { DEFAULT_AP_HEIGHT, DEFAULT_AP_NAME, DEFAULT_CPE_NAME, DEFAULT_NO_CHECK_RADIUS } from "./BaseWorkspaceManager";
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
    // ws: LOSCheckWS;
    readonly features: { [workspaceId: string] : BaseWorkspaceFeature }; // Map from workspace UUID to feature
    view: LOSModal;
    viewshed: ViewshedTool;
    private last_selection : string = '';
    private static _instance: WorkspaceManager;

    constructor(selector: string, map: MapboxGL.Map, draw: MapboxDraw, initialFeatures: any) {
        if (WorkspaceManager._instance) {
            return WorkspaceManager._instance;
        }
        this.map = map;
        this.draw = draw;
        // this.ws = ws;
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
        this.map.on('draw.modechange', this.drawModeChangeCallback.bind(this));

        WorkspaceManager._instance = this;
    }

    createApFeature(feature: any, mapboxClient: any) {
        if (feature.geometry.type == 'Point') {
            const newCircle = {
                ...feature,
                properties: {
                    radius: feature.properties.radius / 1000,
                    max_radius: feature.properties.radius / 1000,
                    center: feature.geometry.coordinates,
                    height: DEFAULT_AP_HEIGHT,
                    no_check_radius: DEFAULT_NO_CHECK_RADIUS,
                    name: DEFAULT_AP_NAME
                },
                id: feature.id,
            }
            let ap = new AccessPoint(this.map, this.draw, newCircle);
            ap.create((resp) => {
                const apPopup = LinkCheckTowerPopup.getInstance();
                apPopup.setAccessPoint(ap);
                apPopup.show();
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
                                    'ap': ap.workspaceId,
                                    'feature_type': WorkspaceFeatureTypes.CPE,
                                }
                            };
                            this.map.fire('draw.create', {features: [newCPE]});
                        });
                    });
                }
                this.features[ap.workspaceId] = ap;
            });
        }
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
        // Mode draw_ap: Points are APs.
        // Mode draw_cpe: Points are CPEs.
        // Mode simple_select: Points are CPEs, LineStrings are links.
        unsavedFeatures.forEach((feature: any) => {
            let workspaceFeature: BaseWorkspaceFeature | undefined = undefined;
            switch(mode) {
                case 'draw_ap':
                    this.createApFeature(feature, mapboxClient);
                    break;

                case 'draw_cpe':
                    if (feature.geometry.type == 'Point') {
                        const newFeature = {
                            ...feature,
                            id: feature.id,
                            properties: {
                                name: feature.properties.name ? feature.properties.name : DEFAULT_CPE_NAME,
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
                    // It is possible to add either an AP or CPE while in simple_select so determine based on feature properties
                    // Adding CPE also adds link from CPE to specified AP (see customer popup)
                    if(feature.geometry.type == 'Point' && !feature.properties.radius) {
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
                                this.map.fire('draw.create', {features: [link.getFeatureData()]})
                            });
                        });
                    } else if (feature.properties.radius) {
                        this.createApFeature(feature, mapboxClient);
                    }
                    break;

                case 'direct_select':
                    if (feature.properties.radius) {
                        this.createApFeature(feature, mapboxClient);
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

                            ap.links.forEach((link, cpe) => {
                                delete this.features[link.workspaceId];
                                delete this.features[cpe.workspaceId];
                            });
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
    }

    filterByType(list: Array<any>, feat_type: WorkspaceFeatureTypes) {
        return list.filter((feat: any) => {
            return (feat.properties && feat.properties.feature_type) ?
                feat.properties.feature_type === feat_type : false;
        });
    }

    drawModeChangeCallback(a: any) {
    }

    updateFeatures({ features, action }: { features: Array<any>, action: 'move' | 'change_coordinates' }) {
        features.forEach((feature: any) => {
            if (feature.properties.uuid) {
                switch(feature.properties.feature_type) {
                    case WorkspaceFeatureTypes.AP:
                        let ap = this.features[feature.properties.uuid] as AccessPoint;
                        ap.update(() => {
                            Object.keys(BuildingCoverageStatus).forEach((status: string) => {
                                ap.setFeatureProperty(status, null);
                            });
                            LinkCheckTowerPopup.getInstance().onAPUpdate(ap);
                            LinkCheckTowerPopup.getInstance().show();
                        });
                        break;
                    case WorkspaceFeatureTypes.CPE:
                        let cpe = this.features[feature.properties.uuid] as CPE;
                        let mapboxClient = MapboxSDKClient.getInstance();
                        mapboxClient.reverseGeocode(feature.geometry.coordinates, (response: any) => {
                            let result = response.body.features;
                            feature.properties.name = getStreetAndAddressInfo(result[0].place_name).street;
                            cpe.update(() => {
                                // I hate this hack
                                $(`#radio_name-1`).text(feature.properties.name);
                            });
                        });
                        break;
                    default:
                        this.features[feature.properties.uuid].update();
                        break;
                }
            }
        });

        const aps = this.filterByType(features, WorkspaceFeatureTypes.AP);
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
