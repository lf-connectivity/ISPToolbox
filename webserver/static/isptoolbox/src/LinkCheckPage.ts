// Create new mapbox Map
import * as MapboxGL from "mapbox-gl";

import { createLinkChart } from './link_profile.js';
import LOSCheckWS from './LOSCheckWS';
import { createLinkProfile, findOverlaps, findLidarObstructions, km2miles, m2ft, ft2m, calculateMaximumFresnelRadius } from './LinkCalcUtils';
import { updateObstructionsData } from './LinkObstructions';
import {
    createHoverPoint, createOrbitAnimationPath, createLinkGeometry,
    calcLinkLength, generateClippingVolume, createTrackShappedOrbitPath,
    createHoverVoume
} from './LinkOrbitAnimation';
import { LinkMode, OverrideSimple, OverrideDirect } from './DrawingModes.js';
import { calculateLookVector } from './HoverMoveLocation3DView';
import LidarAvailabilityLayer from './availabilityOverlay';
import MapboxCustomDeleteControl from './MapboxCustomDeleteControl';
import { LOSCheckMapboxStyles } from './LOSCheckMapboxStyles';
import { LOSWSHandlers } from './LOSCheckWS';
import type { LOSCheckResponse, LinkResponse, TerrainResponse, LidarResponse } from './LOSCheckWS';
import { Potree } from "./Potree.js";

type HighChartsExtremesEvent = {
    min: number | undefined,
    max: number | undefined,
}

let potree = (window as any).Potree as null | typeof Potree;
// @ts-ignore
const THREE = window.THREE;

// @ts-ignore
const MapboxDraw = window.MapboxDraw;
// @ts-ignore
const MapboxGeocoder = window.MapboxGeocoder;
//@ts-ignore
const mapboxgl = window.mapboxgl;

const HOVER_POINT_SOURCE = 'hover-point-link-source';
const HOVER_POINT_LAYER = 'hover-point-link-layer';
const SELECTED_LINK_SOURCE = 'selected-link-source';
const SELECTED_LINK_LAYER = 'selected-link-layer';
const center_freq_values: { [key: string]: number } = {
    '2.4 GHz': 2.437,
    '5 GHz': 5.4925,
    '60 GHz': 64.790,
};
const DEFAULT_LINK_FREQ = center_freq_values['5 GHz'];
const DEFAULT_RADIO_HEIGHT = 60;

const SMALLEST_UPDATE = 1e-5;

export enum UnitSystems {
    US = 'US',
    SI = 'SI',
}

export class LinkCheckPage {
    map: MapboxGL.Map;
    Draw: any;
    selected_feature: any;
    link_chart: any;

    lidarAvailabilityLayer: LidarAvailabilityLayer;

    profileWS: LOSCheckWS;
    currentLinkHash: any;

    currentView: 'map' | '3d';
    units: UnitSystems = UnitSystems.US;
    data_resolution: number;
    _elevation: Array<number>;
    _coords: any;
    _lidar: Array<number>;
    _link_distance: number;
    fresnel_width: number;
    globalLinkAnimation: any;
    animationPlaying: boolean;
    aAbout1: any;
    aAbout2: any;
    spacebarCallback: any;

    clippingVolume: any;
    linkLine: any;
    updateLinkHeight: any;

    tx_loc_lidar: any;
    rx_loc_lidar: any;

    centerFreq: number;
    userRequestIdentity: string;
    networkID: string;
    radio_names: [string, string];

    hover3dDot: any;
    currentMaterial: any;
    selectedFeatureID: string | null;

    datasets: Map<LOSWSHandlers, Array<string>>;

    // variables for handling offsets for hover point volume
    oldCamera: any;
    cameraOffset: any;
    animationWasPlaying: boolean;
    hoverUpdated: boolean;

