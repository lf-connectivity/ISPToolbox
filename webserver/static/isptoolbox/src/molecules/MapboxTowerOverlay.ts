// (c) Meta Platforms, Inc. and affiliates. Copyright
import mapboxgl from 'mapbox-gl';
import MapboxOverlay from './MapboxOverlay';

const towerZoomThreshold: number = 12;

const EMPTY_SOURCE: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: []
};

export default class MapboxTowerOverlay implements MapboxOverlay {
    map: mapboxgl.Map;
    sourceId: string;
    selectedSourceId: string;
    labelsId: string;
    selectedLayerId: string;
    hover: boolean;
    sourceUrl: string;
    sourceLayer: string;

    constructor(
        map: mapboxgl.Map,
        sourceId: string,
        selectedSourceId: string,
        labelsId: string,
        selectedLayerId: string,
        hover: boolean,
        sourceUrl: string,
        sourceLayer: string
    ) {
        this.map = map;
        this.sourceId = sourceId;
        this.selectedSourceId = selectedSourceId;
        this.labelsId = labelsId;
        this.selectedLayerId = selectedLayerId;
        this.hover = hover;
        this.sourceUrl = sourceUrl;
        this.sourceLayer = sourceLayer;
    }

    show() {
        this.map.addSource(this.sourceId, {
            type: 'vector',
            url: `${this.sourceUrl}?optimize=true`
        });
        this.map.addLayer({
            id: this.labelsId,
            source: this.sourceId,
            'source-layer': this.sourceLayer,
            type: 'symbol',
            layout: {
                'icon-image': [
                    'step',
                    ['zoom'],
                    'tower-pin-simple',
                    towerZoomThreshold,
                    'tower-pin'
                ],
                'icon-allow-overlap': ['step', ['zoom'], false, towerZoomThreshold, true],
                // @ts-ignore
                'icon-ignore-placement': ['step', ['zoom'], false, towerZoomThreshold, true],
                'icon-anchor': 'bottom',
                'text-field': [
                    'format',
                    [
                        'to-string',
                        [
                            'round',
                            ['*', ['to-number', ['get', 'height_without_appurtenaces']], 3.2808]
                        ]
                    ],
                    { 'min-fraction-digits': 1, 'max-fraction-digits': 1 },
                    "'",
                    {}
                ],
                // @ts-ignore
                'text-ignore-placement': ['step', ['zoom'], false, towerZoomThreshold, true],
                'text-anchor': 'bottom',
                'text-font': ['Roboto Mono Bold', 'Arial Unicode MS Regular'],
                'text-size': 14,
                'text-letter-spacing': -0.03,
                'text-justify': 'right',
                'text-offset': [0.5, -0.82]
            },
            paint: {
                'text-color': ['step', ['zoom'], 'transparent', towerZoomThreshold, 'white']
            }
        });
        // Create a separate layer just for tower overlay
        this.map.addSource(this.selectedSourceId, {
            type: 'geojson',
            data: EMPTY_SOURCE
        });
        this.map.addLayer({
            id: this.selectedLayerId,
            source: this.selectedSourceId,
            type: 'symbol',
            layout: {
                'icon-image': [
                    'step',
                    ['zoom'],
                    'tower-pin-simple-blue',
                    towerZoomThreshold,
                    'tower-pin-blue'
                ],
                'icon-allow-overlap': ['step', ['zoom'], false, towerZoomThreshold, true],
                // @ts-ignore
                'icon-ignore-placement': ['step', ['zoom'], false, towerZoomThreshold, true],
                'icon-anchor': 'bottom',
                'text-field': [
                    'format',
                    [
                        'to-string',
                        [
                            'round',
                            ['*', ['to-number', ['get', 'height_without_appurtenaces']], 3.2808]
                        ]
                    ],
                    { 'min-fraction-digits': 1, 'max-fraction-digits': 1 },
                    "'",
                    {}
                ],
                // @ts-ignore
                'text-ignore-placement': ['step', ['zoom'], false, towerZoomThreshold, true],
                'text-anchor': 'bottom',
                'text-font': ['Roboto Mono Bold', 'Arial Unicode MS Regular'],
                'text-size': 14,
                'text-letter-spacing': -0.03,
                'text-justify': 'right',
                'text-offset': [0.5, -0.82]
            },
            paint: {
                'text-color': ['step', ['zoom'], 'transparent', towerZoomThreshold, 'white']
            }
        });
    }

    remove() {
        this.map.getLayer(this.labelsId) && this.map.removeLayer(this.labelsId);
        this.map.getSource(this.sourceId) && this.map.removeSource(this.sourceId);
        // Remove Selected Tower
        this.map.getLayer(this.selectedLayerId) && this.map.removeLayer(this.selectedLayerId);
        this.map.getSource(this.selectedSourceId) && this.map.removeSource(this.selectedSourceId);
    }
}
