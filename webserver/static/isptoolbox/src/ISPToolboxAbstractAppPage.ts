// Create new mapbox Map
import * as MapboxGL from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';

//@ts-ignore
import styles from '@mapbox/mapbox-gl-draw/src/lib/theme';
import { combineStyles, load_custom_icons } from './isptoolbox-mapbox-draw/index';
import { LOSCheckMapboxStyles } from './LOSCheckMapboxStyles';
import MapboxCustomDeleteControl from './organisms/controls/MapboxCustomDeleteControl';
import { getInitialLockDragging, setCenterZoomPreferences } from './utils/MapPreferences';
import { MapboxSDKClient } from './MapboxSDKClient';
import { parseSearchBarLatitudeLongitude } from './utils/LatLngInputUtils';
import { isBeta } from './LinkCheckUtils';
import MapboxLockDraggingControl from './organisms/controls/MapboxLockDraggingControl';
import { WorkspaceTools } from './workspace/WorkspaceConstants';

//@ts-ignore
const mapboxgl = window.mapboxgl;

const mapbox_draw_lib = window.MapboxDraw;

//@ts-ignore
const mapboxdrawstyles = combineStyles(styles, LOSCheckMapboxStyles);

// @ts-ignore
const MapboxGeocoder = window.MapboxGeocoder;

const LOWEST_LAYER_SOURCE = 'lowest_layer_source';
export const LOWEST_LAYER_LAYER = 'lowest_layer_layer';

const SOURCES_PAGE_BASE_URL = '/pro/sources';

function addEventHandler(map: mapboxgl.Map, draw: MapboxDraw, id: string, mode: string) {
    $(`#${id}`).click(() => {
        //@ts-ignore
        draw.changeMode(mode);
        map.fire('draw.modechange', { mode: mode });
    });
}

export abstract class ISPToolboxAbstractAppPage {
    map: MapboxGL.Map;
    draw: MapboxDraw;
    geocoder: typeof MapboxGeocoder;

    constructor(draw_modes: any, sources_page: string) {
        let { initial_map_center, initial_zoom } = this.initMapCenterAndZoom();

        try {
            // @ts-ignore
            initial_map_center = window.ISPTOOLBOX_SESSION_INFO.initialMapCenter.coordinates;
            // @ts-ignore
            initial_zoom = window.ISPTOOLBOX_SESSION_INFO.initialMapZoom;
        } catch (err) {}

        this.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/satellite-streets-v11', // stylesheet location
            center: initial_map_center, // starting position [lng, lat]
            zoom: initial_zoom, // starting zoom
            attributionControl: false
        });

        this.map.addControl(
            new mapboxgl.AttributionControl({
                customAttribution: `<a href="${SOURCES_PAGE_BASE_URL}/${sources_page}" target="_blank">Sources</a>`
            })
        );

        this.map.on('load', () => {
            // When map movement ends save where the user is looking
            setCenterZoomPreferences(this.map);
            load_custom_icons(this.map);
            this.map.on('draw.modechange', this.drawModeChangeCallback.bind(this));
            this.map.addSource(LOWEST_LAYER_SOURCE, {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            });
            this.map.addLayer({
                id: LOWEST_LAYER_LAYER,
                type: 'line',
                source: LOWEST_LAYER_SOURCE,
                layout: {},
                paint: {}
            });

            // Add a modified drawing control
            this.draw = new mapbox_draw_lib({
                userProperties: true,
                //@ts-ignore
                modes: { ...MapboxDraw.modes, ...draw_modes },
                displayControlsDefault: false,
                controls: {},
                styles: mapboxdrawstyles
            });

            // @ts-ignore
            this.draw.options.lockDragging = getInitialLockDragging();

            this.map.addControl(this.draw, 'bottom-right');
            const delete_confirmation = isBeta();
            const deleteControl = new MapboxCustomDeleteControl(
                this.map,
                this.draw,
                delete_confirmation
            );
            const lockDragControl = new MapboxLockDraggingControl(this.map, this.draw);

            this.map.addControl(deleteControl, 'bottom-right');
            this.map.addControl(lockDragControl, 'bottom-right');
            this.map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

            // Add buttons
            let addEventHandlerMapDraw = addEventHandler.bind(null, this.map, this.draw);

            addEventHandlerMapDraw('add-link-btn', 'draw_link');
            addEventHandlerMapDraw('add-ap-btn', 'draw_ap');
            addEventHandlerMapDraw('add-cpe-btn', 'draw_cpe');
            addEventHandlerMapDraw('draw-coverage-area-btn', 'draw_polygon');

            // Delete deletes things
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

            // Search bar init
            let latLngMatcher = (query: string) => {
                let latLngMatch = parseSearchBarLatitudeLongitude(query);
                if (latLngMatch == null) {
                    return null;
                }
                let lngLatMatch = [latLngMatch[1], latLngMatch[0]];

                return [
                    {
                        center: lngLatMatch,
                        geometry: {
                            type: 'Point',
                            coordinates: lngLatMatch
                        },
                        place_name: `Coordinate Match, (${lngLatMatch[1]}, ${lngLatMatch[0]})`,
                        place_type: ['coordinate'],
                        properties: {},
                        type: 'Feature'
                    }
                ];
            };

            this.geocoder = new MapboxGeocoder({
                accessToken: mapboxgl.accessToken,
                mapboxgl: mapboxgl,
                marker: isBeta() ? false : true,
                countries: 'us, pr',
                localGeocoder: latLngMatcher,
                placeholder: 'Search for an address'
            });

            document.getElementById('geocoder')?.appendChild(this.geocoder.onAdd(this.map));

            new MapboxSDKClient(mapboxgl.accessToken);

            $('#map-layers-btn').prop('disabled', false);

            

            // Additional loading
            this.onMapLoad();
        });

        const loadMapCallback = () => {
            this.map.getStyle().layers?.every((layer: any) => {
                if (layer.id.includes('gl-draw')) {
                    $(`#map-layers-btn`).on('click', (event) => {
                        const $map = $('#map');
                        if ($map.data('workspace-tool') === WorkspaceTools.LOS_CHECK) {
                            $map.toggleClass(['col-md-10', 'col-md-12']);
                            $map.toggleClass(['col-lg-10', 'col-lg-12']);
                        } else {
                            $map.toggleClass(['col-md-6', 'col-md-9']);
                            $map.toggleClass(['col-lg-7', 'col-lg-9']);
                        }

                        const $sidebar = $('#map-layer-sidebar');
                        if ($sidebar.hasClass('show')) {
                            $sidebar.removeClass('show');
                        } else {
                            $sidebar.addClass('show');
                        }

                        this.map.resize();
                    });
                    this.map.off('idle', loadMapCallback);
                    return false;
                }
                return true;
            });
        };
        this.map.on('idle', loadMapCallback);
    }

    initMapCenterAndZoom(): {
        initial_map_center: { lat: number; lon: number };
        initial_zoom: number;
    } {
        return {
            initial_map_center: { lat: 0, lon: 0 },
            initial_zoom: 17
        };
    }

    drawModeChangeCallback({ mode }: { mode: string }) {
        $('.isp-draw-mode-btn')
            .filter(function (idx) {
                return $(this).attr('draw_mode') !== mode;
            })
            .removeClass('btn-primary')
            .addClass('btn-secondary');
        $('.isp-draw-mode-btn')
            .filter(function (idx) {
                return $(this).attr('draw_mode') === mode;
            })
            .addClass('btn-primary')
            .removeClass('btn-secondary');
    }

    abstract onMapLoad(): void;
}
