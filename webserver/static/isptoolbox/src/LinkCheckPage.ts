// Create new mapbox Map
import * as MapboxGL from 'mapbox-gl';
import { MapboxSDKClient } from './MapboxSDKClient.js';
import { createLinkChart } from './link_profile.js';
import LOSCheckWS from './LOSCheckWS';
import { createLinkProfile, findLidarObstructions, km2miles, m2ft, ft2m } from './LinkCalcUtils';
import { LinkStatus } from './LinkObstructions';
import {
    LinkMode,
    OverrideDirect,
    OverrideSimple,
    CPEDrawMode,
    APDrawMode
} from './isptoolbox-mapbox-draw/index';
import { ISPToolboxTool, LinkCheckEvents } from './workspace/WorkspaceConstants';
import LidarAvailabilityLayer from './availabilityOverlay';
import {
    LOSWSEvents,
    LOSWSHandlers,
    LOSCheckResponse,
    LinkResponse,
    TerrainResponse,
    LidarResponse
} from './workspace/WorkspaceConstants';
import { isUnitsUS } from './utils/MapPreferences';
import PubSub from 'pubsub-js';
import { LOSCheckWorkspaceManager } from './workspace/LOSCheckWorkspaceManager';
import { WorkspaceFeatureTypes } from './workspace/WorkspaceConstants';
import { validateHeight, getUnits, UnitSystems, isBeta } from './LinkCheckUtils';
import {
    LinkCheckCPEClickCustomerConnectPopup,
    LinkCheckCustomerConnectPopup,
    LinkCheckVertexClickCustomerConnectPopup
} from './isptoolbox-mapbox-draw/popups/LinkCheckCustomerConnectPopup';
import { LinkCheckTowerPopup } from './isptoolbox-mapbox-draw/popups/TowerPopups';
import { LinkProfileView, LinkProfileDisplayOption } from './organisms/LinkProfileView';
import { LinkCheckLocationSearchTool } from './organisms/LinkCheckLocationSearchTool';
import { LinkCheckBasePopup } from './isptoolbox-mapbox-draw/popups/LinkCheckBasePopup';
import { parseFormLatitudeLongitude } from './utils/LatLngInputUtils';
import { ISPToolboxAbstractAppPage } from './ISPToolboxAbstractAppPage';
import { LinkCheckRadiusAndBuildingCoverageRenderer } from './organisms/LinkCheckRadiusAndBuildingCoverageRenderer';
import { ViewshedTool } from './organisms/ViewshedTool';
import { MapLayerSidebarManager } from './workspace/MapLayerSidebarManager';
import LOSCheckLinkProfileView from './organisms/LOSCheckLinkProfileView';
import CollapsibleComponent from './atoms/CollapsibleComponent';
import { LiDAR3DView } from './organisms/LiDAR3DView';
import MapboxGeocoder from 'mapbox__mapbox-gl-geocoder';

import { WorkspacePointFeature } from './workspace/WorkspacePointFeature';
import { LinkCheckPTPOverlay, HOVER_POINT_SOURCE } from './LinkCheckPTPOverlay';
import { AjaxTowerPopup } from './isptoolbox-mapbox-draw/popups/AjaxTowerPopup';
import { LinkCheckSectorPopup } from './isptoolbox-mapbox-draw/popups/AjaxSectorPopups';
import {
    AjaxLinkCheckLocationPopup,
    AjaxLinkCheckLocationSwitchSectorPopup
} from './isptoolbox-mapbox-draw/popups/ajax-cpe-flow-popups/AjaxLinkCheckLocationFlowPopups';
import {
    AjaxLinkCheckCPEPopup,
    AjaxLinkCheckCPESwitchSectorPopup
} from './isptoolbox-mapbox-draw/popups/ajax-cpe-flow-popups/AjaxLinkCheckCPEFlowPopups';
import { AccessPoint, isAP } from './workspace/WorkspaceFeatures';
import { AccessPointSector } from './workspace/WorkspaceSectorFeature';
var _ = require('lodash');

type HighChartsExtremesEvent = {
    min: number | undefined;
    max: number | undefined;
};
// @ts-ignore
const THREE = window.THREE;

const SMALLEST_UPDATE = 1e-5;
const LEFT_NAVIGATION_KEYS = ['ArrowLeft', 'Left', 'A', 'a'];
const RIGHT_NAVIGATION_KEYS = ['ArrowRight', 'Right', 'D', 'd'];

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
    '60 GHz': 64.79
};

const center_freq_values_reverse: Map<number, string> = new Map();
Object.keys(center_freq_values).forEach((k: string) => {
    center_freq_values_reverse.set(center_freq_values[k], k);
});

const DEFAULT_LINK_FREQ = center_freq_values['5 GHz'];
const DEFAULT_RADIO_HEIGHT = ft2m(60);
const DEFAULT_RADIO_0_NAME = 'radio_0';
const DEFAULT_RADIO_1_NAME = 'radio_1';

