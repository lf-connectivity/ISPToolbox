import mapboxgl, * as MapboxGL from "mapbox-gl";
import { Feature, Geometry, Point, LineString, GeoJsonProperties, Position }  from 'geojson';
import { createGeoJSONCircle } from "../isptoolbox-mapbox-draw/RadiusModeUtils.js";
import { getCookie } from '../utils/Cookie';
import LOSCheckWS from '../LOSCheckWS';
import type { AccessPointCoverageResponse } from '../LOSCheckWS';
import PubSub from 'pubsub-js';
import {isUnitsUS} from '../utils/MapPreferences';
import {LinkCheckEvents} from '../LinkCheckPage';
import { WorkspaceEvents, WorkspaceFeatureTypes } from './WorkspaceConstants';
import { BaseWorkspaceFeature, WorkspaceLineStringFeature } from './BaseWorkspaceFeature';
import { AccessPoint, APToCPELink, CPE } from './WorkspaceFeatures';


const DEFAULT_AP_HEIGHT = 30.48;
const DEFAULT_CPE_HEIGHT = 1.0;
const DEFAULT_NO_CHECK_RADIUS = 0.01;
const DEFAULT_AP_NAME = 'Unnamed AP';
const DEFAULT_CPE_NAME = 'Unnamed CPE';
const DEFAULT_LINK_FREQUENCY = 5.4925

const ACCESS_POINT_RADIUS_VIS_DATA = 'ap_vis_data_source';
const ACCESS_POINT_RADIUS_VIS_LAYER_LINE = 'ap_vis_data_layer-line';
const ACCESS_POINT_RADIUS_VIS_LAYER_FILL = 'ap_vis_data_layer-fill';

