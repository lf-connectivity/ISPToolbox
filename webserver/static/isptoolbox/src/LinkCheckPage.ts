// Create new mapbox Map
import * as MapboxGL from "mapbox-gl";
import { MapboxSDKClient } from './MapboxSDKClient.js';
import { createLinkChart } from './link_profile.js';
import LOSCheckWS from './LOSCheckWS';
import { createLinkProfile, findLidarObstructions, km2miles, m2ft, ft2m, calculateMaximumFresnelRadius } from './LinkCalcUtils';
import { LinkStatus } from './LinkObstructions';
import {
    createHoverPoint, createLinkGeometry,
    calcLinkLength, generateClippingVolume, createTrackShappedOrbitPath,calculateCameraOffsetFromAnimation, updateControlPoints
} from './LinkOrbitAnimation';
import { calculateLookVector, calculateLinkProfileFresnelPosition } from './HoverMoveLocation3DView';
import { LinkMode, OverrideDirect, OverrideSimple, RadiusMode, RadiusDrawStyle, CPEDrawMode, combineStyles, load_custom_icons} from './isptoolbox-mapbox-draw/index';
import LidarAvailabilityLayer from './availabilityOverlay';
import MapboxCustomDeleteControl from './MapboxCustomDeleteControl';
import { LOSCheckMapboxStyles} from './LOSCheckMapboxStyles';
import { LOSWSHandlers } from './LOSCheckWS';
import type { LOSCheckResponse, LinkResponse, TerrainResponse, LidarResponse } from './LOSCheckWS';
import { Potree } from "./Potree.js";
import { hasCookie } from "./PageUtils";
import {getInitialFeatures} from './utils/MapDefaults';
import {isUnitsUS, setCenterZoomPreferences} from './utils/MapPreferences';
import PubSub from 'pubsub-js';
import MapboxDraw from "@mapbox/mapbox-gl-draw";
//@ts-ignore
import styles from "@mapbox/mapbox-gl-draw/src/lib/theme";
import { WorkspaceManager } from './workspace/WorkspaceManager';
import { WorkspaceEvents, WorkspaceFeatureTypes } from './workspace/WorkspaceConstants';
import { isBeta, validateHeight, validateLat, validateLng } from './LinkCheckUtils';
import { LinkCheckCPEClickCustomerConnectPopup, LinkCheckCustomerConnectPopup, LinkCheckVertexClickCustomerConnectPopup } from './isptoolbox-mapbox-draw/popups/LinkCheckCustomerConnectPopup';
import { LinkCheckTowerPopup } from "./isptoolbox-mapbox-draw/popups/LinkCheckTowerPopup";
import {LinkProfileView, LinkProfileDisplayOption } from "./organisms/LinkProfileView";
import { LinkCheckLocationSearchTool } from "./organisms/LinkCheckLocationSearchTool";
import { LinkCheckBasePopup } from "./isptoolbox-mapbox-draw/popups/LinkCheckBasePopup";
var _ = require('lodash');

export enum LinkCheckEvents {
    SET_INPUTS = 'link.set_inputs',
    CLEAR_INPUTS = 'link.clear_inputs',
    SHOW_INPUTS = 'link.show_inputs',
}

type HighChartsExtremesEvent = {
    min: number | undefined,
    max: number | undefined,
}

let potree = (window as any).Potree as null | typeof Potree;
// @ts-ignore
const THREE = window.THREE;

const mapbox_draw_lib = window.MapboxDraw;

//@ts-ignore
const mapboxdrawstyles = combineStyles(combineStyles(styles, LOSCheckMapboxStyles), RadiusDrawStyle);
// @ts-ignore
const MapboxGeocoder = window.MapboxGeocoder;
//@ts-ignore
const mapboxgl = window.mapboxgl;

const HOVER_POINT_SOURCE = 'hover-point-link-source';
const HOVER_POINT_LAYER = 'hover-point-link-layer';
const SELECTED_LINK_SOURCE = 'selected-link-source';
const SELECTED_LINK_LAYER = 'selected-link-layer';
const LOWEST_LAYER_SOURCE = 'lowest_layer_source';
export const LOWEST_LAYER_LAYER = 'lowest_layer_layer';

const center_freq_values: { [key: string]: number } = {
    '2.4 GHz': 2.437,
    // https://www.fcc.gov/35-ghz-band-overview
    '3.65 GHz': 3.6,
    '5 GHz': 5.4925,
    // https://ecfsapi.fcc.gov/file/6519416904.pdf
    '11 GHz': 11.2,
    // https://www.fcc.gov/document/rechannelization-177-197-ghz-frequency-bands-fixed-microwave
    '18 GHz': 18.7,
    // https://www.fcc.gov/auction/102/factsheet
    '24 GHz': 24.35,
    '60 GHz': 64.790,
};

const center_freq_values_reverse: Map<number, string> = new Map();
Object.keys(center_freq_values).forEach((k: string) => {
    center_freq_values_reverse.set(center_freq_values[k], k);
})

const DEFAULT_LINK_FREQ = center_freq_values['5 GHz'];
const DEFAULT_RADIO_HEIGHT = 60;
const DEFAULT_RADIO_0_NAME = 'radio_0';
const DEFAULT_RADIO_1_NAME = 'radio_1';

