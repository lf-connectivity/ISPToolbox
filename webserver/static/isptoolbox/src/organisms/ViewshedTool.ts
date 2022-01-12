import MapboxDraw from '@mapbox/mapbox-gl-draw';
import mapboxgl from 'mapbox-gl';
import PubSub from 'pubsub-js';
import {
    LOSWSEvents,
    ViewShedResponse,
    WorkspaceFeatureTypes
} from '../workspace/WorkspaceConstants';
import { EMPTY_LAYER_AFTER_BUILDING } from './APCoverageRenderer';
import { getCookie } from '../utils/Cookie';
import { djangoUrl } from '../utils/djangoUrl';
import { IMapboxDrawPlugin, initializeMapboxDrawInterface } from '../utils/IMapboxDrawPlugin';
import { renderAjaxOperationFailed } from '../utils/ConnectionIssues';
import { isBeta } from '../LinkCheckUtils';

export enum ViewshedEvents {
    VS_REQUEST = 'vs.request',
    VS_COMPUTED = 'vs.computed',
    VS_LOAD = 'vs.load',
    VS_CLOSED = 'vs.closed'
}

const VIEWSHED_TILE_OVERLAY_SOURCE = 'isptoolbox.viewshedoverlay-tile-source';
const VIEWSHED_TILE_OVERLAY_LAYER = 'isptoolbox.viewshedoverlay-tile-layer';

export class ViewshedTool implements IMapboxDrawPlugin {
    map: mapboxgl.Map;
    draw: MapboxDraw;
    viewshed_feature_id: string | number | null = null;
    static _instance: ViewshedTool;
    last_selection: string | number | undefined;
    dragging = false;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        initializeMapboxDrawInterface(this, map);
        if (ViewshedTool._instance) {
            throw Error('This singleton has already been instantiated, use getInstance.');
        }
        this.map = map;
        this.draw = draw;
        PubSub.subscribe(LOSWSEvents.VIEWSHED_MSG, this.updateViewshedImage.bind(this));
        this.map.on('sourcedata', (e) => {
            if (
                e.isSourceLoaded &&
                e.source.type === 'raster' &&
                e.sourceId === VIEWSHED_TILE_OVERLAY_SOURCE
            ) {
                this.setVisibleLayer(true);
            }
        });
        ViewshedTool._instance = this;
    }

    static getInstance(): ViewshedTool {
        if (ViewshedTool._instance) {
            return ViewshedTool._instance;
        } else {
            throw new Error('No Instance of ViewshedTool instantiated.');
        }
    }
    static checkValidFeatureType(feat: GeoJSON.Feature) : boolean{
        if(isBeta()){
            return feat.properties?.feature_type === WorkspaceFeatureTypes.SECTOR;
        } else {
            return feat.properties?.feature_type === WorkspaceFeatureTypes.AP;
        }
    }

    drawUpdateCallback(event: { features: Array<GeoJSON.Feature>; action: string }) {
        const features = event.features;
        if (
            features.length > 0 &&
            !features.some((f) => {
                return this.viewshed_feature_id === f?.id;
            }) &&
            features.some((f) => {
                return ViewshedTool.checkValidFeatureType(f);
            })
        ) {
            this.setVisibleLayer(false);
        }
        if (features.length === 1) {
            const feat = features[0];
            if (ViewshedTool.checkValidFeatureType(feat)) {
                this.setVisibleLayer(false);
                this.requestViewshedOverlay(feat.properties?.uuid);
            }
        }
    }

    drawSelectionChangeCallback(event: { features: Array<GeoJSON.Feature> }) {
        const features = event.features;
        this.dragging = false;
        if (features.length === 1) {
            if (features[0].id === this.last_selection) {
                this.dragging = true;
            } else {
                this.last_selection = features[0].id;
            }
        } else {
            this.last_selection = '';
        }

        if (
            features.length > 0 &&
            !features.some((f) => {
                return this.viewshed_feature_id === f?.id;
            }) &&
            features.some((f) => {
                return ViewshedTool.checkValidFeatureType(f);
            })
        ) {
            this.setVisibleLayer(false);
        }

        if (this.dragging) {
            this.setVisibleLayer(false);
        } else {
            if (features.length === 1) {
                const feat = features[0];
                if (ViewshedTool.checkValidFeatureType(feat)) {
                    this.requestViewshedOverlay(feat.properties?.uuid);
                }
            }
        }
    }

    drawDeleteCallback(event: { features: Array<GeoJSON.Feature> }) {
        const features = event.features;
        if (
            features.some((f) => {
                return this.viewshed_feature_id === f?.id;
            })
        ) {
            this.setVisibleLayer(false);
        }
    }

    requestViewshedOverlay(uuid: string) {
        $.ajax({
            url: djangoUrl('workspace:viewshed_overlay', uuid),
            method: 'GET',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
        .done((resp) => {
            this.updateViewshedImage('', resp);
        })
        .fail(() => {
            renderAjaxOperationFailed();
        });
    }

    setVisibleLayer(setVisible: boolean) {
        const layer = this.map.getLayer(VIEWSHED_TILE_OVERLAY_LAYER);
        if (layer) {
            this.map.setLayoutProperty(
                VIEWSHED_TILE_OVERLAY_LAYER,
                'visibility',
                setVisible ? 'visible' : 'none'
            );
        }
    }

    updateViewshedImage(msg: string, data: ViewShedResponse) {
        // Only Act on the websocket response if the user still has the AP selected
        const selected_features = this.draw.getSelected();
        const show_viewshed = selected_features.features.some((f) => {
            return f.properties?.uuid === data.uuid && ViewshedTool.checkValidFeatureType(f);
        });
        if (show_viewshed) {
            const matched_features = this.draw.getSelected().features.filter((f) => {
                return f.properties?.uuid === data.uuid;
            });
            if (matched_features.length > 0) {
                const id = matched_features[0].id;
                if (id !== undefined) {
                    this.viewshed_feature_id = id;
                }
            }
            const tileset_source = this.map.getSource(VIEWSHED_TILE_OVERLAY_SOURCE);
            if (tileset_source) {
                this.map.removeLayer(VIEWSHED_TILE_OVERLAY_LAYER);
                this.map.removeSource(VIEWSHED_TILE_OVERLAY_SOURCE);
            }
            this.map.addSource(VIEWSHED_TILE_OVERLAY_SOURCE, {
                type: 'raster',
                tiles: [data.base_url],
                scheme: 'tms',
                minzoom: data.minzoom,
                maxzoom: data.maxzoom
            });
            this.map.addLayer(
                {
                    id: VIEWSHED_TILE_OVERLAY_LAYER,
                    source: VIEWSHED_TILE_OVERLAY_SOURCE,
                    type: 'raster',
                    paint: {
                        'raster-opacity': 1.0
                    }
                },
                EMPTY_LAYER_AFTER_BUILDING
            );
        }
    }
}
