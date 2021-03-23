import * as MapboxGL from "mapbox-gl";
import { createGeoJSONCircle } from "./isptoolbox-mapbox-draw/RadiusModeUtils.js";
import { getCookie } from './utils/Cookie';
import LOSCheckWS from './LOSCheckWS';
import type { AccessPointCoverageResponse } from './LOSCheckWS';
import PubSub from 'pubsub-js';
import {isUnitsUS} from './utils/MapPreferences';
import {LinkCheckEvents} from './LinkCheckPage';


const DEFAULT_AP_HEIGHT = 30.48;
const ACCESS_POINT_RADIUS_VIS_DATA = 'ap_vis_data_source';
const ACCESS_POINT_RADIUS_VIS_LAYER_LINE = 'ap_vis_data_layer-line';
const ACCESS_POINT_RADIUS_VIS_LAYER_FILL = 'ap_vis_data_layer-fill';

const ACCESS_POINT_BUILDING_DATA = 'ap_building_source';
const ACCESS_POINT_BUILDING_LAYER = 'ap_building_layer';

type AccessPointLocation = {
    created: string
    default_cpe_height: number
    height: number
    last_updated: string
    location: string
    max_radius: number
    name: string
    no_check_radius: number
    uuid: string
};

export enum AccessPointEvents {
    MODAL_OPENED = 'ap.modal_opened',
    APS_LOADED = 'ap.all_loaded',
    AP_DELETED = 'ap.deleted',
    AP_UPDATE = 'ap.update',
    AP_RENDER = 'ap.render',
    AP_SELECTED = 'ap.selected',
}
export class AccessPointModal {
    selector: string;
    map: mapboxgl.Map;
    draw: MapboxDraw;
    constructor(selector: string, map: mapboxgl.Map, draw: MapboxDraw) {
        this.selector = selector;
        this.map = map;
        this.draw = draw;

        // Add pubsub modal callbacks
        PubSub.subscribe(AccessPointEvents.MODAL_OPENED, this.getAccessPoints.bind(this));
        PubSub.subscribe(AccessPointEvents.APS_LOADED, this.addModalCallbacks.bind(this));
        PubSub.subscribe(AccessPointEvents.AP_DELETED, this.deleteAccessPoint.bind(this));
        PubSub.subscribe(AccessPointEvents.AP_UPDATE, this.updateAccessPoint.bind(this));

        // Map Callbacks
        this.map.on('draw.delete', ({ features }) => {
            features.forEach((feat: any) => {
                this.deleteAccessPoint(feat.properties.uuid);
            });
        });

        // Modal Callbacks
        $(this.selector).on(
            'shown.bs.modal',
            () => {
                PubSub.publish(AccessPointEvents.MODAL_OPENED);
            }
        );

        // Open Modal
        // @ts-ignore
        $(this.selector).modal('show');
    }

    getAccessPoints(msg: string, data : {ordering: string | null, page: number | string | null} | null) {
        $.get('/pro/workspace/api/ap-los/', data ? data : '', (result) => {
            $('#ap-list-modal-body').html(result);
        }, 'html').done(() => { PubSub.publish(AccessPointEvents.APS_LOADED) });
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
                PubSub.publish(AccessPointEvents.MODAL_OPENED);
            });
        }
    }

    deleteAccessPoint(uuid: string | null) {
        if (typeof uuid === 'string') {
            $.ajax({
                url: `/pro/workspace/api/ap-los/${uuid}/`, method: "POST", headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                }
            }).done(() => {
                PubSub.publish(AccessPointEvents.MODAL_OPENED);
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
            PubSub.publish(AccessPointEvents.MODAL_OPENED, {ordering, page});
        })

        $('.ap-modal-page-change').on('click', (event) => {
            const ordering = $('#ap-modal-ordering').val();
            const page = event.currentTarget.getAttribute('page-target');
            PubSub.publish(AccessPointEvents.MODAL_OPENED, {ordering, page});
        })
    }
}


export class AccessPointTool {
    map: MapboxGL.Map;
    draw: MapboxDraw;
    ws: LOSCheckWS;
    view: AccessPointModal;

