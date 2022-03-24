import MapboxDraw from '@mapbox/mapbox-gl-draw';
import mapboxgl from 'mapbox-gl';
import { ASROverlayPopup } from '../isptoolbox-mapbox-draw/popups/MarketEvaluatorOverlayPopups';
import MarketEvaluatorWS, { MarketEvalWSRequestType } from '../MarketEvaluatorWS';
import { ASREvent, ASREvents, WorkspaceFeatureTypes } from '../workspace/WorkspaceConstants';
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
    popup: ASROverlayPopup;

    selectedTower: any | undefined;
    selectedTowerMapboxId: string | undefined;

    boundMouseEnterCallback: (e: any) => void;
    boundMouseLeaveCallback: (e: any) => void;
    boundSelectedMouseClickCallback: (e: any) => void;
    boundUnselectedMouseClickCallback: (e: any) => void;
    boundPreventDoubleClickZoomCallback: (e: any) => void;

    // needed for layer to work with show/hide layers
    boundDrawCreateCallback: (event: { features: Array<GeoJSON.Feature> }) => void;
    boundDrawDeleteCallback: (event: { features: Array<GeoJSON.Feature> }) => void;

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
        this.popup = ASROverlayPopup.getInstance();

        this.boundMouseEnterCallback = this.mouseEnterCallback.bind(this);
        this.boundMouseLeaveCallback = this.mouseLeaveCallback.bind(this);
        this.boundSelectedMouseClickCallback = this.selectedMouseClickCallback.bind(this);
        this.boundUnselectedMouseClickCallback = this.unselectedMouseClickCallback.bind(this);
        this.boundPreventDoubleClickZoomCallback = this.preventDoubleClickZoomCallback.bind(this);
        this.boundDrawCreateCallback = this.drawCreateCallback.bind(this);
        this.boundDrawDeleteCallback = this.drawDeleteCallback.bind(this);

        PubSub.subscribe(ASREvents.SAVE_ASR_TOWER, this.saveASRTowerCallback.bind(this));
    }

    mouseEnterCallback(e: any) {
        const canvas = this.map.getCanvas();
        if (canvas) {
            canvas.style.cursor = 'pointer';
        }
    }

    mouseLeaveCallback(e: any) {
        const canvas = this.map.getCanvas();
        if (canvas) {
            canvas.style.cursor = '';
        }
    }

    selectedMouseClickCallback(e: any) {
        e.preventDefault();
        if (e.features && e.features.length) {
            let feature = e.features[0];
            this.showPopup(feature);
        }
    }

    unselectedMouseClickCallback(e: any) {
        e.preventDefault();
        if (e.features && e.features.length) {
            let feature = e.features[0];
            let featureId = feature.properties.registration_number;
            let selectedTowerId = this.selectedTower
                ? this.selectedTower.properties.registration_number
                : undefined;
            if (!selectedTowerId || featureId !== selectedTowerId) {
                this.showPopup(feature);
            }
        }
    }

    preventDoubleClickZoomCallback(e: any) {
        e.preventDefault();
    }

    drawCreateCallback(event: { features: Array<GeoJSON.Feature> }) {
        // unhide event handler
        event.features.forEach((feat: any) => {
            if (feat.properties && 'asr_status' in feat.properties) {
                this.selectedTowerMapboxId = feat.id;
            }
        });
    }

    drawDeleteCallback(event: { features: Array<GeoJSON.Feature> }) {
        // manual delete and hide event handler
        event.features.forEach((feat: any) => {
            if (feat.properties && 'asr_status' in feat.properties) {
                this.selectedTowerMapboxId = undefined;
                this.popup.hide();
            }
        });
    }

    saveASRTowerCallback(msg: string, data: ASREvent) {
        // Create tower
        const newAP = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [data.featureProperties.longitude, data.featureProperties.latitude]
            },
            properties: {
                name: `ASR #${data.featureProperties.registration_number}`,
                feature_type: WorkspaceFeatureTypes.AP,
                center: [data.featureProperties.longitude, data.featureProperties.latitude],
                uneditable: true
            }
        };

        this.map.fire('draw.create', { features: [newAP] });
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
        this.map.on('mouseenter', this.towerLayerId, this.boundMouseEnterCallback);
        this.map.on('mouseleave', this.towerLayerId, this.boundMouseLeaveCallback);
        this.map.on('dblclick', this.towerLayerId, this.boundPreventDoubleClickZoomCallback);
        this.map.on(
            'dblclick',
            this.towerSelectedLayerId,
            this.boundPreventDoubleClickZoomCallback
        );
        this.map.on('draw.create', this.boundDrawCreateCallback);
        this.map.on('draw.delete', this.boundDrawDeleteCallback);
    }

    remove(): void {
        this.map.off('click', this.towerLayerId, this.boundUnselectedMouseClickCallback);
        this.map.off('click', this.towerSelectedLayerId, this.boundSelectedMouseClickCallback);
        this.map.off('mouseenter', this.towerLayerId, this.boundMouseEnterCallback);
        this.map.off('mouseleave', this.towerLayerId, this.boundMouseLeaveCallback);
        this.map.off('dblclick', this.towerLayerId, this.boundPreventDoubleClickZoomCallback);
        this.map.off(
            'dblclick',
            this.towerSelectedLayerId,
            this.boundPreventDoubleClickZoomCallback
        );
        this.map.off('draw.create', this.boundDrawCreateCallback);
        this.map.off('draw.delete', this.boundDrawDeleteCallback);

        this.popup.hide();
        MarketEvaluatorWS.getInstance().cancelCurrentRequest(MarketEvalWSRequestType.ASR_VIEWSHED);

        this.map.getLayer(this.towerLayerId) && this.map.removeLayer(this.towerLayerId);
        this.map.getLayer(this.towerSelectedLayerId) &&
            this.map.removeLayer(this.towerSelectedLayerId);
        this.map.getSource(this.towerSourceId) && this.map.removeSource(this.towerSourceId);
        this.map.getSource(this.towerSelectedSourceId) &&
            this.map.removeSource(this.towerSelectedSourceId);
    }

    private showPopup(feature: any) {
        this.popup.hide();
        setTimeout(() => {
            this.popup.setFeature(feature);
            this.popup.setLngLat([feature.properties.longitude, feature.properties.latitude]);
            this.popup.show();
        }, 10);
    }
}
