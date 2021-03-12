import * as MapboxGL from "mapbox-gl";
import { createGeoJSONCircle } from "./isptoolbox-mapbox-draw/RadiusModeUtils.js";
import { getCookie } from './utils/Cookie';
import LOSCheckWS from './LOSCheckWS';
import type { AccessPointCoverageResponse } from './LOSCheckWS';

const DEFAULT_AP_HEIGHT = 30;

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

export class AccessPointTool {
    map: MapboxGL.Map;
    draw: any;
    ws: LOSCheckWS;
    constructor(map: MapboxGL.Map, draw: any, ws: LOSCheckWS) {
        this.map = map;
        this.draw = draw;
        this.ws = ws;
        // Initialize Constructors
        this.map.on('draw.create', this.drawCreateCallback.bind(this));
        this.map.on('draw.delete', this.drawDeleteCallback.bind(this));
        this.ws.setAccessPointCallback(this.accessPointStatusCallback.bind(this));
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
            if (f.properties.overlay) {
                if(this.map.getLayer(f.properties.overlay)){
                    this.map.removeLayer(f.properties.overlay);
                }
                if(this.map.getSource(f.properties.layer))
                {
                    this.map.removeSource(f.properties.overlay);
                }
            }
        })
    }
    createAccessPointLocation(id: string) {
        const feat = this.draw.get(id);
        if (feat) {
            $.ajax({
                url: "/pro/workspace/api/ap-los/",
                data: {
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
                },
                success: (resp) => {
                    this.draw.setFeatureProperty(feat.id, "overlay", resp.uuid);
                    this.ws.sendAPRequest(resp.uuid);
                },
                "method": "POST",
                "headers": {
                    'X-CSRFToken': getCookie('csrftoken')
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
                const ap = drawn_features.features.filter((feat: any) => feat.properties.overlay === uuid);
                if(ap.length && ap[0].properties.center){
                    const new_link = {
                        "type": "Feature",
                        "geometry": {
                            "type": "LineString",
                            "coordinates": [ap[0].properties.center, [e.lngLat.lng, e.lngLat.lat]]
                        },
                        "properties": {}
                    };
                    const new_features = this.draw.add(new_link);
                    this.map.fire('draw.create', {features: new_features.map((f:string) => {
                        return this.draw.get(f);
                    })});
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
                
        } else if(source.type === "geojson") {
            source.setData(resp);
        }
    }
}

