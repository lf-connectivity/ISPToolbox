import MapboxGL from 'mapbox-gl';
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
    sourceId: string;
    fillsId: string;
    bordersId: string;
    hover: boolean;
    sourceUrl: string;
    sourceLayer: string;
    color: string;
    outlineOnly: boolean;
    hoverFeature: string | number | undefined;
    
    constructor(overlay: GeoOverlay, sourceUrl: string, sourceLayer: string) {
        this.sourceId = overlay.sourceId;
        this.fillsId = overlay.fills;
        this.bordersId = overlay.borders;
        this.hover = overlay.hover;
        this.sourceUrl = sourceUrl;
        this.sourceLayer = sourceLayer;
        this.color = overlay.color;
        this.outlineOnly = overlay.outlineOnly;
    }

    mousemoveCallback(map: MapboxGL.Map) {
        return (event : MapboxGL.EventData) => {
            const features = event.features
            const canvas = map.getCanvas();
            if (canvas) {
                canvas.style.cursor = 'pointer';
            }
            if (this.hoverFeature !== null) {
                map.setFeatureState(
                    {
                        source: this.sourceId,
                        sourceLayer: this.sourceLayer,
                        id: this.hoverFeature,
                    },
                    {hover: false}
                );
            }
            this.hoverFeature = undefined;
            if (features && features.length) {
                this.hoverFeature = features[0].id;
                map.setFeatureState(
                    {
                        source: this.sourceId,
                        sourceLayer: this.sourceLayer,
                        id: this.hoverFeature,
                    },
                    {hover: true}
                );
            }
        }
    }

    mouseleaveCallback(map: MapboxGL.Map) {
        return () => {
            if (!this.hoverFeature) {
                return;
            }
            map.setFeatureState(
                {
                    source: this.sourceId,
                    sourceLayer: this.sourceLayer,
                    id: this.hoverFeature,
                },
                {hover: false}
            );
            const canvas = map.getCanvas();
            if (canvas) {
                canvas.style.cursor = '';
            }
        }
    }

    show(map: MapboxGL.Map) {
        map.addSource(this.sourceId, {
            type: 'vector',
            url: `${this.sourceUrl}?optimize=true`,
        });
        if (this.outlineOnly) {
            map.addLayer({
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
            map.addLayer({
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
        map.addLayer({
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

        map.on('mousemove', this.fillsId, this.mousemoveCallback(map));
        map.on('mouseleave', this.fillsId, this.mouseleaveCallback(map));
    }
    
    remove(map: MapboxGL.Map) {
        map.getLayer(this.fillsId) &&
        map.removeLayer(this.fillsId);
        map.getLayer(this.bordersId) &&
        map.removeLayer(this.bordersId);
        map.getSource(this.sourceId) &&
        map.removeSource(this.sourceId);
        map.off('mousemove', this.fillsId, this.mousemoveCallback(map));
        map.off('mouseleave', this.fillsId, this.mouseleaveCallback(map));
    }
}
