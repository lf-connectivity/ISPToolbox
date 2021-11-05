import MapboxDraw from '@mapbox/mapbox-gl-draw';
import mapboxgl, { VideoSource } from 'mapbox-gl';
import MapboxOverlay from './MapboxOverlay';

const TOWER_ZOOM_THRESHOLD = 12;

export class ASRTowerOverlay implements MapboxOverlay {
    map: mapboxgl.Map;
    draw: MapboxDraw;
    towerLayerId: string;
    towerSourceId: string;
    sourceUrl: string;
    sourceLayer: string;
    towerSelectedLayerId: string;
    towerSelectedSourceId: string;

    boundSelectedMouseClickCallback: (e: any) => void;
    boundUnselectedMouseClickCallback: (e: any) => void;

    constructor(
        map: mapboxgl.Map,
        draw: MapboxDraw,
        towerLayerId: string,
        towerSourceId: string,
        sourceUrl: string,
        sourceLayer: string,
        towerSelectedLayerId: string,
        towerSelectedSourceId: string
    ) {
        this.map = map;
        this.draw = draw;
        this.towerLayerId = towerLayerId;
        this.towerSourceId = towerSourceId;
        this.sourceUrl = sourceUrl;
        this.sourceLayer = sourceLayer;
        this.towerSelectedLayerId = towerSelectedLayerId;
        this.towerSelectedSourceId = towerSelectedSourceId;

        this.boundSelectedMouseClickCallback = this.selectedMouseClickCallback.bind(this);
        this.boundUnselectedMouseClickCallback = this.unselectedMouseClickCallback.bind(this);
    }

    selectedMouseClickCallback(e: any) {
        console.log('test selected');
    }

    unselectedMouseClickCallback(e: any) {
        if (e.features && e.features.length) {
            let feature = e.features[0];
            const selectedSource = this.map.getSource(this.towerSelectedSourceId);
            if (selectedSource.type === 'geojson') {
                selectedSource.setData({
                    type: 'FeatureCollection',
                    features: [feature]
                });
            }
        }
    }

    show(): void {
        this.map.addSource(this.towerSourceId, {
            type: 'vector',
            url: `${this.sourceUrl}?optimize=true`
        });
        this.map.addLayer({
            id: this.towerLayerId,
            source: this.towerSourceId,
            'source-layer': this.sourceLayer,
            type: 'symbol',
            layout: {
                'icon-image': [
                    'step',
                    ['zoom'],
                    [
                        'match',
                        ['get', 'status_code'],
                        ['G', 'C'],
                        'tower-pin-simple-good',
                        'tower-pin-simple-bad'
                    ],
                    TOWER_ZOOM_THRESHOLD,
                    ['match', ['get', 'status_code'], ['G', 'C'], 'tower-pin-good', 'tower-pin-bad']
                ],
                'icon-allow-overlap': ['step', ['zoom'], false, TOWER_ZOOM_THRESHOLD, true],
                // @ts-ignore
                'icon-ignore-placement': ['step', ['zoom'], false, TOWER_ZOOM_THRESHOLD, true],
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
                'text-ignore-placement': ['step', ['zoom'], false, TOWER_ZOOM_THRESHOLD, true],
                'text-anchor': 'bottom',
                'text-font': ['Roboto Mono Bold', 'Arial Unicode MS Regular'],
                'text-size': 14,
                'text-letter-spacing': -0.03,
                'text-justify': 'right',
                'text-offset': [0.5, -0.82]
            },
            paint: {
                'text-color': ['step', ['zoom'], 'transparent', TOWER_ZOOM_THRESHOLD, 'white']
            }
        });

        this.map.addSource(this.towerSelectedSourceId, {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });
        this.map.addLayer({
            id: this.towerSelectedLayerId,
            source: this.towerSelectedSourceId,
            type: 'symbol',
            layout: {
                'icon-image': [
                    'step',
                    ['zoom'],
                    [
                        'match',
                        ['get', 'status_code'],
                        ['G', 'C'],
                        'tower-pin-selected-simple-good',
                        'tower-pin-selected-simple-bad'
                    ],
                    TOWER_ZOOM_THRESHOLD,
                    [
                        'match',
                        ['get', 'status_code'],
                        ['G', 'C'],
                        'tower-pin-selected-good',
                        'tower-pin-selected-bad'
                    ]
                ],
                'icon-allow-overlap': ['step', ['zoom'], false, TOWER_ZOOM_THRESHOLD, true],
                // @ts-ignore
                'icon-ignore-placement': ['step', ['zoom'], false, TOWER_ZOOM_THRESHOLD, true],
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
                'text-ignore-placement': ['step', ['zoom'], false, TOWER_ZOOM_THRESHOLD, true],
                'text-anchor': 'bottom',
                'text-font': ['Roboto Mono Bold', 'Arial Unicode MS Regular'],
                'text-size': 14,
                'text-letter-spacing': -0.03,
                'text-justify': 'right',
                'text-offset': [0.5, -0.82]
            },
            paint: {
                'text-color': ['step', ['zoom'], 'transparent', TOWER_ZOOM_THRESHOLD, 'white']
            }
        });

        this.map.on('click', this.towerLayerId, this.boundUnselectedMouseClickCallback);
        this.map.on('click', this.towerSelectedLayerId, this.boundSelectedMouseClickCallback);
    }

    remove(): void {
        this.map.getLayer(this.towerLayerId) && this.map.removeLayer(this.towerLayerId);
        this.map.getLayer(this.towerSelectedLayerId) &&
            this.map.removeLayer(this.towerSelectedLayerId);
        this.map.getSource(this.towerSourceId) && this.map.removeSource(this.towerSourceId);
        this.map.getSource(this.towerSelectedSourceId) &&
            this.map.removeSource(this.towerSelectedSourceId);

        this.map.off('click', this.towerLayerId, this.boundUnselectedMouseClickCallback);
        this.map.on('click', this.towerSelectedLayerId, this.boundUnselectedMouseClickCallback);
    }
}