// Abort controller used abort showing popup
let popupAbortController: any = null;

export class LinkCheckPage extends ISPToolboxAbstractAppPage {
    selected_feature: any;
    link_chart: any;
    locationMarker: LinkCheckLocationSearchTool;
    lidarAvailabilityLayer: LidarAvailabilityLayer;
    workspaceManager: LOSCheckWorkspaceManager;
    profileWS: LOSCheckWS;
    currentLinkHash: any;

    lidar3dview: LiDAR3DView | null = null;

    data_resolution: number;
    _coords: any;
    _elevation: Array<number> = [];
    _lidar: Array<number> = [];
    _link_distance: number;
    fresnel_width: number;

    clippingVolume: any;

    tx_loc_lidar: any;
    rx_loc_lidar: any;

    centerFreq: number;
    userRequestIdentity: string;
    networkID: string;
    radio_names: [string, string] = ['ap', 'cpe'];

    hover3dDot: any;
    linkProfileHoverPosition: number;
    selectedFeatureID: string | undefined | null;

    datasets: Map<LOSWSHandlers, Array<string>>;
    link_status: LinkStatus;

    navigationDelta: number;

    profileView: LinkProfileView;

    // variables for handling offsets for hover point volume
    oldCamera: any;
    oldTarget: any;

    geocoder: MapboxGeocoder;

    showVertexDebounce: any;

    constructor(networkID: string, userRequestIdentity: string) {
        super(
            {
                draw_link: LinkMode(),
                simple_select: OverrideSimple(),
                direct_select: OverrideDirect({
                    dragVertex: (state: any, e: any) => {
                        if (!state.feature.properties.radius) {
                            if (this.showVertexDebounce) {
                                this.showVertexDebounce.cancel();
                            }
                            if (isBeta()) {
                                AjaxLinkCheckLocationPopup.getInstance().hide();
                            } else {
                                LinkCheckVertexClickCustomerConnectPopup.getInstance().hide();
                            }
                        }
                    }
                }),
                draw_ap: APDrawMode(),
                draw_cpe: CPEDrawMode()
            },
            'edit_network',
            false
        );
        this.networkID = networkID;
        this.userRequestIdentity = userRequestIdentity;
        this.centerFreq = DEFAULT_LINK_FREQ;
        this.hover3dDot = null;
        this.fresnel_width = 1;
        this.selectedFeatureID = null;

        this._link_distance = 0;

        this.profileView = new LinkProfileView();

        this.datasets = new Map();

        this.linkProfileHoverPosition = 0;
        this.oldCamera = null;

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
        $('.freq-dropdown-item').on('click', (event) => {
            $('#freq-dropdown').text($(event.target).text());
            this.centerFreq = center_freq_values[event.target.id];
            $('.freq-dropdown-item').removeClass('active');
            $(this).addClass('active');
            if (this.selectedFeatureID) {
                if (this.workspaceLinkSelected()) {
                    let link = this.draw.get(this.selectedFeatureID);
                    if (link) {
                        this.draw.setFeatureProperty(
                            this.selectedFeatureID,
                            'frequency',
                            this.centerFreq
                        );
                        link = this.draw.get(this.selectedFeatureID);
                        this.map.fire('draw.update', { features: [link] });
                    }
                } else {
                    this.draw.setFeatureProperty(
                        this.selectedFeatureID,
                        'frequency',
                        this.centerFreq
                    );
                }
            }
            this.updateLinkChart(true);
        });
        this.link_status = new LinkStatus();

        // Profile navigation keyboard event listener
        window.addEventListener('keydown', (event: any) => {
            if (this.lidar3dview?.currentView === '3d') {
                if (LEFT_NAVIGATION_KEYS.includes(event.key)) {
                    this.highlightCurrentPosition(false);
                    this.linkProfileHoverPosition -= this.navigationDelta;
                    this.fitFresnelPositionToBounds();
                    this.lidar3dview.moveLocation3DView();
                } else if (RIGHT_NAVIGATION_KEYS.includes(event.key)) {
                    this.highlightCurrentPosition(false);
                    this.linkProfileHoverPosition += this.navigationDelta;
                    this.fitFresnelPositionToBounds();
                    this.lidar3dview.moveLocation3DView();
                }
            }
        });

        // Add Resize-Window Callback
        this.windowResizeCallback();
        window.addEventListener('resize', this.windowResizeCallback.bind(this));
        const resizeObserver = new ResizeObserver(() => {
            this.windowResizeCallback();
        });
        const bottom_row = document.querySelector('#bottom-row-link-view-container');
        if (bottom_row instanceof Element) {
            resizeObserver.observe(bottom_row);
        }
    }