    constructor(networkID: string, userRequestIdentity: string, radio_names: [string, string]) {
        if (!(window as any).webgl2support) {
            potree = null;
        }
        this.networkID = networkID;
        this.userRequestIdentity = userRequestIdentity;
        this.radio_names = radio_names;
        this.animationPlaying = true;
        this.animationWasPlaying = true;
        this.centerFreq = DEFAULT_LINK_FREQ;
        this.currentView = 'map';
        this.hover3dDot = null;
        this.currentMaterial = null;
        this.fresnel_width = 1.;
        this.selectedFeatureID = null;

        this._elevation = [];
        this._lidar = [];
        this._link_distance = 0;
        //@ts-ignore
        this.units = window.tool_units;

        this.datasets = new Map();

        this.oldCamera = null;
        this.animationWasPlaying = false;
        this.cameraOffset = new THREE.Vector3();

        // Add Resize-Window Callback
        const resize_window = () => {
            const window_height = $(window).height();
            const bottom_row_height = $('#bottom-row-link-view-container').height()
            let height = window_height != null && bottom_row_height != null ? window_height - bottom_row_height : 0;
            height = Math.max(height, 400);
            $('#map').height(height);
            if (this.map != null) {
                this.map.resize();
            }
            $('#3d-view-container').height(height);
            $('#potree_render_area').height(height);
        }
        resize_window();
        $(window).resize(
            resize_window
        );
        // @ts-ignore
        const resizeObserver = new ResizeObserver(() => {
            resize_window();
        });
        resizeObserver.observe(document.querySelector('#bottom-row-link-view-container'));
        // Initialize Bootstrap Tooltips
        // @ts-ignore
        $('[data-toggle="tooltip"]').tooltip({
            template: `<div class="tooltip isptoolbox-tooltip" role="tooltip">
                            <div class="arrow"> 
                            </div>
                            <div class="tooltip-inner isptoolbox-tooltip-inner">
                            </div>
                        </div>`
        });
        // Add Freq Toggle Callback
        $(".freq-dropdown-item").click((event) => {
            $('#freq-dropdown').text($(event.target).text());
            this.centerFreq = center_freq_values[event.target.id];
            $(".freq-dropdown-item").removeClass('active');
            $(this).addClass('active');
            this.Draw.setFeatureProperty(this.selectedFeatureID, 'freq', this.centerFreq);
            this.updateLinkChart(true);
        });

        if (potree) {
            const numNodesLoadingChangedCallback = (num_nodes: number) => {
                if (num_nodes > 0 && this.currentView === '3d') {
                    $('#point-cloud-loading-status').removeClass('d-none');
                } else {
                    $('#point-cloud-loading-status').addClass('d-none');
                }
            }
            potree.numNodesLoadingValue = 0;
            Object.defineProperty(potree, 'numNodesLoading', {
                set: function (x) {
                    numNodesLoadingChangedCallback(x);
                    this.numNodesLoadingValue = x;
                },
                get: function () {
                    return this.numNodesLoadingValue;
                }
            });
        }


        this.link_chart = createLinkChart(
            this.link_chart,
            this.highLightPointOnGround.bind(this),
            this.moveLocation3DView.bind(this),
            this.mouseLeave.bind(this),
            this.setExtremes.bind(this),
        );
        //@ts-ignore
        window.chart = this.link_chart;

        this.profileWS = new LOSCheckWS(
            this.networkID,
            [this.ws_message_handler.bind(this)]
        );

        let initial_map_center = {
            'lon': (this.getCoordinateFromUI('0', 'lng') + this.getCoordinateFromUI('1', 'lng')) / 2.0,
            'lat': (this.getCoordinateFromUI('0', 'lat') + this.getCoordinateFromUI('1', 'lat')) / 2.0
        };
        let initial_zoom = 17;

        try {
            // @ts-ignore
            initial_map_center = window.ISPTOOLBOX_SESSION_INFO.initialMapCenter.coordinates;
            // @ts-ignore
            initial_zoom = window.ISPTOOLBOX_SESSION_INFO.initialMapZoom;
        } catch (err) { }

        this.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/satellite-streets-v11', // stylesheet location
            center: initial_map_center, // starting position [lng, lat]
            zoom: initial_zoom, // starting zoom
            // bounds: [
            //     [
            //         Math.min(this.getCoordinateFromUI('0','lng'), this.getCoordinateFromUI('1','lng')),
            //         Math.min(this.getCoordinateFromUI('0','lat'), this.getCoordinateFromUI('1','lat'))
            //     ],
            //     [
            //         Math.max(this.getCoordinateFromUI('0','lng'), this.getCoordinateFromUI('1','lng')),
            //         Math.max(this.getCoordinateFromUI('0','lat'), this.getCoordinateFromUI('1','lat'))
            //     ]
            // ]
        });

        this.map.on('load', () => {
            var geocoder = new MapboxGeocoder({
                accessToken: mapboxgl.accessToken,
                mapboxgl: mapboxgl,
                placeholder: 'Search for an address'
            });
            document.getElementById('geocoder')?.appendChild(geocoder.onAdd(this.map));

            const tx_lat = parseFloat(String($('#lat-0').val()));
            const tx_lng = parseFloat(String($('#lng-0').val()));
            const rx_lat = parseFloat(String($('#lat-1').val()));
            const rx_lng = parseFloat(String($('#lng-1').val()));

            // Add a modified drawing control       
            this.Draw = new MapboxDraw({
                userProperties: true,
                modes: Object.assign({
                    draw_link: LinkMode(),
                    simple_select: OverrideSimple(),
                    direct_select: OverrideDirect()
                }, MapboxDraw.modes),
                displayControlsDefault: false,
                controls: {
                },
                styles: LOSCheckMapboxStyles
            });

            this.map.addControl(this.Draw, 'bottom-right');
            const deleteControl = new MapboxCustomDeleteControl({
                map: this.map,
                draw: this.Draw,
                deleteCallback: (features) => {
                    this.removeLinkHalo(features);
                    this.clearInputs();
                },
            });

            this.map.addControl(deleteControl, 'bottom-right');
            this.map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');


            // Doesn't play nicely with mapbox draw yet mapboxjs v2.0.1
            // this.map.addSource('mapbox-dem', {
            //     "type": "raster-dem",
            //     "url": "mapbox://mapbox.mapbox-terrain-dem-v1",
            // });
            // this.map.setTerrain({"source": "mapbox-dem"});


            this.map.on('draw.update', this.updateRadioLocation.bind(this));
            this.map.on('draw.create', this.updateRadioLocation.bind(this));
            const features = this.Draw.add({
                "type": 'Feature',
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[tx_lng, tx_lat], [rx_lng, rx_lat]]
                },
                "properties": {
                    "meta": "radio_link",
                    'radio_label_0': 'radio_0',
                    'radio_label_1': 'radio_1',
                    'radio_color': '#00FF00',
                    'radio0hgt': parseFloat(String($('#hgt-0').val())),
                    'radio1hgt': parseFloat(String($('#hgt-1').val())),
                    'freq': DEFAULT_LINK_FREQ,
                }
            });
            this.selectedFeatureID = features.length ? features[0] : null;
            const prioritizeDirectSelect = function ({ features }: any) {
                if (features.length == 1) {
                    this.Draw.changeMode('direct_select', {
                        featureId: features[0].id
                    });
                }
            }
            this.map.on('draw.selectionchange', this.updateRadioLocation.bind(this));
            this.map.on('draw.selectionchange', prioritizeDirectSelect.bind(this));
            this.map.on('draw.selectionchange', this.mouseLeave.bind(this));


            window.addEventListener('keydown', (event) => {
                const featureCollection = this.Draw.getSelected();
                if (event.target === this.map.getCanvas() && (event.key === "Backspace" || event.key === "Delete")) {
                    featureCollection.features.forEach((feat: any) => { this.Draw.delete(feat.id) })
                    this.removeLinkHalo(featureCollection.features);
                }
            });

            this.lidarAvailabilityLayer = new LidarAvailabilityLayer(this.map);

            // Add Data Sources to Help User Understand Map
            this.map.addSource(SELECTED_LINK_SOURCE, {
                'type': 'geojson',
                'data': {
                    'type': 'FeatureCollection',
                    'features': [
                        {
                            'type': 'Feature',
                            'properties': {},
                            'geometry': {
                                "type": "LineString",
                                "coordinates": [[tx_lng, tx_lat], [rx_lng, rx_lat]]
                            },
                        }
                    ]
                }
            });
            // Selected Link Layer
            this.map.addLayer({
                'id': SELECTED_LINK_LAYER,
                'type': 'line',
                'source': SELECTED_LINK_SOURCE,
                'layout': {
                    'line-cap': 'round'
                },
                'paint': {
                    'line-color': '#FFFFFF',
                    'line-width': 7
                }
            }, this.Draw.options.styles[0].id);
            this.map.addSource(HOVER_POINT_SOURCE, {
                'type': 'geojson',
                'data': {
                    'type': 'FeatureCollection',
                    'features': []
                }
            });

            // HOVER POINT MAP LAYERS
            this.map.addLayer({
                'id': `${HOVER_POINT_LAYER}_halo`,
                'type': 'circle',
                'source': HOVER_POINT_SOURCE,
                'paint': {
                    'circle-radius': 7,
                    'circle-color': '#FFFFFF'
                }
            }, this.Draw.options.styles[this.Draw.options.styles.length - 1].id);

            this.map.addLayer({
                'id': HOVER_POINT_LAYER,
                'type': 'circle',
                'source': HOVER_POINT_SOURCE,
                'paint': {
                    'circle-radius': 5,
                    'circle-color': '#3887be'
                }
            }, this.Draw.options.styles[this.Draw.options.styles.length - 1].id);


            this.updateLinkProfile();
            this.link_chart.redraw();


            $('#add-link-btn').click(
                () => { this.Draw.changeMode('draw_line_string'); }
            )

            // Update Callbacks for Radio Heights
            $('#hgt-0').change(
                () => {
                    this.updateLinkChart(true);
                    if (this.selectedFeatureID != null && this.Draw.get(this.selectedFeatureID)) {
                        this.Draw.setFeatureProperty(this.selectedFeatureID, 'radio0hgt', parseFloat(String($('#hgt-0').val())))
                    }
                }
            );
            $('#hgt-1').change(
                () => {
                    this.updateLinkChart(true);
                    if (this.selectedFeatureID != null && this.Draw.get(this.selectedFeatureID)) {
                        this.Draw.setFeatureProperty(this.selectedFeatureID, 'radio1hgt', parseFloat(String($('#hgt-1').val())))
                    }
                }
            );
            const createRadioCoordinateChangeCallback = (id: string, coord1: number, coord2: number) => {
                $(id).change(
                    () => {
                        if (this.selectedFeatureID != null) {
                            const feat = this.Draw.get(this.selectedFeatureID);
                            feat.geometry.coordinates[coord1][coord2] = parseFloat(String($(id).val()))
                            this.Draw.add(feat);
                            const selected_link_source = this.map.getSource(SELECTED_LINK_SOURCE);
                            if (selected_link_source.type === 'geojson') {
                                selected_link_source.setData(feat.geometry);
                            }
                            this.updateLinkProfile();
                        }
                    }
                );
            }
            createRadioCoordinateChangeCallback('#lng-0', 0, 0);
            createRadioCoordinateChangeCallback('#lat-0', 0, 1);
            createRadioCoordinateChangeCallback('#lng-1', 1, 0);
            createRadioCoordinateChangeCallback('#lat-1', 1, 1);


            $('#3D-view-btn').click(() => {
                if (this.currentView === 'map') {
                    $('#3D-view-btn').addClass('btn-primary');
                    $('#3D-view-btn').removeClass('btn-secondary');
                    $('#map-view-btn').addClass('btn-secondary');
                    $('#map-view-btn').removeClass('btn-primary');
                    $('#3d-view-container').removeClass('d-none');
                    $('#map').addClass('d-none');
                    $('#3d-controls').removeClass('d-none');
                    this.currentView = '3d';
                }
            });
            $('#map-view-btn').click(() => {
                if (this.currentView === '3d') {
                    $('#3D-view-btn').addClass('btn-secondary');
                    $('#3D-view-btn').removeClass('btn-primary');
                    $('#map-view-btn').addClass('btn-primary');
                    $('#map-view-btn').removeClass('btn-secondary');
                    $('#3d-view-container').addClass('d-none');
                    $('#map').removeClass('d-none');
                    if (this.map != null) {
                        this.map.resize();
                    }
                    $('#3d-controls').addClass('d-none');
                    this.currentView = 'map';
                }
            });
        });

        // Add an event listener to handle camera updates.
        // @ts-ignore
        window.viewer.addEventListener('update', () => {
            // @ts-ignore
            let camera = window.viewer.scene.getActiveCamera();

            // @ts-ignore
            let target = window.viewer.scene.view.getPivot();

            let newCamera = new THREE.Vector3(
                camera.position.x,
                camera.position.y,
                camera.position.z
            );

            if (!this.animationPlaying && !this.animationWasPlaying && !this.hoverUpdated) {
                // Only update offsets if greater than smallest update, and
                // if animation wasn't playing during the previous update.
                // This to not cause bugs with pausing animation updating the camera.
                if (Math.abs(newCamera.x - this.oldCamera.x) >= SMALLEST_UPDATE) {
                    this.cameraOffset.x += newCamera.x - this.oldCamera.x;
                }
                if (Math.abs(newCamera.y - this.oldCamera.y) >= SMALLEST_UPDATE) {
                    this.cameraOffset.y += newCamera.y - this.oldCamera.y;
                }
                if (Math.abs(newCamera.z - this.oldCamera.z) >= SMALLEST_UPDATE) {
                    this.cameraOffset.z += newCamera.z - this.oldCamera.z;
                }
            }

            this.oldCamera = newCamera;
            this.animationWasPlaying = this.animationPlaying;
            this.hoverUpdated = false;
        });
    };

    removeLinkHalo: (features: Array<MapboxGL.MapboxGeoJSONFeature>) => void = (features) => {
        const contains_selected = features.filter((feat) => { return feat.id === this.selectedFeatureID }).length > 0;
        if (contains_selected) {
            const selected_link_source = this.map.getSource(SELECTED_LINK_SOURCE);
            if (selected_link_source.type === 'geojson') {
                selected_link_source.setData({ type: 'FeatureCollection', 'features': [] });
            }
        }
    }

    updateRadioLocation(update: any) {
        if (update.features.length) {
            const feat = update.features[0];
            this.selectedFeatureID = feat.id;
            if (feat.properties.freq == undefined) {
                this.Draw.setFeatureProperty(this.selectedFeatureID, 'freq', DEFAULT_LINK_FREQ);
            }
            const current_freq = Object.entries(center_freq_values).filter((v) => v[1] === feat.properties.freq);
            if (current_freq.length !== 0) {
                $('#freq-dropdown').text(current_freq[0][0]);
            }
            $('#lng-0').val(feat.geometry.coordinates[0][0].toFixed(5));
            $('#lat-0').val(feat.geometry.coordinates[0][1].toFixed(5));
            $('#lng-1').val(feat.geometry.coordinates[1][0].toFixed(5));
            $('#lat-1').val(feat.geometry.coordinates[1][1].toFixed(5));
            if (feat.properties.radio0hgt == undefined) {
                this.Draw.setFeatureProperty(this.selectedFeatureID, 'radio0hgt', DEFAULT_RADIO_HEIGHT);
            }
            $('#hgt-0').val(feat.properties.radio0hgt);
            if (feat.properties.radio1hgt == undefined) {
                this.Draw.setFeatureProperty(this.selectedFeatureID, 'radio1hgt', DEFAULT_RADIO_HEIGHT);
            }
            $('#hgt-1').val(feat.properties.radio1hgt);
            const selected_link_source = this.map.getSource(SELECTED_LINK_SOURCE);
            if (selected_link_source.type === 'geojson') {
                selected_link_source.setData(feat.geometry);
            }
            this.updateLinkProfile();
        }
    };

    highLightPointOnGround({ x, y }: { x: number, y: number }) {
        const integer_X = Math.round(x);
        if (this._coords !== null && integer_X < this._coords.length && integer_X >= 0) {
            const new_data = {
                'type': 'Point',
                'coordinates': [this._coords[integer_X].lng, this._coords[integer_X].lat]
            };
            const source = this.map.getSource(HOVER_POINT_SOURCE);
            if (source.type === 'geojson') {
                // @ts-ignore
                source.setData(new_data);
            }
        }
    };

    moveLocation3DView({ x, y }: { x: number, y: number }) {
        try {
            const tx_h = this.getRadioHeightFromUI('0') + this._elevation[0];
            const rx_h = this.getRadioHeightFromUI('1') + this._elevation[this._elevation.length - 1];
            const pos = x / this._elevation.length;
            const { location, lookAt } = calculateLookVector(this.tx_loc_lidar, tx_h, this.rx_loc_lidar, rx_h, pos);

            // Factor in camera offset
            location[0] += this.cameraOffset.x;
            location[1] += this.cameraOffset.y;
            location[2] += this.cameraOffset.z;

            // Stop Current Animation
            if (this.currentView === '3d') {
                if (this.globalLinkAnimation != null) {
                    this.globalLinkAnimation.pause();
                    $('#pause-button-3d').addClass('d-none');
                    $('#play-button-3d').removeClass('d-none');
                    this.animationPlaying = false;
                }
                // @ts-ignore
                const scene = window.viewer.scene;

                // Update to scene is caused by location3d view update.
                this.hoverUpdated = true;

                // Move Camera to Location
                scene.view.position.set(location[0], location[1], location[2]);
                // Point Camera at Link plus target offset
                //@ts-ignore
                scene.view.lookAt(new THREE.Vector3(lookAt[0], lookAt[1],lookAt[2]));
            }
            // @ts-ignore
            let scene = window.viewer.scene;
            // Add LOS Link Line
            if (this.hover3dDot !== null) {
                scene.scene.remove(this.hover3dDot);
            }

            this.hover3dDot = createHoverPoint(lookAt, [this.tx_loc_lidar[0], this.tx_loc_lidar[1], tx_h]);
            scene.scene.add(this.hover3dDot);
        } catch (err) {
        }
    };


    getRadioLocations() {
        const tx_lat = parseFloat(String($('#lat-0').val()));
        const tx_lng = parseFloat(String($('#lng-0').val()));
        const rx_lat = parseFloat(String($('#lat-1').val()));
        const rx_lng = parseFloat(String($('#lng-1').val()));
        const query_params: {
            tx: [number, number],
            rx: [number, number],
            id: string
        } = { tx: [tx_lng, tx_lat], rx: [rx_lng, rx_lat], id: this.userRequestIdentity };
        return query_params;
    }

    // Overlay
    updateLinkProfile() {
        const query_params = this.getRadioLocations();

        // @ts-ignore
        const query = new URLSearchParams(query_params).toString();
        if (this.selected_feature === query) {
            return;
        } else {
            this.selected_feature = query;
        }
        this.link_chart.showLoading();
        console.trace();
        $("#loading_spinner").removeClass('d-none');
        $('#los-chart-tooltip-button').addClass('d-none');
        $('#loading_failed_spinner').addClass('d-none');
        $("#drawing_instructions").addClass('d-none');
        $("#link_chart").addClass('d-none');

        // Create Callback Function for WebSocket
        // Use Websocket for request:
        $("#3D-view-btn").addClass('d-none');
        this.profileWS.sendRequest(
            query_params.tx,
            query_params.rx,
            this.userRequestIdentity,
            this.centerFreq
        );
        this._elevation = [];
        this._lidar = [];
        this._link_distance = 0;
    }

    zoomUpdateLinkProfile(aoi: [number, number]) {
        const query_params = this.getRadioLocations();
        this.profileWS.sendRequest(
            query_params.tx,
            query_params.rx,
            this.userRequestIdentity,
            this.centerFreq,
            aoi
        );
    }

    mouseLeave() {
        const source = this.map.getSource(HOVER_POINT_SOURCE);
        if (source.type === 'geojson') {
            // @ts-ignore
            source.setData({ 'type': "FeatureCollection", "features": [] });
        }
        // @ts-ignore
        let scene = window.viewer.scene;
        // Add LOS Link Line
        if (this.hover3dDot !== null) {
            scene.scene.remove(this.hover3dDot);
        }
        this.hover3dDot = null;
    }

    renderNewLinkProfile() {
        // Check if we can update the chart
        if (this.link_chart != null) {
            if (this._elevation.length > 1 && this._lidar.length > 1) {
                const tx_h = this.getRadioHeightFromUI('0') + this._elevation[0];
                const rx_h = this.getRadioHeightFromUI('1') + this._elevation[this._elevation.length - 1];
                this.link_chart.yAxis[0].update({
                    min: Math.min(...[...this._lidar, tx_h, rx_h]),
                    max: Math.max(...[...this._lidar, tx_h, rx_h])
                });
            } else if (this._elevation.length > 1) {
                this.link_chart.yAxis[0].update({ min: Math.min(...this._elevation) });
            }
        }
    };

    /**
     * Updates link chart for LOS based on new elevation profile and tx/rx height
     */
    updateLinkChart(update3DView = false) {
        if (this._elevation.length > 0 && this._link_distance) {
            const { los, fresnel } = createLinkProfile(
                this._elevation,
                this.getRadioHeightFromUI('0'),
                this.getRadioHeightFromUI('1'),
                this._link_distance / this._elevation.length,
                this.centerFreq
            );
            this.link_chart.series[2].setData(los);
            this.link_chart.series[3].setData(fresnel);
            this.fresnel_width = Math.max(...fresnel.map((x) => x[2] - x[1]));
            if (this._lidar != null) {
                const overlaps = findLidarObstructions(fresnel, this._lidar);
                updateObstructionsData(overlaps);
                this.link_chart.xAxis[0].removePlotBand();
                overlaps.forEach((x) => {
                    this.link_chart.xAxis[0].addPlotBand({
                        from: x[0],
                        to: x[1],
                        color: 'rgba(242, 62, 62, 0.2)'
                    });
                })
            }
        }
        if (this._elevation != null && this.updateLinkHeight != null && update3DView) {
            const tx_hgt = this.getRadioHeightFromUI('0') + this._elevation[0];
            const rx_hgt = this.getRadioHeightFromUI('1') + this._elevation[this._elevation.length - 1];
            this.updateLinkHeight(tx_hgt, rx_hgt, !update3DView);
            if (this._lidar != null) {
                this.link_chart.yAxis[0].update({
                    min: Math.min(...[...this._lidar, tx_hgt, rx_hgt]),
                    max: Math.max(...[...this._lidar, tx_hgt, rx_hgt])
                });
            }
        }
    }

    /**
     * User adjusted chart limits - query BE for zoomed section
     */
    setExtremes(event: HighChartsExtremesEvent) {
        this.link_chart.showLoading();
        let extremes: [number, number] = [0, 1];
        if (event.min !== undefined && event.max !== undefined) {
            extremes = [event.min / this._elevation.length, event.max / this._elevation.length];
        }
        this.zoomUpdateLinkProfile(extremes);
    }

    createAnimationForLink(tx: any, rx: any, tx_h: any, rx_h: any, start_animation: boolean) {
        $('#3d-pause-play').off('click');
        if (this.globalLinkAnimation != null) {
            window.removeEventListener('keydown', this.spacebarCallback);
            this.globalLinkAnimation.pause();
            $('#pause-button-3d').addClass('d-none');
            $('#play-button-3d').removeClass('d-none');
            this.animationPlaying = false;
            this.globalLinkAnimation = null;
        }
        if (potree) {
            if (this.aAbout1 == null) {
                this.aAbout1 = new potree.Annotation({
                    position: [tx[0], tx[1], tx_h + 10],
                    title: this.radio_names[0],
                });
                // @ts-ignore
                window.viewer.scene.annotations.add(this.aAbout1);
            } else {
                this.aAbout1.position.set(tx[0], tx[1], tx_h + 10);
            }
            if (this.aAbout2 == null) {
                this.aAbout2 = new potree.Annotation({
                    position: [rx[0], rx[1], rx_h + 10],
                    title: this.radio_names[1]
                });
                // @ts-ignore
                window.viewer.scene.annotations.add(this.aAbout2);
            } else {
                this.aAbout2.position.set(rx[0], rx[1], rx_h + 10);
            }

            this.globalLinkAnimation = new potree.CameraAnimation(
                (window as any).viewer
            );

            const { targets, positions } = createTrackShappedOrbitPath(tx, tx_h, rx, rx_h, 50.0, 50.0);

            for (let i = 0; i < positions.length; i++) {
                const cp = this.globalLinkAnimation.createControlPoint();
                cp.position.set(...positions[i]);
                cp.target.set(...targets[i]);
            }
            const link_len = calcLinkLength(tx, rx, tx_h, rx_h);
            const desired_animation_speed = 50; // meters per second 
            const min_animation_duration = 20;
            const animationDuration = Math.max((link_len * 2 / desired_animation_speed), min_animation_duration);
            // @ts-ignore
            window.viewer.scene.addCameraAnimation(this.globalLinkAnimation);
            this.globalLinkAnimation.setDuration(animationDuration);
            this.globalLinkAnimation.setVisible(false);
            if (start_animation) {
                this.animationPlaying = true;
                this.globalLinkAnimation.play(true);
            } else {
                this.animationPlaying = false;
            }
            const animationClickCallback = () => {
                if (this.animationPlaying) {
                    this.globalLinkAnimation.pause();
                    $('#pause-button-3d').addClass('d-none');
                    $('#play-button-3d').removeClass('d-none');
                } else {
                    this.globalLinkAnimation.play(true);
                    $('#pause-button-3d').removeClass('d-none');
                    $('#play-button-3d').addClass('d-none');
                }
                this.animationPlaying = !this.animationPlaying;
            };
            this.spacebarCallback = (event: any) => {
                var key = event.which || event.keyCode;
                if (key === 32 && this.currentView === '3d') {
                    event.preventDefault();
                    animationClickCallback();
                }
            };
            window.addEventListener('keydown', this.spacebarCallback);
            $('#3d-pause-play').click(animationClickCallback);
        }
    }


    addLink(tx: any, rx: any, tx_h: any, rx_h: any) {
        this.updateLinkHeight = (tx_h: any, rx_h: any, start_animation: boolean = false) => {
            // @ts-ignore
            let scene = window.viewer.scene;
            // Add LOS Link Line
            if (this.linkLine !== null) {
                scene.scene.remove(this.linkLine);
            }

            const fresnel_width_m = calculateMaximumFresnelRadius(this._link_distance, this.centerFreq);
            this.linkLine = createLinkGeometry(tx, rx, tx_h, rx_h, fresnel_width_m);
            scene.scene.add(this.linkLine);
            this.createAnimationForLink(tx, rx, tx_h, rx_h, start_animation);
        }
        this.updateLinkHeight(tx_h, rx_h, true);
    }



    updateLidarRender(name: Array<string>, urls: Array<string>, bb: Array<number>, tx: any, rx: any, tx_h: any, rx_h: any) {
        this.tx_loc_lidar = tx;
        this.rx_loc_lidar = rx;
        const setClippingVolume = (bb: Array<number>) => {
            if (potree) {
                // @ts-ignore
                let scene = window.viewer.scene;
                let { position, scale, camera } = generateClippingVolume(bb);
                { // VOLUME visible
                    if (this.clippingVolume !== null) {
                        scene.removeVolume(this.clippingVolume);
                    }
                    this.clippingVolume = new potree.BoxVolume();
                    this.clippingVolume.name = "Visible Clipping Volume";
                    this.clippingVolume.scale.set(scale[0], scale[1], scale[2]);
                    this.clippingVolume.position.set(position[0], position[1], position[2]);
                    this.clippingVolume.lookAt(new THREE.Vector3(tx[0], tx[1], position[2]));
                    this.clippingVolume.clip = true;
                    scene.addVolume(this.clippingVolume);
                    this.clippingVolume.visible = false;

                }
                scene.view.position.set(camera[0], camera[1], camera[2]);
                scene.view.lookAt(new THREE.Vector3(position[0], position[1], 0));
                // @ts-ignore
                window.viewer.setClipTask(potree.ClipTask.SHOW_INSIDE);
            }
        }
        // Check if we already added point cloud
        urls.forEach((url: string, idx: number) => {
            //@ts-ignore
            const existing_pc_names: Array<string> = window.viewer.scene.pointclouds.map((cld) => { return cld.name });
            if (!existing_pc_names.includes(name[idx]) && potree) {
                potree.loadPointCloud(url, name[idx], (e: any) => {
                    // @ts-ignore
                    let scene = window.viewer.scene;
                    scene.addPointCloud(e.pointcloud);

                    this.currentMaterial = e.pointcloud.material;
                    this.currentMaterial.size = 4;
                    if (potree) {
                        this.currentMaterial.pointSizeType = potree.PointSizeType.FIXED;
                        this.currentMaterial.shape = potree.PointShape.CIRCLE;
                    }
                    this.currentMaterial.activeAttributeName = "elevation";
                    this.currentMaterial.elevationRange = [bb[4], bb[5]];
                });
            }
        });
        setClippingVolume(bb);
        this.addLink(tx, rx, tx_h, rx_h);
    }

    updateLegend() {
        $("#los-chart-tooltip-button").removeClass('d-none')
        const sources: Array<string> = [];
        this.datasets.forEach((l, k) => { if (l instanceof Array) { l.forEach(v => { sources.push(v); }) } })
        $('#los-chart-tooltip-button').attr(
            "title",
            `<div class="los-chart-legend">
                <h5>Link Profile</h5>
                    <div class='isptoolbox-bullet-line'><span class='isptoolbox-tooltip-colorbox isptoolbox-los' ></span><p class='list-item'>LOS</p></div>
                    <div class='isptoolbox-bullet-line'><span class='isptoolbox-tooltip-colorbox isptoolbox-fresnel' ></span><p class='list-item'>Fresnel</p></div>
                    <div class='isptoolbox-bullet-line'><span class='isptoolbox-tooltip-colorbox isptoolbox-lidar' ></span><p class='list-item'>LiDAR</p></div>
                    <div class='isptoolbox-bullet-line'><span class='isptoolbox-tooltip-colorbox isptoolbox-terrain'></span><p class='list-item'>Terrain</p></div>
                    <div class='isptoolbox-bullet-line'><span class='isptoolbox-tooltip-colorbox isptoolbox-obstruction'></span><p class='list-item'>LOS Obstructions</p></div>
                    ${this.datasets.size ? `
                    <p class='isptoolbox-data-source'>Data Sources: ${sources.join(', ')}</p>` : ''}
            </div>`
            // @ts-ignore
        ).tooltip('_fixTitle');
    }

    setErrorMessage(error_message: string): void {
        $("#link-request-error-description").text(error_message);
        $('#loading_failed_spinner').removeClass('d-none');
        $('#los-chart-tooltip-button').addClass('d-none');
        $("#loading_spinner").addClass('d-none');
        $("#link_chart").addClass('d-none');
    }

    // Websocket Message Callback Handlers
    ws_message_handler(response: LOSCheckResponse): void {
        switch (response.handler) {
            case LOSWSHandlers.LIDAR:
                this.ws_lidar_callback(response);
                break;
            case LOSWSHandlers.TERRAIN:
                this.ws_terrain_callback(response);
                break;
            case LOSWSHandlers.LINK:
                this.ws_link_callback(response);
                break;
            default:
                break;
        }
    }
    ws_terrain_callback(response: TerrainResponse): void {
        if (response.aoi[0] === 0 && response.aoi[1] === 1) {
            this._elevation = response.terrain_profile.map(pt => { return pt.elevation; });
            this._coords = response.terrain_profile.map(
                (pt: any) => { return { lat: pt.lat, lng: pt.lng } }
            );
            this.link_chart.series[0].setData(this._elevation.map((v, idx) => { return [idx, v]; }));

        } else {
            this.link_chart.series[0].setData(response.terrain_profile.map((pt, idx) => {
                return [idx * (response.aoi[1] - response.aoi[0]) + (response.aoi[0] * response.terrain_profile.length), pt.elevation];
            }));
        }

        this.renderNewLinkProfile();
        this.updateLinkChart();

        this.showPlotIfValidState();
        if (response.source != null) {
            this.datasets.set(response.handler, [response.source]);
        }
        this.updateLegend();
    }

    ws_lidar_callback(response: LidarResponse): void {
        if (response.error !== null) {
            this.setErrorMessage(response.error);
            return;
        }

        if (response.aoi[0] === 0 && response.aoi[1] === 1) {
            this._lidar = response.lidar_profile;
            this._link_distance = response.dist;
            this.link_chart.series[1].setData(this._lidar.map((v, idx) => { return [idx, v]; }));
            if (response.error !== null) {
                $("#3D-view-btn").addClass('d-none');
            } else {
                if (this.Draw.get(this.selectedFeatureID)) {
                    $("#3D-view-btn").removeClass('d-none');

                    if (this.currentLinkHash !== response.hash && this._elevation.length > 1) {
                        const tx_hgt = this.getRadioHeightFromUI('0') + this._elevation[0];
                        const rx_hgt = this.getRadioHeightFromUI('1') + this._elevation[this._elevation.length - 1];
                        this.updateLidarRender(
                            response.source,
                            response.url,
                            response.bb,
                            response.tx,
                            response.rx,
                            tx_hgt,
                            rx_hgt
                        );
                        this.currentLinkHash = response.hash;
                    } else {
                        // @ts-ignore
                        const scene = window.viewer.scene;
                        scene.pointclouds.forEach((cld: any) => { cld.material.elevationRange = [response.bb[4], response.bb[5]] });
                    }
                }
            }
        } else {
            this.link_chart.series[1].setData(response.lidar_profile.map((v, idx) => {
                return [idx * (response.aoi[1] - response.aoi[0]) + (response.aoi[0] * response.lidar_profile.length), v];
            }));
        }
        this.data_resolution = response.res;

        this.renderNewLinkProfile();
        this.updateLinkChart();
        this.updateAxes();

        this.showPlotIfValidState();
        if (response.source != null) {
            this.datasets.set(response.handler, response.source);
        }
        this.updateLegend();
    }

    ws_link_callback(response: LinkResponse): void {
        if (response.error !== null) {
            this.selected_feature = null;
            this.setErrorMessage(response.error);
        }
    }

    getRadioHeightFromUI(radio: '0' | '1') {
        const hgt = parseFloat(String($(radio === '0' ? '#hgt-0' : '#hgt-1').val()));
        return this.units === UnitSystems.US ? ft2m(hgt) : hgt;
    }

    getCoordinateFromUI(radio: '0' | '1', coord: 'lat' | 'lng'): number {
        return parseFloat(String($(`#${coord}-${radio}`).val()));
    }

    clearInputs(): void {
        // Clear All Inputs
        $('.radio-card-body').addClass('d-none');
        $('#link-title').addClass('d-none');
        $("#3D-view-btn").addClass('d-none');
        // Instruct User to Select or Draw a Link
        this.selected_feature = null;
        $('#link_chart').addClass('d-none');
        $('#loading_failed_spinner').addClass('d-none');
        $('#los-chart-tooltip-button').addClass('d-none');
        $("#drawing_instructions").removeClass('d-none');
        $("#loading_spinner").addClass('d-none');
    }

    showPlotIfValidState() {
        if (this._lidar.length && this._elevation.length && this.selected_feature) {
            this.link_chart.hideLoading();
            $("#loading_spinner").addClass('d-none');
            $('.radio-card-body').removeClass('d-none');
            $('#link-title').removeClass('d-none');
            $("#los-chart-tooltip-button").removeClass('d-none');
            this.link_chart.redraw();
            $("#link_chart").removeClass('d-none');
            this.updateLegend();
        }
    }

    updateAxes() {
        const scaling_factor = this._link_distance / this._lidar.length;
        this.link_chart.xAxis[0].update({
            labels: {
                formatter: this.units === UnitSystems.US ? function () {
                    return `${km2miles(this.value * scaling_factor / 1000).toFixed(2)}`
                }
                    : function () {
                        return `${(this.value * scaling_factor / 1000).toFixed(1)}`;
                    }
            },
            title: {
                text: `Distance ${this.units === UnitSystems.US ? '[mi]' : '[km]'} - resolution ${this.units === UnitSystems.US ? m2ft(this.data_resolution).toFixed(1) : this.data_resolution
                    } ${this.units === UnitSystems.US ? '[ft]' : '[m]'}`
            }
        });
        this.link_chart.yAxis[0].update({
            labels: {
                formatter: this.units === UnitSystems.US ? function () {
                    return `${m2ft(this.value).toFixed(0)}`
                }
                    : function () {
                        return `${(this.value).toFixed(0)}`;
                    }
            }, title: {
                text:
                    this.units === UnitSystems.US ? 'Elevation [ft]' : 'Elevation [m]'
            }
        });

    }
}