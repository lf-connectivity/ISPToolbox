import MapboxDraw from '@mapbox/mapbox-gl-draw';
import mapboxgl from 'mapbox-gl';
import { ASROverlayPopup } from '../isptoolbox-mapbox-draw/popups/MarketEvaluatorOverlayPopups';
import { ft2m, miles2km, roundToDecimalPlaces } from '../LinkCalcUtils';
import MarketEvaluatorMapLayerSidebarManager from '../MarketEvaluatorMapLayerSidebarManager';
import MarketEvaluatorWS, {
    ASRViewshedGeojsonResponse,
    MarketEvalWSEvents,
    MarketEvalWSRequestType
} from '../MarketEvaluatorWS';
import { ASREvents, ASRLoadingState, WorkspaceFeatureTypes } from '../workspace/WorkspaceConstants';
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

        PubSub.subscribe(ASREvents.PLOT_LIDAR_COVERAGE, this.plotLidarCoverageCallback.bind(this));
        PubSub.subscribe(
            MarketEvalWSEvents.ASR_CLOUDRF_VIEWSHED_MSG,
            this.viewshedMessageCallback.bind(this)
        );
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

                // need to distinguish between deletion and hiding in map layer
                if (
                    !(
                        feat.properties.uuid in
                        MarketEvaluatorMapLayerSidebarManager.getInstance().hiddenCoverageAreas
                    )
                ) {
                    this.setSelected(undefined);
                }
            }
        });
    }

    plotLidarCoverageCallback(
        msg: string,
        data: { height: number; featureProperties: any; radius: number }
    ) {
        this.removeExistingCoverageArea();

        // Set selected tower
        this.setSelected({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [data.featureProperties.longitude, data.featureProperties.latitude]
            },
            properties: {
                ...data.featureProperties,
                tower_height_ft: data.height,
                tower_radius_miles: data.radius,
                loading_state: ASRLoadingState.LOADING_COVERAGE
            }
        });

        // Send request to websocket
        let height = roundToDecimalPlaces(ft2m(data.height), 2);
        let radius = roundToDecimalPlaces(miles2km(data.radius), 2);
        let [lat, lng] = [data.featureProperties.latitude, data.featureProperties.longitude];
        MarketEvaluatorWS.getInstance().sendASRViewshedRequest(
            height,
            lat,
            lng,
            radius,
            data.featureProperties.registration_number
        );
    }

    viewshedMessageCallback(msg: string, response: ASRViewshedGeojsonResponse) {
        let towerId = response.registrationNumber;
        if (
            response.error === 0 &&
            towerId === this.selectedTower?.properties.registration_number
        ) {
            const asrStatus = ['C', 'G'].includes(this.selectedTower?.properties.status_code)
                ? 'good'
                : 'bad';

            // disregard the non-polygons in the response coverage
            let multipolygonCoords: Array<[number, number]> = [];
            response.coverage.geometries.forEach((geom: any) => {
                if (geom.type === 'Polygon') {
                    multipolygonCoords.push(geom.coordinates);
                }
            });

            const newFeature = {
                type: 'Feature',
                geometry: {
                    type: 'MultiPolygon',
                    coordinates: multipolygonCoords
                },
                properties: {
                    uneditable: true,
                    name: 'ASR Tower Coverage',
                    feature_type: WorkspaceFeatureTypes.COVERAGE_AREA,
                    asr_status: asrStatus
                },
                id: ''
            };

            // @ts-ignore
            this.selectedTowerMapboxId = this.draw.add(newFeature)[0];
            newFeature.id = this.selectedTowerMapboxId;
            this.map.fire('draw.create', { features: [newFeature] });
            this.draw.changeMode('simple_select', { featureIds: [this.selectedTowerMapboxId] });
            this.map.fire('draw.selectionchange', { features: [newFeature] });

            this.selectedTower.properties.loading_state = ASRLoadingState.LOADED_COVERAGE;
            this.setSelected(this.selectedTower);
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
        this.setSelected(undefined);
        this.removeExistingCoverageArea();
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

    private removeExistingCoverageArea() {
        if (this.selectedTowerMapboxId) {
            const deletedFeature = this.draw.get(this.selectedTowerMapboxId);
            if (deletedFeature) {
                this.draw.delete(this.selectedTowerMapboxId);
                this.map.fire('draw.delete', { features: [deletedFeature] });
            }
            this.selectedTowerMapboxId = undefined;
        }
    }

    private setSelected(feature: any) {
        this.selectedTower = feature;
        const sourceTower = this.selectedTower || {};
        const selectedSource = this.map.getSource(this.towerSelectedSourceId);
        if (selectedSource.type === 'geojson') {
            selectedSource.setData({
                type: 'FeatureCollection',
                features: [sourceTower]
            });
        }
    }
}
