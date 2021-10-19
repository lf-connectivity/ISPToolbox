import * as MapboxGL from 'mapbox-gl';
import { getCookie } from './utils/Cookie';
var _ = require('lodash');

//@ts-ignore
const mapboxgl = window.mapboxgl;
const MAPBOX_OVERLAY_LAYER = 'original';
const AVAILABILITY_PAINT_FILL_STYLE = {
    'fill-color': '#687B8B',
    'fill-opacity': 0.77
};

const SOURCES = {
    lidar_boundary: {
        source: 'high-res-lidar-boundary-source',
        layer: 'high-res-lidar-boundary-layer',
        url: 'isptoolbox.highreslidarboundary',
        fill_style: AVAILABILITY_PAINT_FILL_STYLE,
        admin_message: 'LiDAR Data Not Available Here'
    },
    dsm_unavailable: {
        source: 'dsm-unavailable-source',
        layer: 'dsm-unavailable-layer',
        url: 'isptoolbox.dsm_unavailable_boundary',
        fill_style: {
            'fill-color': '#f23e3e',
            'fill-opacity': 0.3
        },
        admin_message: 'DSM Tiles Not Available Here'
    },
    dsm_available: {
        source: 'dsm-available-source',
        layer: 'dsm-available-layer',
        url: 'isptoolbox.dsm_available_boundary',
        fill_style: {
            'fill-color': '#42B72a',
            'fill-opacity': 0.3
        },
        admin_message: 'DSM Tiles Available Here'
    }
};

type SourceType = 'lidar_boundary' | 'dsm_unavailable' | 'dsm_available';

export default class LidarAvailabilityLayer {
    map: MapboxGL.Map;
    popup: MapboxGL.Popup;
    constructor(map: MapboxGL.Map) {
        this.map = map;
        this.popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: 'lidar-availability-popup'
        });

        this.setupLidarAvailability();
    }

    protected setPopup(message: string, lngLat: MapboxGL.LngLat) {
        this.popup.setLngLat(lngLat).setHTML(message).addTo(this.map);
    }

    protected onMouseEnter(e: any) {
        // Change the cursor style as a UI indicator.
        this.map.getCanvas().style.cursor = 'pointer';
        this.setPopup('LiDAR Data Not<br>Available Here', e.lngLat);
    }

    protected onMouseMove(e: any) {
        this.setPopup('LiDAR Data Not<br>Available Here', e.lngLat);
    }

    protected onMouseLeave(e: any) {
        this.map.getCanvas().style.cursor = '';
        this.popup.remove();
    }

    protected setupSource(source: SourceType) {
        let info = SOURCES[source];
        this.map.addSource(info.source, {
            type: 'vector',
            url: `mapbox://${info.url}` //TODO: replace with overlay url object from server
        });
        this.map.addLayer({
            id: info.layer,
            type: 'fill',
            source: info.source,
            'source-layer': MAPBOX_OVERLAY_LAYER, // TODO: replace with source-layer from overlay object django
            layout: {},
            paint: info.fill_style
        });

        this.map.on('mouseenter', info.layer, this.onMouseEnter.bind(this));
        this.map.on('mousemove', info.layer, this.onMouseMove.bind(this));
        this.map.on('mouseleave', info.layer, this.onMouseLeave.bind(this));
    }

    protected setupLidarAvailability() {
        let sources = ['lidar_boundary'] as Array<SourceType>;

        sources.forEach((source) => {
            this.setupSource(source);
        });
    }
}

export class AdminLidarAvailabilityLayer extends LidarAvailabilityLayer {
    setCloudNames: any;
    constructor(map: MapboxGL.Map) {
        super(map);

        this.map.on('click', (e: any) => {
            if (
                this.map.queryRenderedFeatures(e.point, {
                    layers: [SOURCES['lidar_boundary'].layer]
                }).length === 0
            ) {
                this.queryLocation(e.lngLat);
            }
        });
    }

    protected setPopup(message: string, lngLat: MapboxGL.LngLat) {
        super.setPopup(
            `${message}<br>(${lngLat.lat.toFixed(5)}, ${lngLat.lng.toFixed(5)})`,
            lngLat
        );
    }

    queryLocation(lngLat: MapboxGL.LngLat) {
        $.ajax({
            url: '/admin/tile-check/',
            data: JSON.stringify({ coords: [lngLat.lng, lngLat.lat] }),
            method: 'PUT',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        }).done((resp) => {
            console.log(resp);
            let cloudsMsg = resp.clouds
                .map((cloud: any) => {
                    return `${cloud.name}: ${cloud.exists ? 'has tile ✅' : 'no tile ❌'}`;
                })
                .join('<br>');

            this.setPopup(`Clouds:<br>${cloudsMsg}`, lngLat);
        });
    }

    protected setPopupNoDebounce(e: any) {
        ['lidar_boundary', 'dsm_available', 'dsm_unavailable'].forEach((type: SourceType) => {
            if (
                this.map.queryRenderedFeatures(e.point, {
                    layers: [SOURCES[type].layer]
                }).length
            ) {
                this.setPopup(SOURCES[type].admin_message, e.lngLat);
            }
        });
    }

    protected onMouseEnter(e: any) {
        // Change the cursor style as a UI indicator.
        this.map.getCanvas().style.cursor = 'pointer';
        this.setPopupNoDebounce(e);
    }

    protected onMouseMove(e: any) {
        this.setPopupNoDebounce(e);
    }

    protected onMouseLeave(e: any) {
        super.onMouseLeave(e);
    }

    protected setupLidarAvailability() {
        let sources = ['lidar_boundary', 'dsm_available', 'dsm_unavailable'] as Array<SourceType>;
        sources.forEach((source) => {
            this.setupSource(source);
        });
    }
}