    constructor(selector: string, map: MapboxGL.Map, draw: MapboxDraw, ws: LOSCheckWS) {
        this.map = map;
        this.draw = draw;
        this.ws = ws;
        this.view = new AccessPointModal(selector, this.map, this.draw);
        // Initialize Constructors
        this.map.on('draw.create', this.drawCreateCallback.bind(this));
        this.map.on('draw.delete', this.drawDeleteCallback.bind(this));
        this.map.on('draw.update', this.drawUpdateCallback.bind(this));
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
        PubSub.subscribe(AccessPointEvents.AP_SELECTED, this.sendCoverageRequest.bind(this));
        PubSub.subscribe(AccessPointEvents.AP_RENDER, this.renderAccessPointRadius.bind(this));
        // @ts-ignore
        // $('#bulkUploadAccessPoint').modal('show');
    }
    drawCreateCallback({ features }: any) {
        let feat: any = null;
        features.forEach((feature: any) => {
            if (feature.properties.radius) {
                const newCircle = {
                    ...feature
                    ,
                    properties: {
                        radius: feature.properties.radius / 1000,
                        center: feature.geometry.coordinates,
                        height: DEFAULT_AP_HEIGHT,
                    },
                    id: feature.id,
                };
                const ids = this.draw.add(newCircle);
                ids.forEach((id: string) => {
                    this.createAccessPointLocation(id);
                    feat = this.draw.get(id);
                });
                
            }
        });
    }
    /**
     * Callback for when user deletes mapbox draw feature
     * @param features - Array of geojson features
     */
    drawDeleteCallback({ features }: { features: Array<any> }) {
        features.forEach((f) => {
            if (f.properties.uuid) {
                if (this.map.getLayer(f.properties.uuid)) {
                    this.map.removeLayer(f.properties.uuid);
                }
                if (this.map.getSource(f.properties.layer)) {
                    this.map.removeSource(f.properties.uuid);
                }
            }
        });
        PubSub.publish(AccessPointEvents.AP_RENDER, {features});
    }

    drawSelectionChangeCallback({features}: {features: Array<any>}){
        PubSub.publish(AccessPointEvents.AP_RENDER, {features});
        const aps = features.filter((f)=>f.properties.uuid);
        if(aps.length === 1) {
            PubSub.publish(AccessPointEvents.AP_SELECTED, {features: aps});
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

    drawUpdateCallback({ features, action }: { features: Array<any>, action: 'move' | 'change_coordinates' }) {
        features.forEach((f) => {
            PubSub.publish(AccessPointEvents.AP_UPDATE, f);
        })
        PubSub.publish(AccessPointEvents.AP_RENDER, {features});
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
        data.features.forEach((f) => {
            if(f.properties){
                this.ws.sendAPRequest(f.properties.uuid);
            }
        })
    }

    createAccessPointLocation(id: string) {
        const feat = this.draw.get(id);
        if (feat) {
            const data = {
                location: JSON.stringify(feat.geometry),
                max_radius: feat.properties ? feat.properties.radius : 1,
                no_check_radius: 0.01,
                name: "Unnamed AP",
                default_cpe_height: 1,
                height: feat.properties ? feat.properties.height: DEFAULT_AP_HEIGHT,
            };
            if(feat.id && typeof feat.id === 'string') {
                for (const [key, value] of Object.entries(data)) {
                    this.draw.setFeatureProperty(feat.id, key, value);
                }
            }
            $.ajax({
                url: "/pro/workspace/api/ap-los/",
                data,
                success: (resp) => {
                    if(feat.id && typeof feat.id ==='string') {
                        this.draw.setFeatureProperty(feat.id, "uuid", resp.uuid);
                        const new_feat = this.draw.get(feat.id);
                        if(new_feat && new_feat.geometry.type !== 'GeometryCollection' && new_feat.properties){
                            const data = {
                                radio: 0,
                                latitude: new_feat.geometry.coordinates[1],
                                longitude: new_feat.geometry.coordinates[0],
                                height: isUnitsUS() ? new_feat.properties.height * 3.28084 : new_feat.properties.height,
                                name: new_feat.properties.name
                            };
                            PubSub.publish(LinkCheckEvents.SET_INPUTS, data);
                            PubSub.publish(AccessPointEvents.AP_SELECTED, {features: [new_feat]});
                        }
                    }
                },
                "method": "POST",
                "headers": {
                    'X-CSRFToken': getCookie('csrftoken'),
                    'Accept': 'application/json'
                }
            });
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
            new window.mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(CPE_POPUP_HTML)
            .addTo(this.map);
            const add_link_function = () => {
                const drawn_features = this.draw.getAll();
                const ap = drawn_features.features.filter((feat: any) => feat.properties.uuid === uuid);
                if (ap.length && ap[0].geometry && ap[0].geometry.type !== 'GeometryCollection') {
                    const new_link = {
                        "type": "Feature",
                        "geometry": {
                            "type": "LineString",
                            "coordinates": [ap[0].geometry.coordinates,  [e.lngLat.lng, e.lngLat.lat]]
                        },
                        "properties": {
                            //@ts-ignore
                            radio0hgt: isUnitsUS() ? ap[0].properties.height_ft : ap[0].properties.height,
                            radio1hgt: isUnitsUS() ? 20 : 5,
                        }
                    };
                    //@ts-ignore
                    const new_features = this.draw.add(new_link);
                    this.map.fire('draw.create', {
                        features: new_features.map((f: string) => {
                            return this.draw.get(f);
                        })
                    });
                }
            }
            $('#add-cpe-btn-popup').on('click', add_link_function);
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