    windowResizeCallback() {
        const window_height = $(window).height() ?? 0;
        const window_width = $(window).width() ?? 0;
        const bottom_row_height = $('#bottom-row-link-view-container').outerHeight(true) ?? 0;
        const disclaimer_height = $('footer').outerHeight(true) ?? 0;
        const nav_height = $('#workspacenavelem').outerHeight(true) ?? 0;
        let height = window_height - bottom_row_height - disclaimer_height;
        if (window_width <= 992) {
            $('.workspace-container').css(
                'min-height',
                `calc(100vh - 50px - ${disclaimer_height}px)`
            );
            $('.workspace-container').css('height', `calc(100vh - 50px - ${disclaimer_height}px)`);
        }
        height = height - nav_height;
        height = Math.max(height, 400);
        $('#map').height(height);
        if (this.map?.resize) {
            this.map.resize();
        }
        $('#3d-view-container').height(height);
        $('#potree_render_area').height(height);

        if (this.link_chart) {
            this.link_chart.redraw();
        }

        $('#link_view_bar').css('padding-bottom', `${$('#disclaimer').outerHeight()}px`);
    }

    initMapCenterAndZoom() {
        let tx_initial = parseFormLatitudeLongitude('#lat-lng-0');
        let rx_initial = parseFormLatitudeLongitude('#lat-lng-1');
        let initial_map_center = { lon: 0, lat: 0 };
        if (tx_initial != null && rx_initial != null) {
            return {
                initial_map_center: {
                    lon: (tx_initial[1] + rx_initial[1]) / 2.0,
                    lat: (tx_initial[0] + rx_initial[0]) / 2.0
                },
                initial_zoom: 17
            };
        } else {
            return super.initMapCenterAndZoom();
        }
    }

