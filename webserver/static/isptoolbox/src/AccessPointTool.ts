import * as MapboxGL from "mapbox-gl";
import { createGeoJSONCircle } from "./isptoolbox-mapbox-draw/RadiusModeUtils.js";
import { getCookie } from './utils/Cookie';
import LOSCheckWS from './LOSCheckWS';
import type { AccessPointCoverageResponse } from './LOSCheckWS';
import PubSub from 'pubsub-js';


const DEFAULT_AP_HEIGHT = 30.48;

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

enum AccessPointEvents {
    MODAL_OPENED = 'ap.modal_opened',
    APS_LOADED = 'ap.all_loaded',
    AP_DELETED = 'ap.deleted',
    AP_UPDATE = 'ap.update',
}
export class AccessPointModal {
    selector: string;
    map: mapboxgl.Map;
    draw: any;
    constructor(selector: string, map: mapboxgl.Map, draw: any) {
        this.selector = selector;
        this.map = map;
        this.draw = draw;
        PubSub.subscribe(AccessPointEvents.MODAL_OPENED, this.getAccessPoints.bind(this));
        PubSub.subscribe(AccessPointEvents.APS_LOADED, this.addModalCallbacks.bind(this));
        PubSub.subscribe(AccessPointEvents.AP_DELETED, this.deleteAccessPoint.bind(this));
        PubSub.subscribe(AccessPointEvents.AP_UPDATE, this.updateAccessPoint.bind(this));

        this.map.on('draw.delete', ({ features }) => {
            features.forEach((feat: any) => {
                this.deleteAccessPoint(feat.properties.uuid);
            });
        });
        $(this.selector).on(
            'shown.bs.modal',
            () => {
                PubSub.publish(AccessPointEvents.MODAL_OPENED);
            }
        );
        // @ts-ignore
        $(this.selector).modal('show');
    }

    getAccessPoints() {
        $.get('/pro/workspace/api/ap-los/', '', (result) => {
            $('#ap-list-modal-body').html(result); // Or whatever you need to insert the result
        }, 'html').done(() => { PubSub.publish(AccessPointEvents.APS_LOADED) });
    }

    updateAccessPoint(msg: string, feature: any) {
        $.ajax({
            url: `/pro/workspace/api/ap-los/${feature.properties.uuid}/`,
            method: "PATCH",
            data: {max_radius: feature.properties.radius, location: JSON.stringify(
                feature.properties.center ? 
                {
                    'type': 'Point',
                    'coordinates':  feature.properties.center
                }: feature.geometry
            )},
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Accept': 'application/json'
            }
        });
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
    }
}


export class AccessPointTool {
    map: MapboxGL.Map;
    draw: any;
    ws: LOSCheckWS;
    view: AccessPointModal;

    constructor(selector: string, map: MapboxGL.Map, draw: any, ws: LOSCheckWS) {
        this.map = map;
        this.draw = draw;
        this.ws = ws;
        this.view = new AccessPointModal(selector, this.map, this.draw);
        // Initialize Constructors
        this.map.on('draw.create', this.drawCreateCallback.bind(this));
        this.map.on('draw.delete', this.drawDeleteCallback.bind(this));
        this.map.on('draw.update', this.drawUpdateCallback.bind(this));
        this.ws.setAccessPointCallback(this.accessPointStatusCallback.bind(this));
        // @ts-ignore
        $('#accessPointModal').modal('show');
    }
    drawCreateCallback({ features }: any) {
        const feature = features[0];
        if (feature.properties.radius) {
            const newCircle = {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: createGeoJSONCircle(
                        feature.geometry.coordinates,
                        feature.properties.radius / 1000,
                    ).geometry.coordinates,
                },
                properties: {
                    isCircle: true,
                    radius: feature.properties.radius / 1000,
                    center: feature.geometry.coordinates,
                    height: DEFAULT_AP_HEIGHT,
                },
                id: feature.id,
            };
            const ids = this.draw.add(newCircle);
            ids.forEach((id: string) => {
                this.createAccessPointLocation(id);
            });
        }
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
        })
    }

    drawUpdateCallback({ features, action }: { features: Array<any>, action: 'move' | 'change_coordinates' }) {
        features.forEach((f) => {
            PubSub.publish(AccessPointEvents.AP_UPDATE, f);
        })
    }

    createAccessPointLocation(id: string) {
        const feat = this.draw.get(id);
        if (feat) {
            const data = {
                location: JSON.stringify(
                    {
                        'type': 'Point',
                        'coordinates': feat.properties.center
                    }
                ),
                max_radius: feat.properties.radius,
                no_check_radius: 0.01,
                name: "Unnamed AP",
                default_cpe_height: 1,
                height: feat.properties.height,
            };
            for (const [key, value] of Object.entries(data)) {
                this.draw.setFeatureProperty(feat.id, key, value);
            }
            $.ajax({
                url: "/pro/workspace/api/ap-los/",
                data,
                success: (resp) => {
                    this.draw.setFeatureProperty(feat.id, "uuid", resp.uuid);
                    // this.ws.sendAPRequest(resp.uuid);
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
        const source = this.map.getSource(uuid);
        if (!source) {
            this.map.addSource(uuid, {
                'type': 'geojson',
                'data': resp
            });
            this.map.addLayer({
                'id': uuid,
                'type': 'fill',
                'source': uuid,
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
            this.map.on('click', uuid, (e: any) => {
                const drawn_features = this.draw.getAll();
                const ap = drawn_features.features.filter((feat: any) => feat.properties.uuid === uuid);
                if (ap.length && ap[0].properties.center) {
                    const new_link = {
                        "type": "Feature",
                        "geometry": {
                            "type": "LineString",
                            "coordinates": [ap[0].properties.center, [e.lngLat.lng, e.lngLat.lat]]
                        },
                        "properties": {}
                    };
                    const new_features = this.draw.add(new_link);
                    this.map.fire('draw.create', {
                        features: new_features.map((f: string) => {
                            return this.draw.get(f);
                        })
                    });
                }
            });

            // Change the cursor to a pointer when the mouse is over the states layer.
            this.map.on('mouseenter', uuid, () => {
                this.map.getCanvas().style.cursor = 'pointer';
            });

            // Change it back to a pointer when it leaves.
            this.map.on('mouseleave', uuid, () => {
                this.map.getCanvas().style.cursor = '';
            });

        } else if (source.type === "geojson") {
            source.setData(resp);
        }
    }
}

