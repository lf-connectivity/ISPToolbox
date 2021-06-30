import MapboxDraw from '@mapbox/mapbox-gl-draw';
import mapboxgl from 'mapbox-gl';
import MapboxOverlay from './MapboxOverlay';

export type GeoOverlay = {
    sourceId: string,
    fills: string,
    borders: string,
    hover: boolean,
    color: string,
    outlineOnly: boolean,
}

export default class MapboxGeoOverlay implements MapboxOverlay {
    map: mapboxgl.Map;
    draw: MapboxDraw;
    sourceId: string;
    fillsId: string;
    bordersId: string;
    sourceUrl: string;
    sourceLayer: string;
    color: string;
    outlineOnly: boolean;
    hoverFeature: string | number | undefined;
    popup: any;
    
    constructor(map: mapboxgl.Map, draw: MapboxDraw, overlay: GeoOverlay, sourceUrl: string, sourceLayer: string, popupClass: any) {
        this.map = map;
        this.draw = draw;
        this.sourceId = overlay.sourceId;
        this.fillsId = overlay.fills;
        this.bordersId = overlay.borders;
        this.sourceUrl = sourceUrl;
        this.sourceLayer = sourceLayer;
        this.color = overlay.color;
        this.outlineOnly = overlay.outlineOnly;
        this.popup = popupClass.getInstance();
    }

    mousemoveCallback(e: any) {
        const features = e.features
        const canvas = this.map.getCanvas();
        if (canvas) {
            canvas.style.cursor = 'pointer';
        }
        if (this.hoverFeature !== undefined) {
            this.map.setFeatureState(
                {
                    source: this.sourceId,
                    sourceLayer: this.sourceLayer,
                    id: this.hoverFeature,
                },
                {hover: false}
            );
            this.popup.hide();
        }
        this.hoverFeature = undefined;
        if (features && features.length) {
            this.hoverFeature = features[0].id;
            this.map.setFeatureState(
                {
                    source: this.sourceId,
                    sourceLayer: this.sourceLayer,
                    id: this.hoverFeature,
                },
                {hover: true}
            );
            
            this.popup.setFeature(features[0]);
            this.popup.setLngLat(e.lngLat);
            this.popup.show();
        }
    }

    mouseleaveCallback() {
        if (!this.hoverFeature) {
            return;
        }
        this.map.setFeatureState(
            {
                source: this.sourceId,
                sourceLayer: this.sourceLayer,
                id: this.hoverFeature,
            },
            {hover: false}
        );
        const canvas = this.map.getCanvas();
        if (canvas) {
            canvas.style.cursor = '';
        }
        this.popup.hide();
    }

    mouseClickCallback(e: any) {
    }

    show() {
        this.map.addSource(this.sourceId, {
            type: 'vector',
            url: `${this.sourceUrl}?optimize=true`,
        });
        if (this.outlineOnly) {
            this.map.addLayer({
                id: this.fillsId,
                type: 'fill',
                source: this.sourceId,
                'source-layer': this.sourceLayer,
                layout: {},
                paint: {
                    'fill-color': this.color,
                    'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false],
                    0.34,
                    0,
                ]
                },
            });
        } else {
            this.map.addLayer({
                id: this.fillsId,
                type: 'fill',
                source: this.sourceId,
                'source-layer': this.sourceLayer,
                layout: {},
                paint: {
                    'fill-color': this.color,
                    'fill-opacity': 0.34,
                },
            });
        }
        this.map.addLayer({
            id: this.bordersId,
            type: 'line',
            source: this.sourceId,
            'source-layer': this.sourceLayer,
            layout: {},
            paint: {
                'line-color': this.color,
                'line-width': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    3,
                    1,
                ],
            },
        });

        this.map.on('mousemove', this.fillsId, this.mousemoveCallback.bind(this));
        this.map.on('mouseleave', this.fillsId, this.mouseleaveCallback.bind(this));
        this.map.on('click', this.fillsId, this.mouseClickCallback.bind(this));
    }
    
    remove() {
        this.map.getLayer(this.fillsId) &&
        this.map.removeLayer(this.fillsId);
        this.map.getLayer(this.bordersId) &&
        this.map.removeLayer(this.bordersId);
        this.map.getSource(this.sourceId) &&
        this.map.removeSource(this.sourceId);
        this.map.off('mousemove', this.fillsId, this.mousemoveCallback.bind(this));
        this.map.off('mouseleave', this.fillsId, this.mouseleaveCallback.bind(this));
        this.map.on('click', this.fillsId, this.mouseClickCallback.bind(this));
    }
}