const SMALLEST_UPDATE = 1e-5;
const LEFT_NAVIGATION_KEYS = ['ArrowLeft', 'Left', 'A', 'a'];
const RIGHT_NAVIGATION_KEYS = ['ArrowRight', 'Right', 'D', 'd'];

export enum UnitSystems {
    US = 'US',
    SI = 'SI',
}

export class LinkCheckPage {
    map: MapboxGL.Map;
    draw: MapboxDraw;
    selected_feature: any;
    link_chart: any;
    locationMarker: LinkCheckLocationSearchTool;

    lidarAvailabilityLayer: LidarAvailabilityLayer;

    workspaceManager: WorkspaceManager;
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
    linkProfileFresnelPosition: number;
    currentMaterial: any;
    selectedFeatureID: string | null;

    datasets: Map<LOSWSHandlers, Array<string>>;
    link_status : LinkStatus;

    navigationDelta: number;

    profileView: LinkProfileView;

    // variables for handling offsets for hover point volume
    oldCamera: any;
    oldTarget: any;
    cameraOffset: any;
    animationWasPlaying: boolean;
    hoverUpdated: boolean;

    geocoder: typeof MapboxGeocoder;

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
        this.units = window.ISPTOOLBOX_SESSION_INFO.units;

        this.profileView = new LinkProfileView();

        this.datasets = new Map();

        this.linkProfileFresnelPosition = 0;
        this.oldCamera = null;
        this.animationWasPlaying = false;
        this.cameraOffset = new THREE.Vector3();

        // Add Resize-Window Callback
        const resize_window = () => {
            const window_height = $(window).height();
            const bottom_row_height = $('#bottom-row-link-view-container').height()
            const nav_height = $('#workspacenavelem').outerHeight(true);
            let height = (window_height != null && bottom_row_height != null)  ? window_height - bottom_row_height : 0;
            height = nav_height != null ? height - nav_height : height;
            height = Math.max(height, 400);
            $('#map').height(height);
            if (this.map != null) {
                this.map.resize();
            }
            $('#3d-view-container').height(height);
            $('#potree_render_area').height(height);
            
            if(this.link_chart){
                this.link_chart.redraw();
            }
        }
        resize_window();
        $(window).resize(
            resize_window
        );
        // @ts-ignore
        const resizeObserver = new ResizeObserver(() => {
            resize_window();
        });
        const bottom_row =  document.querySelector('#bottom-row-link-view-container');
        if (bottom_row instanceof Element){
            resizeObserver.observe(bottom_row);
        }
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
            if(this.selectedFeatureID){
                if (this.workspaceLinkSelected()) {
                    let link = this.draw.get(this.selectedFeatureID);

                    // @ts-ignore
                    link.properties.frequency = this.centerFreq;

                    // @ts-ignore
                    this.workspaceManager.features[link.properties.uuid].update(link);
                }
                else {
                    this.draw.setFeatureProperty(this.selectedFeatureID, 'freq', this.centerFreq);
                }
            }
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