    onMapLoad() {
        this.map.on('draw.update', this.updateRadioLocation.bind(this));
        this.map.on('draw.create', this.updateRadioLocation.bind(this));

        this.profileWS = new LOSCheckWS(this.networkID);

        this.link_chart = createLinkChart(
            this.link_chart,
            this.highLightPointOnGround.bind(this),
            (point: any) => {
                this.lidar3dview?.moveLocation3DView(point);
            },
            this.mouseLeave.bind(this),
            this.setExtremes.bind(this)
        );

        new LinkCheckPTPOverlay(this.map, this.draw);
        new MapLayerSidebarManager(this.map, this.draw);
        this.lidar3dview = new LiDAR3DView(this.map, this.draw, this, this.radio_names);
        this.workspaceManager = new LOSCheckWorkspaceManager(this.map, this.draw);
        new ViewshedTool(this.map, this.draw);

        // instantiate singletons
        new LOSCheckLinkProfileView();
        this.locationMarker = new LinkCheckLocationSearchTool(this.map, this.workspaceManager);
        new LinkCheckCustomerConnectPopup(this.map, this.draw);
        new LinkCheckVertexClickCustomerConnectPopup(this.map, this.draw);
        new LinkCheckCPEClickCustomerConnectPopup(this.map, this.draw);
        new AjaxTowerPopup(this.map, this.draw, ISPToolboxTool.LOS_CHECK);
        new LinkCheckTowerPopup(this.map, this.draw);
        new LinkCheckSectorPopup(this.map, this.draw);
        new AjaxLinkCheckLocationPopup(this.map, this.draw);
        new AjaxLinkCheckCPEPopup(this.map, this.draw);
        new AjaxLinkCheckLocationSwitchSectorPopup(this.map, this.draw);
        new AjaxLinkCheckCPESwitchSectorPopup(this.map, this.draw);
        new LinkCheckRadiusAndBuildingCoverageRenderer(this.map, this.draw, this.profileWS);

        // Set relationships amongst collapsible components
        CollapsibleComponent.registerSingletonConflicts(LOSCheckLinkProfileView, [
            LinkCheckTowerPopup,
            LinkCheckCustomerConnectPopup,
            LinkCheckVertexClickCustomerConnectPopup,
            LinkCheckCPEClickCustomerConnectPopup,
            AjaxTowerPopup,
            LinkCheckSectorPopup,
            MapLayerSidebarManager,
            AjaxLinkCheckCPEPopup,
            AjaxLinkCheckLocationPopup,
            AjaxLinkCheckLocationSwitchSectorPopup
        ]);
        const prioritizeDirectSelect = function ({ features }: any) {
            if (features.length == 1 && features[0].geometry.type !== 'Point') {
                this.draw.changeMode('direct_select', {
                    featureId: features[0].id
                });
                this.map.fire('draw.modechange', {
                    mode: 'direct_select',
                    featureId: features[0].id
                });
            }
        };

        this.showVertexDebounce = _.debounce((e: any) => {
            let featureCoords = e.features[0].geometry.coordinates;
            let pointCoords = e.points[0].geometry.coordinates;
            let selectedVertex =
                pointCoords[0] === featureCoords[0][0] && pointCoords[1] === featureCoords[0][1]
                    ? 0
                    : 1;

            let vertexLngLat = e.features[0].geometry.coordinates[selectedVertex];
            if (isBeta()) {
                let popup = AjaxLinkCheckLocationPopup.getInstance();
                popup.hide();
                popup.setLngLat(vertexLngLat);
                popup.show();
            } else {
                let mapboxClient = MapboxSDKClient.getInstance();
                mapboxClient.reverseGeocode(vertexLngLat, (response: any) => {
                    let popup = LinkCheckBasePopup.createPopupFromReverseGeocodeResponse(
                        LinkCheckVertexClickCustomerConnectPopup,
                        vertexLngLat,
                        response
                    );
                    popup.setSelectedFeatureId(e.features[0].id);
                    popup.setSelectedVertex(selectedVertex);
                    popup.show();
                });
            }
        }, 175);

        this.map.on('draw.selectionchange', (e: any) => {
            // on click vertex, show vertex tooltip and not link profile.
            if (this.vertexSelected(e)) {
                this.showVertexDebounce(e);
            }
            this.updateRadioLocation(e);
        });
        this.map.on('draw.selectionchange', prioritizeDirectSelect.bind(this));
        this.map.on('draw.selectionchange', this.mouseLeave.bind(this));
        this.map.on('draw.selectionchange', this.showInputs.bind(this));
        this.map.on('draw.delete', this.deleteDrawingCallback.bind(this));
        this.map.on(
            'draw.update',
            ({
                features,
                action
            }: {
                features: Array<GeoJSON.Feature>;
                action: 'move' | 'change_coordinates';
            }) => {
                if (features.length === 1) {
                    if (features[0].properties?.feature_type === WorkspaceFeatureTypes.AP) {
                        LOSCheckLinkProfileView.getInstance().show();
                    }
                }
            }
        );
        PubSub.subscribe(LinkCheckEvents.SET_INPUTS, this.setInputs.bind(this));
        PubSub.subscribe(LinkCheckEvents.CLEAR_INPUTS, this.clearInputs.bind(this));
        PubSub.subscribe(LinkCheckEvents.SHOW_INPUTS, this.showInputs.bind(this));
        PubSub.subscribe(LOSWSEvents.STD_MSG, this.ws_message_handler.bind(this));

        window.addEventListener('keydown', (event) => {
            const featureCollection = this.draw.getSelected();
            if (
                event.target === this.map.getCanvas() &&
                (event.key === 'Backspace' || event.key === 'Delete')
            ) {
                featureCollection.features.forEach((feat: any) => {
                    this.draw.delete(feat.id);
                });
                this.map.fire('draw.delete', { features: featureCollection.features });
            }
        });

        this.lidarAvailabilityLayer = new LidarAvailabilityLayer(this.map);

        const tx_coords = parseFormLatitudeLongitude('#lat-lng-0');
        const rx_coords = parseFormLatitudeLongitude('#lat-lng-1');
        if (tx_coords != null && rx_coords != null) {
            const [tx_lat, tx_lng] = tx_coords;
            const [rx_lat, rx_lng] = rx_coords;
            const features = this.draw.add({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [
                        [tx_lng, tx_lat],
                        [rx_lng, rx_lat]
                    ]
                },
                properties: {
                    meta: 'radio_link',
                    radio_label_0: 'radio_0',
                    radio_label_1: 'radio_1',
                    radio_color: '#00FF00',
                    radio0hgt: parseFloat(String($('#hgt-0').val())),
                    radio1hgt: parseFloat(String($('#hgt-1').val())),
                    freq: DEFAULT_LINK_FREQ
                }
            });
            this.selectedFeatureID = features.length ? features[0] : null;
        }

        this.updateLinkProfile();
        this.link_chart.redraw();