const ACCESS_POINT_BUILDING_DATA = 'ap_building_source';
const ACCESS_POINT_BUILDING_LAYER = 'ap_building_layer';

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
        PubSub.subscribe(WorkspaceEvents.AP_UPDATE, this.updateAccessPoint.bind(this));

        // Modal Callbacks
        $(this.selector).on(
            'shown.bs.modal',
            () => {
                PubSub.publish(WorkspaceEvents.LOS_MODAL_OPENED);
            }
        );

        // Open Modal
        
    }

    getAccessPoints(msg: string, data : {ordering: string | null, page: number | string | null} | null) {
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
    addCPEPopup?: mapboxgl.Popup;

    constructor(selector: string, map: MapboxGL.Map, draw: MapboxDraw, ws: LOSCheckWS, initialFeatures: any) {
        this.map = map;
        this.draw = draw;
        this.ws = ws;
        this.view = new LOSModal(selector, this.map, this.draw);

        // Initialize features
        this.features = {};

        // Add APs and CPEs
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
                workspaceFeature = new AccessPoint(this.draw, feature);
            }
            else {
                workspaceFeature = new CPE(this.draw, feature);
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
            let workspaceFeature = new APToCPELink(this.draw, feature, ap, cpe);
            this.features[workspaceFeature.workspaceId] = workspaceFeature;
        });

        // Initialize Constructors
        this.map.on('draw.create', this.saveFeatures.bind(this));
        this.map.on('draw.delete', this.deleteFeatures.bind(this));
        this.map.on('draw.update', this.updateFeatures.bind(this));
        this.map.on('draw.selectionchange', this.drawSelectionChangeCallback.bind(this));
        this.map.on('draw.modechange', this.drawModeChangeCallback.bind(this));
        
        // Add Visualization Layers
        this.map.addSource(ACCESS_POINT_RADIUS_VIS_DATA, {type: 'geojson', data: {type: 'FeatureCollection', features : []}});
        this.map.addLayer({
            'id': ACCESS_POINT_RADIUS_VIS_LAYER_FILL,
            'type': 'fill',
            'source': ACCESS_POINT_RADIUS_VIS_DATA,
            'layout': {},
            'paint': {
            'fill-color': '#1172a9',
            'fill-opacity': 0.4,
            }});
        this.map.addLayer({
            'id': ACCESS_POINT_RADIUS_VIS_LAYER_LINE,
            'type': 'line',
            'source': ACCESS_POINT_RADIUS_VIS_DATA,
            'layout': {},
            'paint': {
            'line-color': '#1172a9',
            'line-dasharray': [0.2, 2],
            'line-width': 2
        }});

        this.map.addSource(ACCESS_POINT_BUILDING_DATA, {type: 'geojson', data: {type: 'FeatureCollection', features : []}});
        this.map.addLayer({
            'id': ACCESS_POINT_BUILDING_LAYER,
            'type': 'fill',
            'source': ACCESS_POINT_BUILDING_DATA,
            'layout': {},
            'paint': {
                'fill-color': [
                    'match',
                    ['get', 'serviceable'],
                    'unserviceable',
                    '#ff2f00',
                    'serviceable',
                    '#34eb46',
                /* other */ '#ccc'
                ],
                'fill-opacity': 0.9
            }
        });

        // Add Pubsub Callbacks
        this.ws.setAccessPointCallback(this.accessPointStatusCallback.bind(this));
        PubSub.subscribe(WorkspaceEvents.AP_SELECTED, this.sendCoverageRequest.bind(this));
        PubSub.subscribe(WorkspaceEvents.AP_RENDER, this.renderAccessPointRadius.bind(this));
        // @ts-ignore
        // $('#bulkUploadAccessPoint').modal('show');

    }
    saveFeatures({ features }: any) {
        const mode = String(this.draw.getMode());

        // Ignore features already saved in this.features
        const unsavedFeatures = features.filter((feature: any) => {
            return (!feature.properties.uuid || !(feature.properties.uuid in this.features));
        });

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
                        workspaceFeature = new AccessPoint(this.draw, newCircle);
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
                        workspaceFeature = new CPE(this.draw, newFeature);
                    }
                    break;

                case 'simple_select':
                    switch(feature.geometry.type) {
                        case 'Point':
                            workspaceFeature = new CPE(this.draw, feature);
                            break;
                        case 'LineString':
                            let apWorkspaceId = feature.properties.ap;
                            let cpeWorkspaceId = feature.properties.cpe;
                            let ap = this.features[apWorkspaceId] as AccessPoint;
                            let cpe = this.features[cpeWorkspaceId] as CPE;
                            workspaceFeature = new APToCPELink(this.draw, feature, ap, cpe);
                            break;
                    }
                    break;
            }
            if (workspaceFeature) {
                workspaceFeature.create((resp) => {
                    // @ts-ignore
                    this.features[workspaceFeature.workspaceId] = workspaceFeature;
                });
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

        features.forEach(async (feature) => {
            if (feature.properties.uuid) {
                let workspaceFeature = this.features[feature.properties.uuid]
                workspaceFeature.delete((resp) => {
                    delete this.features[feature.properties.uuid];
                });
            }
        });

        PubSub.publish(WorkspaceEvents.AP_RENDER, {features});
    }

    drawSelectionChangeCallback({features}: {features: Array<any>}){
        PubSub.publish(WorkspaceEvents.AP_RENDER, {features});
        const aps = features.filter((f) => f.properties.feature_type === WorkspaceFeatureTypes.AP);
        if(aps.length === 1) {
            PubSub.publish(WorkspaceEvents.AP_SELECTED, {features: aps});
            PubSub.publish(LinkCheckEvents.SET_INPUTS, {
                radio: 0,
                latitude: aps[0].properties.center[1],
                longitude: aps[0].properties.center[0],
                height: isUnitsUS() ? aps[0].properties.height * 3.28084 : aps[0].properties.height,
                name: aps[0].properties.name
            });
        }
    }

    drawModeChangeCallback(a: any) {
    }

    updateFeatures({ features, action }: { features: Array<any>, action: 'move' | 'change_coordinates' }) {
        features.forEach((feature: any) => {
            if (feature.properties.uuid) {
                this.features[feature.properties.uuid].update(feature);
            }
        });

        const aps = features.filter(
            (feature: any) => feature.properties.feature_type && feature.properties.feature_type === WorkspaceFeatureTypes.AP
        );
        PubSub.publish(WorkspaceEvents.AP_RENDER, {features: aps});
    }

    renderAccessPointRadius(msg: string, data: any){
        const features = data.features;
        const fc = this.draw.getAll();
        const circle_feats : Array<any> = [];
        fc.features.forEach((feat: any) => {
            if(feat.properties.radius){
                if(features.map((f : any)=>f.id).includes(feat.id)){
                    if(feat.geometry.type === 'Point'){
                        const new_feat = createGeoJSONCircle(
                                feat.geometry,
                                feat.properties.radius,
                                feat.properties.parent);
                        circle_feats.push(new_feat);
                    }
                }   
            }
        });
        const source = this.map.getSource(ACCESS_POINT_RADIUS_VIS_DATA);
        if(source.type ==='geojson'){
            source.setData({type: 'FeatureCollection', features: circle_feats});
        }
    }

    sendCoverageRequest(msg: string, data: {features: Array<GeoJSON.Feature>}){
        if(data.features.length === 1){
            const f = data.features[0];
            if(f.properties){
                this.ws.sendAPRequest(f.properties.uuid);
            }
        }
    }

    accessPointStatusCallback(message: AccessPointCoverageResponse) {
        $.ajax({
            url: `/pro/workspace/api/ap-los/coverage/${message.uuid}/`,
            success: (resp) => { this.plotBuildings(resp, message.uuid) },
            "method": "GET",
            "headers": {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
    }

    plotBuildings(resp: any, uuid: string) {
        const source = this.map.getSource(ACCESS_POINT_BUILDING_DATA);
        this.map.on('click', ACCESS_POINT_BUILDING_LAYER, (e: any) => {
            if (this.addCPEPopup) {
                this.addCPEPopup.remove();
            }

            this.addCPEPopup = new window.mapboxgl.Popup()
                                                  .setLngLat(e.lngLat)
                                                  .setHTML(CPE_POPUP_HTML)
                                                  .addTo(this.map);
            const add_link_function = () => {
                const ap = this.features[uuid] as AccessPoint;
                const newCPE = {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [e.lngLat.lng, e.lngLat.lat]
                    },
                    'properties': {
                        'name': DEFAULT_CPE_NAME,
                        'height': ap.featureData.properties?.default_cpe_height
                    }
                } as Feature<Point, any>

                // Persist CPE, then persist link.
                const cpe = new CPE(this.draw, newCPE);
                cpe.create((resp) => {
                    this.features[cpe.workspaceId] = cpe;
                    const link = cpe.linkAP(ap);
                    link.create((resp) => {
                        this.features[link.workspaceId] = link;
                        this.addCPEPopup?.remove();
                        this.map.fire('draw.create', {
                            features: [cpe.mapboxId, link.mapboxId]
                        });
                    });
                });
            }
            $('#add-cpe-btn-popup').on('click', add_link_function);
            this.addCPEPopup.on('close', () => {
                this.addCPEPopup = undefined;
            });
        });

        // Change the cursor to a pointer when the mouse is over the states layer.
        this.map.on('mouseenter', ACCESS_POINT_BUILDING_LAYER, () => {
            this.map.getCanvas().style.cursor = 'pointer';
        });

        // Change it back to a pointer when it leaves.
        this.map.on('mouseleave', ACCESS_POINT_BUILDING_LAYER, () => {
            this.map.getCanvas().style.cursor = '';
        });

        if (source.type === "geojson") {
            source.setData(resp);
        }
    }
}

const CPE_POPUP_HTML = "<h5>Install a customer here?</h5><button class='btn btn-primary isptoolbox-btn' id='add-cpe-btn-popup'>Add CPE</button>"