        this.profileWS = new LOSCheckWS(
            this.networkID,
            [this.ws_message_handler.bind(this)]
        );
        this.link_status = new LinkStatus();


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
        });

        this.map.on('load', () => {
            // When map movement ends save where the user is looking
            setCenterZoomPreferences(this.map);
            load_custom_icons(this.map);

            this.map.addSource(LOWEST_LAYER_SOURCE, {type: 'geojson', data : {type: 'FeatureCollection', features: []}});
            this.map.addLayer({
                'id': LOWEST_LAYER_LAYER,
                'type': 'line',
                'source': LOWEST_LAYER_SOURCE,
                'layout': {
                },
                'paint': {
                }
            });

            const tx_lat = parseFloat(String($('#lat-0').val()));
            const tx_lng = parseFloat(String($('#lng-0').val()));
            const rx_lat = parseFloat(String($('#lat-1').val()));
            const rx_lng = parseFloat(String($('#lng-1').val()));

            // Direct draw override const
            /**
             * Returns a function that reverse geocodes the given lngLat 
             * and displays a popup at that location with the result 
             * of the reverse geocode. Also queries for ptp links (non workspace)
             * that share a vertex, to convert those ptp links to tower/customer
             * 
             * @param state mapbox state
             * @param e event e
             * @returns A function that calls reverseGeocode and displays the popup at the given coordinates.
             */
            const createPopupFromVertexEvent = function (state: any, e: any) {
                return () => {
                    // Find which vertex the user has clicked. Works differently for drag and click vertex.
                    let selectedCoord: number;
                    if (e.featureTarget) {
                        selectedCoord = e.featureTarget.properties.coord_path;
                    }
                    else {
                        // Selected coordinate is the last item in selectedCoordPaths
                        selectedCoord = Number(state.selectedCoordPaths[state.selectedCoordPaths.length - 1])
                    }
                    let vertexLngLat = state.feature.coordinates[selectedCoord];
                    let mapboxClient = MapboxSDKClient.getInstance();
                    mapboxClient.reverseGeocode(vertexLngLat, (response: any) => {
                        let popup =
                            LinkCheckBasePopup.createPopupFromReverseGeocodeResponse(LinkCheckVertexClickCustomerConnectPopup, vertexLngLat, response);
                        popup.setSelectedFeatureId(state.feature.id);
                        popup.setSelectedVertex(selectedCoord);
                        popup.show();
                    });
                }
            }

            // Abort controller used abort showing popup 
            let popupAbortController: any = null;

            // Add a modified drawing control       
            this.draw = new mapbox_draw_lib({
                userProperties: true,
                //@ts-ignore
                modes: {...MapboxDraw.modes,
                    draw_link: LinkMode(),
                    simple_select: OverrideSimple(),
                    direct_select: OverrideDirect({
                        onVertex: (state: any, e: any) => {
                            // If it's a PtP link, open a popup if the user clicks on a vertex. This
                            // is the only way I could think of of implementing this at a granular
                            // sub-feature level.
                            if (isBeta() && !state.feature.properties.radius && !state.dragMoving) {
                                // onVertex is called onMouseDown. We need to wait until mouseup to show the popup
                                // otherwise there will be a race condition with the reverseGeocode callback and the
                                // time when the user releases the mouse.
                                popupAbortController = new AbortController();

                                // @ts-ignore
                                window.addEventListener('mouseup', createPopupFromVertexEvent(state, e), {once: true, signal: popupAbortController.signal});
                            }
                        },
                        dragVertex: (state: any, e: any) => {
                            // Abort and replace popup event listener if we are still dragging.
                            if (popupAbortController !== null && isBeta()) {
                                popupAbortController.abort();
                                popupAbortController = new AbortController();

                                // @ts-ignore
                                window.addEventListener('mouseup', createPopupFromVertexEvent(state, e), {once: true, signal: popupAbortController.signal});
                            }
                            if (!state.feature.properties.radius) {
                                LinkCheckVertexClickCustomerConnectPopup.getInstance().hide();
                            }
                        }
                    }),
                    draw_radius: RadiusMode(),
                    draw_cpe: CPEDrawMode(),
                },
                displayControlsDefault: false,
                controls: {
                },
                styles: mapboxdrawstyles
            });

            this.geocoder = new MapboxGeocoder({
                accessToken: mapboxgl.accessToken,
                mapboxgl: mapboxgl,
                marker: isBeta() ? false : true,
                countries: 'us, pr',
                placeholder: 'Search for an address'
            });

            // Popups
            if (isBeta()) {
                // Long press -> show popup on mobile
                let onLongPress: any = undefined;
                this.map.on('touchstart', (e: any) => {
                    if (onLongPress) {
                        clearTimeout(onLongPress);
                    }
                    onLongPress = setTimeout(() => {
                        let mapboxClient = MapboxSDKClient.getInstance();
                        let lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
                        mapboxClient.reverseGeocode(lngLat, (response: any) => {
                            let popup = LinkCheckBasePopup.createPopupFromReverseGeocodeResponse(LinkCheckCustomerConnectPopup, lngLat, response);
                            popup.show();
                        });
                    }, 1000)
                });

                this.map.on('touchend', (e) => {
                    if (onLongPress) {
                        clearTimeout(onLongPress);
                    }
                });

                this.map.on('touchcancel', (e) => {
                    if (onLongPress) {
                        clearTimeout(onLongPress);
                    }
                });

                this.map.on('touchmove', (e) => {
                    if (onLongPress) {
                        clearTimeout(onLongPress);
                    }
                });
            }

            document.getElementById('geocoder')?.appendChild(this.geocoder.onAdd(this.map));

            this.map.addControl(this.draw, 'bottom-right');
            const deleteControl = new MapboxCustomDeleteControl({
                map: this.map,
                draw: this.draw,
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

            this.workspaceManager = new WorkspaceManager('#accessPointModal', this.map, this.draw, this.profileWS, getInitialFeatures());
            this.locationMarker = new LinkCheckLocationSearchTool(this.map, this.workspaceManager, this.geocoder);

            // instantiate singletons
            new MapboxSDKClient(mapboxgl.accessToken);
            new LinkCheckCustomerConnectPopup(this.map, this.draw, this.locationMarker);
            new LinkCheckVertexClickCustomerConnectPopup(this.map, this.draw, this.locationMarker);
            new LinkCheckCPEClickCustomerConnectPopup(this.map, this.draw, this.locationMarker);
            new LinkCheckTowerPopup(this.map, this.draw);

            const features = this.draw.add({
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
                if (features.length == 1 && features[0].geometry.type !== 'Point') {
                    this.draw.changeMode('direct_select', {
                        featureId: features[0].id
                    });
                    this.map.fire('draw.modechange', {mode:  'direct_select', featureId: features[0].id});
                }
            }
            this.map.on('draw.selectionchange', this.updateRadioLocation.bind(this));
            this.map.on('draw.selectionchange', prioritizeDirectSelect.bind(this));
            this.map.on('draw.selectionchange', this.mouseLeave.bind(this));
            this.map.on('draw.selectionchange', this.showInputs.bind(this));
            this.map.on('draw.delete', this.deleteDrawingCallback.bind(this));
            this.map.on('draw.modechange', this.drawModeChangeCallback.bind(this));
            PubSub.subscribe(WorkspaceEvents.AP_SELECTED, this.showLinkCheckProfile.bind(this));
            PubSub.subscribe(LinkCheckEvents.SET_INPUTS, this.setInputs.bind(this));
            PubSub.subscribe(LinkCheckEvents.CLEAR_INPUTS, this.clearInputs.bind(this));
            PubSub.subscribe(LinkCheckEvents.SHOW_INPUTS, this.showInputs.bind(this));

            window.addEventListener('keydown', (event) => {
                const featureCollection = this.draw.getSelected();
                if (event.target === this.map.getCanvas() && (event.key === "Backspace" || event.key === "Delete")) {
                    featureCollection.features.forEach((feat:any) => {this.draw.delete(feat.id)});
                    this.map.fire('draw.delete', {features: featureCollection.features});
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
            }, LOWEST_LAYER_LAYER);
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
            }, LOWEST_LAYER_LAYER);

            this.map.addLayer({
                'id': HOVER_POINT_LAYER,
                'type': 'circle',
                'source': HOVER_POINT_SOURCE,
                'paint': {
                    'circle-radius': 5,
                    'circle-color': '#3887be'
                }
            }, LOWEST_LAYER_LAYER);


            this.updateLinkProfile();
            this.link_chart.redraw();


            $('#add-link-btn').click(
                () => {
                    //@ts-ignore
                    this.draw.changeMode('draw_link');
                    this.map.fire('draw.modechange', {mode: 'draw_link'}); }
            )
            $('#add-ap-btn').click(
                () => {
                    //@ts-ignore
                    this.draw.changeMode('draw_radius');
                    this.map.fire('draw.modechange', {mode: 'draw_radius'}); }
            )
            $('#add-cpe-btn').click(
                () => {
                    //@ts-ignore
                    this.draw.changeMode('draw_cpe');
                    this.map.fire('draw.modechange', {mode: 'draw_cpe'}); }
            )

            // Update Callbacks for Radio Heights
            $('#hgt-0').change(
                _.debounce((e: any) => {
                    let height = validateHeight(parseFloat(String($('#hgt-0').val())), 'hgt-0');
                    this.updateLinkChart(true);
                    if (this.selectedFeatureID != null && this.draw.get(this.selectedFeatureID)) {
                        if (this.workspaceLinkSelected()) {
                            // @ts-ignore
                            let link = this.draw.get(this.selectedFeatureID);
                            let ap = this.workspaceManager.features[link?.properties?.ap];
                            ap.featureData.properties.height = isUnitsUS() ? ft2m(height) : height;
                            ap.update(ap.featureData, (resp: any) => {
                                this.map.fire('draw.update', {features: [ap.featureData]});
                            });
                        }
                        else {
                            this.draw.setFeatureProperty(this.selectedFeatureID, 'radio0hgt', height)
                        }
                    }
                }, 500)
            );
            $('#hgt-1').change(
                _.debounce((e: any) => {
                    let height = validateHeight(parseFloat(String($('#hgt-1').val())), 'hgt-1');
                    this.updateLinkChart(true);
                    if (this.selectedFeatureID != null && this.draw.get(this.selectedFeatureID)) {
                        if (this.workspaceLinkSelected()) {
                            // @ts-ignore
                            let link = this.draw.get(this.selectedFeatureID);
                            let cpe = this.workspaceManager.features[link?.properties?.cpe];
                            cpe.featureData.properties.height = isUnitsUS() ? ft2m(height) : height;
                            cpe.update(cpe.featureData, (resp: any) => {
                                this.map.fire('draw.update', {features: [cpe.featureData]});
                            });
                        }
                        else {
                            this.draw.setFeatureProperty(this.selectedFeatureID, 'radio1hgt', height)
                        }
                    }
                }, 500)
            );
            const createRadioCoordinateChangeCallback = (id: string, coord1: number, coord2: number, validatorFunction: (n: number, id: string) => number) => {
                let htmlId = `#${id}`;
                $(htmlId).change(
                    _.debounce(() => {
                        if (this.selectedFeatureID != null) {
                            const feat = this.draw.get(this.selectedFeatureID);
                            const newVal = validatorFunction(parseFloat(String($(htmlId).val())), id);
                            if(feat && feat.geometry.type !== 'GeometryCollection' && feat.geometry.coordinates){
                                if (this.workspaceLinkSelected()) {
                                    // @ts-ignore
                                    let point = this.workspaceManager.features[coord1 === 0 ? feat.properties.ap : feat.properties.cpe];

                                    // @ts-ignore
                                    point.featureData.geometry.coordinates[coord2] = newVal;
                                    this.draw.add(point.featureData);
                                    this.map.fire('draw.update', { features: [point.featureData]})
                                }
                                else {
                                    //@ts-ignore
                                    feat.geometry.coordinates[coord1][coord2] = newVal;
                                    this.draw.add(feat);
                                    const selected_link_source = this.map.getSource(SELECTED_LINK_SOURCE);
                                    if (selected_link_source.type === 'geojson') {
                                        //@ts-ignore
                                        selected_link_source.setData(feat.geometry);
                                    }
                                }
                                this.updateLinkProfile();
                            }
                        }
                    }, 500)
                );
            }
            createRadioCoordinateChangeCallback('lng-0', 0, 0, validateLng);
            createRadioCoordinateChangeCallback('lat-0', 0, 1, validateLat);
            createRadioCoordinateChangeCallback('lng-1', 1, 0, validateLng);
            createRadioCoordinateChangeCallback('lat-1', 1, 1, validateLat);


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

                    if (!this.animationPlaying) {
                        this.highlightCurrentPosition(true);
                    }
                    // If they haven't seen the tooltip yet, expand it by default for 30 seconds
                    if (!hasCookie("losHelpSeen")) {
                        // Set cookie so tooltip is closed next time they visit
                        const now = new Date();
                        const exp = now.getTime() + 365*24*60*60*1000;
                        now.setTime(exp);
                        document.cookie = "losHelpSeen=true; Expires=" + now.toUTCString() + '; SameSite=None; Secure; path=/;';
                        // Set the tooltip copy to visible, hide after 10s
                        $('.help-3D-copy').css({"opacity": "1", "visibility": "visible"});
                        setTimeout(() => {
                            $('.help-3D-copy').css({"opacity": "0", "visibility": "hidden"})
                        }, 10000);
                    }
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
                    this.highlightCurrentPosition(false);
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
                camera.position.x - target.x,
                camera.position.y - target.y,
                camera.position.z - target.z
            );

            if (!this.animationPlaying && !this.animationWasPlaying && !this.hoverUpdated) {
                // Only update offsets if greater than smallest update, and
                // if animation wasn't playing during the previous update.
                // This to not cause bugs with pausing animation updating the camera.
                let changed = false;
                let targetDelta = new THREE.Vector3();

                // Updating camera offset when user mouses over link status creates
                // an infinite loop.
                if (!this.hoverUpdated) {
                    if (Math.abs(newCamera.x - this.oldCamera.x) >= SMALLEST_UPDATE) {
                        changed = true;
                        this.cameraOffset.x += newCamera.x - this.oldCamera.x;
                    }
                    if (Math.abs(newCamera.y - this.oldCamera.y) >= SMALLEST_UPDATE) {
                        changed = true;
                        this.cameraOffset.y += newCamera.y - this.oldCamera.y;
                    }
                    if (Math.abs(newCamera.z - this.oldCamera.z) >= SMALLEST_UPDATE) {
                        changed = true;
                        this.cameraOffset.z += newCamera.z - this.oldCamera.z;
                    }
                }
                else if (isBeta()) {
                    // Only update target if it was updated via the hover tool.
                    // Otherwise, things get finnicky. BETA FUNCTIONALITY
                    if (Math.abs(target.x - this.oldTarget.x) >= SMALLEST_UPDATE) {
                        changed = true;
                        targetDelta.x = target.x - this.oldTarget.x;
                    }
                    if (Math.abs(target.y - this.oldTarget.y) >= SMALLEST_UPDATE) {
                        changed = true;
                        targetDelta.y = target.y - this.oldTarget.y;
                    }
                    if (Math.abs(target.z - this.oldTarget.z) >= SMALLEST_UPDATE) {
                        changed = true;
                        targetDelta.z = target.z - this.oldTarget.z;
                    }
                }

                if (changed) {
                    const cameraDelta = new THREE.Vector3(
                        newCamera.x - this.oldCamera.x,
                        newCamera.y - this.oldCamera.y,
                        newCamera.z - this.oldCamera.z
                    );
                    
                    if (isBeta()) {
                        updateControlPoints(this.globalLinkAnimation.controlPoints, cameraDelta, targetDelta);
                    }
                    this.globalLinkAnimation.updatePath();
                }
            }

            if (isBeta() && this.animationPlaying) {
                // Set camera offset to actual camera angle - look vector normal.
                // This is a hack to provide for a smooth transition from animation
                // to hover view.

                if (this.tx_loc_lidar != null && this.rx_loc_lidar != null) {
                    this.cameraOffset = calculateCameraOffsetFromAnimation(
                        camera,
                        target,
                        this.tx_loc_lidar,
                        this.rx_loc_lidar,
                        this.getRadioHeightFromUI('0') + this._elevation[0], //tx_h
                        this.getRadioHeightFromUI('1') + this._elevation[this._elevation.length - 1] //rx_h
                    );

                    this.linkProfileFresnelPosition = calculateLinkProfileFresnelPosition(
                        target,
                        this.tx_loc_lidar,
                        this.rx_loc_lidar,
                        this._elevation.length
                    );
                }
            }

            this.oldCamera = newCamera;
            this.oldTarget = target;
            this.animationWasPlaying = this.animationPlaying;
            this.hoverUpdated = false;
        });

        // Fresnel navigation keyboard event listener
        window.addEventListener('keydown', (event: any) => {
            if (this.currentView === '3d') {
                if (LEFT_NAVIGATION_KEYS.includes(event.key)) {
                    this.highlightCurrentPosition(false);
                    this.linkProfileFresnelPosition -= this.navigationDelta;
                    this.fitFresnelPositionToBounds();
                    this.moveLocation3DView();
                }
                else if (RIGHT_NAVIGATION_KEYS.includes(event.key)) {
                    this.highlightCurrentPosition(false);
                    this.linkProfileFresnelPosition += this.navigationDelta;
                    this.fitFresnelPositionToBounds();
                    this.moveLocation3DView();
                }
            }
        });
    };

    workspaceLinkSelected(): boolean {
        if (this.selectedFeatureID != null && this.draw.get(this.selectedFeatureID)) {
            let feat = this.draw.get(this.selectedFeatureID);
            return feat?.properties?.feature_type && feat?.properties?.feature_type === WorkspaceFeatureTypes.AP_CPE_LINK
        }
        else {
            return false;
        }
    }

    removeLinkHalo: (features: Array<MapboxGL.MapboxGeoJSONFeature>) => void = (features) => {
        const contains_selected = features.filter((feat) => { return feat.id === this.selectedFeatureID }).length > 0;
        if (contains_selected) {
            const selected_link_source = this.map.getSource(SELECTED_LINK_SOURCE);
            if (selected_link_source.type === 'geojson') {
                selected_link_source.setData({ type: 'FeatureCollection', 'features': [] });
            }
        }
    }

    setInputs(msg: string, data : {radio: number, latitude: number, longitude: number, name: string, height: number}){
        $(`#lat-${data.radio}`).val(data.latitude.toFixed(6));
        $(`#lng-${data.radio}`).val(data.longitude.toFixed(6));
        $(`#hgt-${data.radio}`).val(data.height.toFixed(0));
        $(`#radio_name-${data.radio}`).text(data.name);
    }

    showLinkCheckProfile(){
        //@ts-ignore
        $('#data-container').collapse('show');
    }

    updateRadioLocation(update: any) {
        // Filter out empty updates or circle feature updates
        // TODO (achongfb): modularize this into a PTPLink Class and APClass
        if (update.features.length && update.features[0].properties.radius === undefined && update.features[0].geometry.type !== "Point") {

            // Don't pop up the link profile view if it was an AP/customer link that was moved.
            if (!(update.features[0].properties.feature_type === WorkspaceFeatureTypes.AP_CPE_LINK && update.action === 'move')) {
                this.showLinkCheckProfile();
            }
            const feat = update.features[0];
            this.selectedFeatureID = feat.id;

            // Workspace AP-CPE link frequency, heights, and name
            if (feat.properties.feature_type && feat.properties.feature_type === WorkspaceFeatureTypes.AP_CPE_LINK) {
                if (center_freq_values_reverse.has(feat.properties.frequency)) {
                    $('#freq-dropdown').text(center_freq_values_reverse.get(feat.properties.frequency) as string);
                }

                let ap = this.workspaceManager.features[feat.properties.ap];
                let cpe = this.workspaceManager.features[feat.properties.cpe];

                $('#hgt-0').val(
                    Math.round(isUnitsUS() ? ap.featureData.properties?.height_ft : ap.featureData.properties?.height)
                );
                $('#hgt-1').val(
                    Math.round(isUnitsUS() ? cpe.featureData.properties?.height_ft : cpe.featureData.properties?.height)
                );

                $('#radio_name-0').text(ap.featureData.properties?.name);
                $('#radio_name-1').text(cpe.featureData.properties?.name);
                this.radio_names[0] = ap.featureData.properties?.name
                this.radio_names[1] = cpe.featureData.properties?.name
            }
            else {
                if (feat.properties.freq == undefined && this.selectedFeatureID) {
                    this.draw.setFeatureProperty(this.selectedFeatureID, 'freq', DEFAULT_LINK_FREQ);
                }
                if (center_freq_values_reverse.has(feat.properties.freq)) {
                    $('#freq-dropdown').text(center_freq_values_reverse.get(feat.properties.freq) as string);
                }

                let radio0hgt = feat.properties.radio0hgt;
                if (radio0hgt == undefined && this.selectedFeatureID) {
                    radio0hgt = DEFAULT_RADIO_HEIGHT;
                    this.draw.setFeatureProperty(this.selectedFeatureID, 'radio0hgt', radio0hgt);
                }
                $('#hgt-0').val(radio0hgt);
                let radio1hgt = feat.properties.radio1hgt;
                if (feat.properties.radio1hgt == undefined && this.selectedFeatureID) {
                    radio1hgt = DEFAULT_RADIO_HEIGHT;
                    this.draw.setFeatureProperty(this.selectedFeatureID, 'radio1hgt', radio1hgt);
                }
                $('#hgt-1').val(radio1hgt);
                $('#radio_name-0').text(DEFAULT_RADIO_0_NAME);
                $('#radio_name-1').text(DEFAULT_RADIO_1_NAME);
                this.radio_names[0] = DEFAULT_RADIO_0_NAME
                this.radio_names[1] = DEFAULT_RADIO_1_NAME
            }

            
            $('#lng-0').val(feat.geometry.coordinates[0][0].toFixed(5));
            $('#lat-0').val(feat.geometry.coordinates[0][1].toFixed(5));
            $('#lng-1').val(feat.geometry.coordinates[1][0].toFixed(5));
            $('#lat-1').val(feat.geometry.coordinates[1][1].toFixed(5));
            
            const selected_link_source = this.map.getSource(SELECTED_LINK_SOURCE);
            if (selected_link_source.type === 'geojson') {
                selected_link_source.setData(feat.geometry);
            }

            this.updateLinkChart();
            this.updateLinkProfile();
        }
    };

    deleteDrawingCallback({features} : any) {
        this.removeLinkHalo(features);
        PubSub.publish(LinkCheckEvents.CLEAR_INPUTS);
    }

    drawModeChangeCallback({mode} : { mode: string}){
        $('.isp-draw-mode-btn').filter(function(idx) {return $(this).attr('draw_mode') !== mode}).removeClass('btn-primary').addClass('btn-secondary');
        $('.isp-draw-mode-btn').filter(function(idx) {return $(this).attr('draw_mode') === mode}).addClass('btn-primary').removeClass('btn-secondary');
    }

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

    moveLocation3DView({ x, y }: { x: number, y: number } = {x: this.linkProfileFresnelPosition, y: 0}) {
        try {
            const tx_h = this.getRadioHeightFromUI('0') + this._elevation[0];
            const rx_h = this.getRadioHeightFromUI('1') + this._elevation[this._elevation.length - 1];
            const pos = x / this._elevation.length;
            const { location, lookAt } = calculateLookVector(this.tx_loc_lidar, tx_h, this.rx_loc_lidar, rx_h, pos);

            // Factor in camera offset
            location[0] += this.cameraOffset.x;
            location[1] += this.cameraOffset.y;
            location[2] += this.cameraOffset.z;

            // Floating points might happen
            this.linkProfileFresnelPosition = Math.floor(x);
            this.highlightCurrentPosition(true);

            // Stop Current Animation
            if (this.currentView === '3d') {
                if (this.globalLinkAnimation != null) {
                    this.globalLinkAnimation.pause();
                    this.setPlayPauseButton(true);
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

            this.hover3dDot = createHoverPoint(lookAt, [this.tx_loc_lidar[0], this.tx_loc_lidar[1], tx_h], this.isOverlapping());

            scene.scene.add(this.hover3dDot);
        } catch (err) {
        }
    };

    isOverlapping() {
        return this.link_status.obstructions.some(interval => {
            return this.linkProfileFresnelPosition >= interval[0] && 
                   this.linkProfileFresnelPosition <= interval[1];
        });
    };

    getRadioLocations() {
        const tx_lat = parseFloat(String($('#lat-0').val()));
        const tx_lng = parseFloat(String($('#lng-0').val()));
        const rx_lat = parseFloat(String($('#lat-1').val()));
        const rx_lng = parseFloat(String($('#lng-1').val()));
        if([tx_lat, tx_lng, rx_lat, rx_lng].some(Number.isNaN)) {
            return null;
        }
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
        if(query_params !== null) {

        // @ts-ignore
        const query = new URLSearchParams(query_params).toString();
        if (this.selected_feature === query) {
            return;
        } else {
            this.selected_feature = query;
        }
        this.link_chart.showLoading();
        this.showLoading();
        PubSub.publish(LinkCheckEvents.SHOW_INPUTS);

        // Create Callback Function for WebSocket
        // Use Websocket for request:
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
    }

    zoomUpdateLinkProfile(aoi: [number, number]) {
        const query_params = this.getRadioLocations();
        if(query_params !== null) {
        this.profileWS.sendRequest(
            query_params.tx,
            query_params.rx,
            this.userRequestIdentity,
            this.centerFreq,
            aoi
        );
        }
    }

    mouseLeave() {
        const source = this.map.getSource(HOVER_POINT_SOURCE);
        if (source.type === 'geojson') {
            // @ts-ignore
            source.setData({ 'type': "FeatureCollection", "features": [] });
        }
        this.highlightCurrentPosition(true);
    }

    /*
    Toggles whether or not the current x-axis point is highlighted in the link profile chart.
    */
    highlightCurrentPosition(visible: boolean) {
        let state = visible ? 'hover' : undefined;

        // Set the hover state over both the fresnel cone chart
        // and the LOS chart in Highchart.
        if(this.link_chart.series[3].data.length > this.linkProfileFresnelPosition){
            this.link_chart.series[3].data[this.linkProfileFresnelPosition].setState(state);
        }
        if(this.link_chart.series[2].data.length > this.linkProfileFresnelPosition){
            this.link_chart.series[2].data[this.linkProfileFresnelPosition].setState(state);
        }
    }

    hideHover3DDot() {
        // @ts-ignore
        let scene = window.viewer.scene;
        // Add LOS Link Line
        if (this.hover3dDot !== null) {
            scene.scene.remove(this.hover3dDot);
        }
        this.hover3dDot = null;
    };

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
                this.link_status.updateObstructionsData(overlaps);
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
            this.highlightCurrentPosition(false);

            const tx_hgt = this.getRadioHeightFromUI('0') + this._elevation[0];
            const rx_hgt = this.getRadioHeightFromUI('1') + this._elevation[this._elevation.length - 1];
            this.updateLinkHeight(tx_hgt, rx_hgt, !update3DView);            
            if (this._lidar != null) {
                this.link_chart.yAxis[0].update({
                    min: Math.min(...[...this._lidar, tx_hgt, rx_hgt]),
                    max: Math.max(...[...this._lidar, tx_hgt, rx_hgt])
                });
            }

            this.moveLocation3DView();
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

    setPlayPauseButton(pause: boolean){
        if( pause ){
            $('#pause-button-3d').addClass('d-none');
            $('#play-button-3d').removeClass('d-none');
        } else {
            $('#pause-button-3d').removeClass('d-none');
            $('#play-button-3d').addClass('d-none');
        }
    }

    createAnimationForLink(tx: any, rx: any, tx_h: any, rx_h: any, start_animation: boolean) {
        $('#3d-pause-play').off('click');
        if (this.globalLinkAnimation != null) {
            window.removeEventListener('keydown', this.spacebarCallback);
            this.globalLinkAnimation.pause();
            this.setPlayPauseButton(true);
            this.animationPlaying = false;
            this.globalLinkAnimation = null;
        }
        if (potree) {
            if (this.aAbout1 == null) {
                this.aAbout1 = new potree.Annotation({
                    position: [tx[0], tx[1], tx_h + 10],
                    title: this.radio_names[0].substr(0, 15)
                });
                // @ts-ignore
                window.viewer.scene.annotations.add(this.aAbout1);
            } else {
                this.aAbout1.position.set(tx[0], tx[1], tx_h + 10);
                this.aAbout1.title = this.radio_names[0].substr(0, 15);
            }
            if (this.aAbout2 == null) {
                this.aAbout2 = new potree.Annotation({
                    position: [rx[0], rx[1], rx_h + 10],
                    title: this.radio_names[1].substr(0, 15)
                });
                // @ts-ignore
                window.viewer.scene.annotations.add(this.aAbout2);
            } else {
                this.aAbout2.position.set(rx[0], rx[1], rx_h + 10);
                this.aAbout2.title = this.radio_names[1].substr(0, 15);
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
            this.globalLinkAnimation.setInterpolateControlPoints(true);
            if (start_animation) {
                this.animationPlaying = true;
                this.globalLinkAnimation.play(true);
                this.setPlayPauseButton(false);
            } else {
                this.animationPlaying = false;
            }
            const animationClickCallback = () => {
                if (this.animationPlaying) {
                    this.fitFresnelPositionToBounds();
                    this.moveLocation3DView();

                    // funny hack to get last line of code to toggle correctly
                    this.animationPlaying = true;
                } else {
                    this.globalLinkAnimation.play(true);
                    this.setPlayPauseButton(false);

                    // hide dot and link profile highlight when animation plays.
                    this.highlightCurrentPosition(false);
                    this.hideHover3DDot();
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

    /*
    Sets fresnel position to somewhere between the min and max value of x-axis,
    depending on current zoom. Also tries to round fresnel position to prevent
    floating point positions.
    */
    fitFresnelPositionToBounds() {
        // Round bounds to the nearest integer within the bound.
        // Bound min and max by either the zoomed in portion or the overall
        // fresnel cone.
        let xMin = Math.max(Math.ceil(this.link_chart.xAxis[0].min), 0);
        let xMax = Math.min(Math.floor(this.link_chart.xAxis[0].max), this._elevation.length - 1);

        // Round fresnel position first before applying bounds calculations
        this.linkProfileFresnelPosition = Math.round(this.linkProfileFresnelPosition);
        if (this.linkProfileFresnelPosition < xMin) {
            this.linkProfileFresnelPosition = xMin;
        }
        else if (this.linkProfileFresnelPosition > xMax) {
            this.linkProfileFresnelPosition = xMax;
        }
    }

    /*
    Updates how far along the fresnel zone we should go on one keypress event.
    Smaller distances means more units (1 x-axis unit distance is smaller), while
    max distance should mean less units (1 unit is minimum)
    */
    updateNavigationDelta() {
        // Less than 1 mile = 8 units
        if (this._link_distance < 1600) {
            this.navigationDelta = 8;
        }
        else {
            // Minimal delta speed is 1
            this.navigationDelta = Math.max(Math.round(17000 / this._link_distance), 1);
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

    setErrorMessage(error_message: string | null): void {
        if (error_message !== null){
            $("#link-request-error-description").text(error_message);
            this.profileView.render(LinkProfileDisplayOption.LOADING_ERROR);
        } else {
            $("#link-request-error-description").text('');
        }
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
                if (this.selectedFeatureID && this.draw.get(this.selectedFeatureID)) {
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
                    this.updateNavigationDelta();
                }
            }
        } else {
            this.link_chart.series[1].setData(response.lidar_profile.map((v, idx) => {
                return [idx * (response.aoi[1] - response.aoi[0]) + (response.aoi[0] * response.lidar_profile.length), v];
            }));
        }
        this.data_resolution = response.res;
        this.link_status.updateLoadingStatus(response.still_loading);

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
        if(this.draw.getAll().features.length === 0 &&  (!this.selectedFeatureID || !this.draw.get(this.selectedFeatureID))){
            this.profileView.render(LinkProfileDisplayOption.DRAWING_INSTRUCTIONS);
        }
    }

    showInputs(): void {
        if(this.draw.getSelected().features.length > 0){
            $('.radio-card-body').removeClass('d-none');
        }
    }

    showLoading(): void {
        this.profileView.render(LinkProfileDisplayOption.LOADING_CHART);
    }

    showPlotIfValidState() {
        if (
            this._lidar.length && this._elevation.length && this.selected_feature && this.selectedFeatureID &&
            this.draw.get(this.selectedFeatureID) != null) {
            this.link_chart.hideLoading();
            this.profileView.render(LinkProfileDisplayOption.LINK_CHART);
            
            this.link_chart.redraw();
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