        // Update Callbacks for Radio Heights
        $('#hgt-0').change(
            _.debounce((e: any) => {
                let height = validateHeight(parseFloat(String($('#hgt-0').val())), 'hgt-0');
                this.updateLinkChart(true);
                if (this.selectedFeatureID != null && this.draw.get(this.selectedFeatureID)) {
                    if (this.workspaceLinkSelected()) {
                        let link = this.draw.get(this.selectedFeatureID);
                        let ap = LOSCheckWorkspaceManager.getFeatureByUuid(
                            link?.properties?.ap || link?.properties?.sector
                        );
                        ap.setFeatureProperty('height', isUnitsUS() ? ft2m(height) : height);
                        this.map.fire('draw.update', { features: [ap.getFeatureData()] });
                    } else {
                        this.draw.setFeatureProperty(
                            this.selectedFeatureID,
                            'radio0hgt',
                            isUnitsUS() ? ft2m(height) : height
                        );
                        this.map.fire('draw.update', {
                            features: [this.draw.get(this.selectedFeatureID)]
                        });
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
                        let link = this.draw.get(this.selectedFeatureID);
                        let cpe = LOSCheckWorkspaceManager.getFeatureByUuid(link?.properties?.cpe);
                        cpe.setFeatureProperty('height', isUnitsUS() ? ft2m(height) : height);
                        this.map.fire('draw.update', { features: [cpe.getFeatureData()] });
                    } else {
                        this.draw.setFeatureProperty(
                            this.selectedFeatureID,
                            'radio1hgt',
                            isUnitsUS() ? ft2m(height) : height
                        );
                        this.map.fire('draw.update', {
                            features: [this.draw.get(this.selectedFeatureID)]
                        });
                    }
                }
            }, 500)
        );
        const createRadioCoordinateChangeCallback = (htmlId: string, coord1: number) => {
            $(htmlId).on(
                'change',
                _.debounce(() => {
                    if (this.selectedFeatureID != null) {
                        const feat = this.draw.get(this.selectedFeatureID);
                        let coords = parseFormLatitudeLongitude(htmlId);
                        if (coords != null) {
                            coords = [coords[1], coords[0]];
                            if (
                                feat &&
                                feat.geometry.type !== 'GeometryCollection' &&
                                feat.geometry.coordinates
                            ) {
                                if (this.workspaceLinkSelected()) {
                                    let point = LOSCheckWorkspaceManager.getFeatureByUuid(
                                        // @ts-ignore
                                        coord1 === 0 ? feat.properties.ap : feat.properties.cpe
                                    ) as WorkspacePointFeature;

                                    // @ts-ignore
                                    point.move(coords);
                                } else {
                                    //@ts-ignore
                                    feat.geometry.coordinates[coord1] = coords;
                                    this.draw.add(feat);
                                    this.map.fire('draw.create', { features: [feat] });
                                }
                                this.updateLinkProfile();
                                this.map.setCenter(coords);
                            }
                        }
                    }
                }, 500)
            );
        };
        createRadioCoordinateChangeCallback('#lat-lng-0', 0);
        createRadioCoordinateChangeCallback('#lat-lng-1', 1);
    }

    onGeocoderLoad() {
        this.locationMarker.setGeocoder(this.geocoder);
    }

    workspaceLinkSelected(): boolean {
        if (this.selectedFeatureID != null && this.draw.get(this.selectedFeatureID)) {
            let feat = this.draw.get(this.selectedFeatureID);
            return (
                feat?.properties?.feature_type &&
                feat?.properties?.feature_type === WorkspaceFeatureTypes.AP_CPE_LINK
            );
        } else {
            return false;
        }
    }

    vertexSelected(update: any): boolean {
        return Boolean(
            this.draw.getMode() === 'direct_select' &&
                update.points &&
                update.points.length === 1 &&
                update.features &&
                update.features.length === 1
        );
    }

    setInputs(
        msg: string,
        data: {
            radio: number;
            latitude: number;
            longitude: number;
            name: string;
            height: number;
            frequency?: number;
        }
    ) {
        $(`#lat-lng-${data.radio}`).val(
            `${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`
        );
        $(`#hgt-${data.radio}`).val(data.height.toFixed(0));
        $(`#radio_name-${data.radio}`).text(data.name);

        if (data.frequency) {
            $('#freq-dropdown').text(center_freq_values_reverse.get(data.frequency) as string);
        }
    }

    showLinkCheckProfile() {
        //@ts-ignore
        $('#data-container').collapse('show');
    }

    updateRadioLocation(update: { features: Array<GeoJSON.Feature>; action: undefined | 'move' }) {
        // Filter out empty updates or circle feature updates
        // TODO (achongfb): modularize this into a PTPLink Class and APClass
        if (
            update.features.length &&
            update.features[0].properties?.radius === undefined &&
            update.features[0].geometry.type !== 'Point'
        ) {
            // Don't pop up the link profile view if it was an AP/customer link that was moved,
            // or if it was a vertex that moved
            if (
                !(
                    update.features[0].properties?.feature_type ===
                        WorkspaceFeatureTypes.AP_CPE_LINK && update.action === 'move'
                ) &&
                !this.vertexSelected(update)
            ) {
                LOSCheckLinkProfileView.getInstance().show();
            }
            const feat = update.features[0];
            this.selectedFeatureID = String(feat.id);

            if (feat.geometry.type === 'LineString') {
                $('#lat-lng-0').val(
                    `${feat.geometry.coordinates[0][1].toFixed(
                        5
                    )}, ${feat.geometry.coordinates[0][0].toFixed(5)}`
                );
                $('#lat-lng-1').val(
                    `${feat.geometry.coordinates[1][1].toFixed(
                        5
                    )}, ${feat.geometry.coordinates[1][0].toFixed(5)}`
                );

                $('#lat-lng-0').prop('readonly', false);
                $('#lat-lng-1').prop('readonly', false);
                $('#freq-dropdown').removeClass('disabled');
            }

            // Workspace AP-CPE link frequency, heights, and name
            if (
                feat.properties?.feature_type &&
                feat.properties?.feature_type === WorkspaceFeatureTypes.AP_CPE_LINK
            ) {
                let ap = LOSCheckWorkspaceManager.getFeatureByUuid(
                    feat.properties.ap || feat.properties.sector
                ) as AccessPoint | AccessPointSector;
                let cpe = LOSCheckWorkspaceManager.getFeatureByUuid(feat.properties.cpe);

                if (center_freq_values_reverse.has(feat.properties.frequency)) {
                    $('#freq-dropdown').text(
                        center_freq_values_reverse.get(feat.properties.frequency) as string
                    );
                }

                $('#hgt-0').val(
                    Math.round(
                        isUnitsUS()
                            ? ap.getFeatureProperty('height_ft')
                            : ap.getFeatureProperty('height')
                    )
                );
                $('#hgt-1').val(
                    Math.round(
                        isUnitsUS()
                            ? cpe.getFeatureProperty('height_ft')
                            : cpe.getFeatureProperty('height')
                    )
                );

                if (ap.getFeatureProperty('uneditable')) {
                    $('#lat-lng-0').prop('readonly', true);
                }

                // Sectors: frequency and latlng editing disabled, frequency on sector
                if (!isAP(ap)) {
                    $('#lat-lng-0').prop('readonly', true);
                    $('#freq-dropdown').addClass('disabled');

                    if (center_freq_values_reverse.has(ap.getFeatureProperty('frequency'))) {
                        $('#freq-dropdown').text(
                            center_freq_values_reverse.get(
                                ap.getFeatureProperty('frequency')
                            ) as string
                        );
                        this.centerFreq = ap.getFeatureProperty('frequency');
                    }
                }

                $('#radio_name-0').text(ap.getFeatureProperty('name'));
                $('#radio_name-1').text(cpe.getFeatureProperty('name'));
                this.radio_names[0] = ap.getFeatureProperty('name');
                this.radio_names[1] = cpe.getFeatureProperty('name');
                this.lidar3dview?.updateAnimationTitles();
            } else {
                if (feat.properties?.frequency === undefined && this.selectedFeatureID) {
                    this.draw.setFeatureProperty(
                        this.selectedFeatureID,
                        'frequency',
                        DEFAULT_LINK_FREQ
                    );
                }
                if (center_freq_values_reverse.has(feat.properties?.frequency)) {
                    $('#freq-dropdown').text(
                        center_freq_values_reverse.get(feat.properties?.frequency) as string
                    );
                }

                let radio0hgt = isUnitsUS()
                    ? feat.properties?.radio0hgt
                    : feat.properties?.radio0hgt_ft;
                if (radio0hgt == undefined && this.selectedFeatureID) {
                    radio0hgt = DEFAULT_RADIO_HEIGHT;
                    this.draw.setFeatureProperty(
                        this.selectedFeatureID,
                        'radio0hgt',
                        isUnitsUS() ? ft2m(radio0hgt) : radio0hgt
                    );
                    this.draw.setFeatureProperty(
                        this.selectedFeatureID,
                        'radio0hgt_ft',
                        m2ft(radio0hgt)
                    );
                }
                $('#hgt-0').val(Math.round(isUnitsUS() ? m2ft(radio0hgt) : radio0hgt));
                let radio1hgt = isUnitsUS()
                    ? feat.properties?.radio1hgt
                    : feat.properties?.radio1hgt_ft;
                if (feat.properties?.radio1hgt == undefined && this.selectedFeatureID) {
                    radio1hgt = DEFAULT_RADIO_HEIGHT;
                    this.draw.setFeatureProperty(
                        this.selectedFeatureID,
                        'radio1hgt',
                        isUnitsUS() ? ft2m(radio1hgt) : radio1hgt
                    );
                    this.draw.setFeatureProperty(
                        this.selectedFeatureID,
                        'radio1hgt_ft',
                        m2ft(radio1hgt)
                    );
                }
                $('#hgt-1').val(Math.round(isUnitsUS() ? m2ft(radio1hgt) : radio1hgt));
                $('#radio_name-0').text(DEFAULT_RADIO_0_NAME);
                $('#radio_name-1').text(DEFAULT_RADIO_1_NAME);
                this.radio_names[0] = DEFAULT_RADIO_0_NAME;
                this.radio_names[1] = DEFAULT_RADIO_1_NAME;
                this.lidar3dview?.updateAnimationTitles();
            }

            this.updateLinkChart();
            this.updateLinkProfile();
        }
    }

    deleteDrawingCallback({ features }: any) {
        PubSub.publish(LinkCheckEvents.CLEAR_INPUTS);
    }
    highLightPointOnGround({ x, y }: { x: number; y: number }) {
        const integer_X = Math.round(x);
        if (this._coords !== null && integer_X < this._coords.length && integer_X >= 0) {
            const new_data = {
                type: 'Point',
                coordinates: [this._coords[integer_X].lng, this._coords[integer_X].lat]
            };
            const source = this.map.getSource(HOVER_POINT_SOURCE);
            if (source.type === 'geojson') {
                // @ts-ignore
                source.setData(new_data);
            }
        }
    }

    isOverlapping() {
        return this.link_status.obstructions.some((interval) => {
            return (
                this.linkProfileHoverPosition >= interval[0] &&
                this.linkProfileHoverPosition <= interval[1]
            );
        });
    }

    getRadioLocations() {
        const tx_coords = parseFormLatitudeLongitude('#lat-lng-0');
        const rx_coords = parseFormLatitudeLongitude('#lat-lng-1');
        if (tx_coords == null || rx_coords == null) {
            return null;
        }
        const [tx_lat, tx_lng] = tx_coords;
        const [rx_lat, rx_lng] = rx_coords;
        if ([tx_lat, tx_lng, rx_lat, rx_lng].some(Number.isNaN)) {
            return null;
        }
        const query_params: {
            tx: [number, number];
            rx: [number, number];
            id: string;
        } = { tx: [tx_lng, tx_lat], rx: [rx_lng, rx_lat], id: this.userRequestIdentity };
        return query_params;
    }

    // Overlay
    updateLinkProfile() {
        const query_params = this.getRadioLocations();
        if (query_params !== null) {
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
        if (query_params !== null) {
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
            source.setData({ type: 'FeatureCollection', features: [] });
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
        if (this.link_chart.series[3].data.length > this.linkProfileHoverPosition) {
            this.link_chart.series[3].data[this.linkProfileHoverPosition].setState(state);
        }
        if (this.link_chart.series[2].data.length > this.linkProfileHoverPosition) {
            this.link_chart.series[2].data[this.linkProfileHoverPosition].setState(state);
        }
    }

    renderNewLinkProfile() {
        // Check if we can update the chart
        if (this.link_chart != null) {
            if (this._elevation.length > 1 && this._lidar.length > 1) {
                const tx_h = this.getRadioHeightFromUI('0') + this._elevation[0];
                const rx_h =
                    this.getRadioHeightFromUI('1') + this._elevation[this._elevation.length - 1];
                this.link_chart.yAxis[0].update({
                    min: Math.min(...[...this._lidar, tx_h, rx_h]),
                    max: Math.max(...[...this._lidar, tx_h, rx_h])
                });
            } else if (this._elevation.length > 1) {
                this.link_chart.yAxis[0].update({ min: Math.min(...this._elevation) });
            }
        }
    }

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
                });
            }
        }
        if (this._elevation != null && this.lidar3dview?.updateLinkHeight != null && update3DView) {
            this.highlightCurrentPosition(false);

            const tx_hgt = this.getRadioHeightFromUI('0') + this._elevation[0];
            const rx_hgt =
                this.getRadioHeightFromUI('1') + this._elevation[this._elevation.length - 1];
            this.lidar3dview?.updateLinkHeight(tx_hgt, rx_hgt, !update3DView);
            if (this._lidar != null) {
                this.link_chart.yAxis[0].update({
                    min: Math.min(...[...this._lidar, tx_hgt, rx_hgt]),
                    max: Math.max(...[...this._lidar, tx_hgt, rx_hgt])
                });
            }

            this.lidar3dview?.moveLocation3DView();
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
        this.linkProfileHoverPosition = Math.round(this.linkProfileHoverPosition);
        if (this.linkProfileHoverPosition < xMin) {
            this.linkProfileHoverPosition = xMin;
        } else if (this.linkProfileHoverPosition > xMax) {
            this.linkProfileHoverPosition = xMax;
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
        } else {
            // Minimal delta speed is 1
            this.navigationDelta = Math.max(Math.round(17000 / this._link_distance), 1);
        }
    }

    updateLegend() {
        const sources: Array<string> = [];
        this.datasets.forEach((l, k) => {
            if (l instanceof Array) {
                l.forEach((v) => {
                    sources.push(v);
                });
            }
        });
        $('#los-chart-tooltip-button')
            .attr(
                'title',
                `<div class="los-chart-legend">
                <h5>Link Profile</h5>
                    <div class='isptoolbox-bullet-line'><span class='isptoolbox-tooltip-colorbox isptoolbox-los' ></span><p class='list-item'>LOS</p></div>
                    <div class='isptoolbox-bullet-line'><span class='isptoolbox-tooltip-colorbox isptoolbox-fresnel' ></span><p class='list-item'>Fresnel</p></div>
                    <div class='isptoolbox-bullet-line'><span class='isptoolbox-tooltip-colorbox isptoolbox-lidar' ></span><p class='list-item'>LiDAR</p></div>
                    <div class='isptoolbox-bullet-line'><span class='isptoolbox-tooltip-colorbox isptoolbox-terrain'></span><p class='list-item'>Terrain</p></div>
                    <div class='isptoolbox-bullet-line'><span class='isptoolbox-tooltip-colorbox isptoolbox-obstruction'></span><p class='list-item'>LOS Obstructions</p></div>
                    ${
                        this.datasets.size
                            ? `
                    <p class='isptoolbox-data-source'>Data Sources: ${sources.join(', ')}</p>`
                            : ''
                    }
            </div>`
            )
            // @ts-ignore
            .tooltip('_fixTitle');
    }

    setErrorMessage(error_message: string | null): void {
        if (error_message !== null) {
            $('#link-request-error-description').text(error_message);
            this.profileView.render(LinkProfileDisplayOption.LOADING_ERROR);
        } else {
            $('#link-request-error-description').text('');
        }
    }

    // Websocket Message Callback Handlers
    ws_message_handler(msg: string, response: LOSCheckResponse): void {
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
            this._elevation = response.terrain_profile.map((pt) => {
                return pt.elevation;
            });
            this._coords = response.terrain_profile.map((pt: any) => {
                return { lat: pt.lat, lng: pt.lng };
            });
            this.link_chart.series[0].setData(
                this._elevation.map((v, idx) => {
                    return [idx, v];
                })
            );
        } else {
            this.link_chart.series[0].setData(
                response.terrain_profile.map((pt, idx) => {
                    return [
                        idx * (response.aoi[1] - response.aoi[0]) +
                            response.aoi[0] * response.terrain_profile.length,
                        pt.elevation
                    ];
                })
            );
        }

        this.renderNewLinkProfile();
        this.updateLinkChart();
        this.lidar3dview?.updateLink();

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
            this.link_chart.series[1].setData(
                this._lidar.map((v, idx) => {
                    return [idx, v];
                })
            );
            if (response.error !== null) {
                $('#3D-view-btn').addClass('d-none');
            } else {
                if (this.selectedFeatureID && this.draw.get(this.selectedFeatureID)) {
                    $('#3D-view-btn').removeClass('d-none');
                    if (this.currentLinkHash !== response.hash) {
                        this.lidar3dview?.updateLidarRender(
                            response.source,
                            response.url,
                            response.bb,
                            response.tx,
                            response.rx
                        );
                        this.currentLinkHash = response.hash;
                    }
                    this.updateNavigationDelta();
                }
            }
        } else {
            this.link_chart.series[1].setData(
                response.lidar_profile.map((v, idx) => {
                    return [
                        idx * (response.aoi[1] - response.aoi[0]) +
                            response.aoi[0] * response.lidar_profile.length,
                        v
                    ];
                })
            );
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
        return getUnits() === UnitSystems.US ? ft2m(hgt) : hgt;
    }

    clearInputs(): void {
        // Clear All Inputs
        if (
            this.draw.getAll().features.length === 0 &&
            (!this.selectedFeatureID || !this.draw.get(this.selectedFeatureID))
        ) {
            this.profileView.render(LinkProfileDisplayOption.DRAWING_INSTRUCTIONS);
        }
    }

    showInputs(): void {
        if (this.draw.getSelected().features.length > 0) {
            $('.radio-card-body').removeClass('d-none');
        }
    }

    showLoading(): void {
        this.profileView.render(LinkProfileDisplayOption.LOADING_CHART);
    }

    showPlotIfValidState() {
        if (
            this._lidar.length &&
            this._elevation.length &&
            this.selected_feature &&
            this.selectedFeatureID &&
            this.draw.get(this.selectedFeatureID) != null
        ) {
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
                formatter:
                    getUnits() === UnitSystems.US
                        ? function () {
                              return `${km2miles((this.value * scaling_factor) / 1000).toFixed(2)}`;
                          }
                        : function () {
                              return `${((this.value * scaling_factor) / 1000).toFixed(1)}`;
                          }
            },
            title: {
                text: `Distance ${getUnits() === UnitSystems.US ? '[mi]' : '[km]'} - resolution ${
                    getUnits() === UnitSystems.US
                        ? m2ft(this.data_resolution).toFixed(1)
                        : this.data_resolution
                } ${getUnits() === UnitSystems.US ? '[ft]' : '[m]'}`
            }
        });
        this.link_chart.yAxis[0].update({
            labels: {
                formatter:
                    getUnits() === UnitSystems.US
                        ? function () {
                              return `${m2ft(this.value).toFixed(0)}`;
                          }
                        : function () {
                              return `${this.value.toFixed(0)}`;
                          }
            },
            title: {
                text: getUnits() === UnitSystems.US ? 'Elevation [ft]' : 'Elevation [m]'
            }
        });
    }
}
