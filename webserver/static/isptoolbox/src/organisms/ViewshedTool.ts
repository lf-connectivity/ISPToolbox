import MapboxDraw from '@mapbox/mapbox-gl-draw';
import mapboxgl from 'mapbox-gl';
import PubSub from 'pubsub-js';
import { LOSWSEvents, ViewShedResponse } from '../LOSCheckWS';
import { WorkspaceFeatureTypes } from '../workspace/WorkspaceConstants';
import { EMPTY_LAYER_AFTER_BUILDING } from './APCoverageRenderer';

export enum ViewshedEvents {
    VS_REQUEST = 'vs.request',
    VS_COMPUTED = 'vs.computed',
    VS_LOAD = 'vs.load',
    VS_CLOSED = 'vs.closed',
}

const VIEWSHED_TILE_OVERLAY_SOURCE = 'isptoolbox.viewshedoverlay-tile-source';
const VIEWSHED_TILE_OVERLAY_LAYER = 'isptoolbox.viewshedoverlay-tile-layer';
export class ViewshedTool {
    map: mapboxgl.Map;
    draw: MapboxDraw;
    viewshed_feature_id: string | number | null = null;
    static _instance: ViewshedTool;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        if (ViewshedTool._instance) {
            throw Error("This singleton has already been instantiated, use getInstance.");
        }
        this.map = map;
        this.draw = draw;
        PubSub.subscribe(LOSWSEvents.VIEWSHED_MSG, this.updateViewshedImage.bind(this));
        this.map.on('draw.selectionchange', this.drawSelectionChangeCallback.bind(this));
        this.map.on('draw.modechange', this.drawModeChangeCallback.bind(this));
        this.map.on('draw.delete', this.drawDeleteCallback.bind(this));
        this.map.on('sourcedata', (e) => {
            if (e.isSourceLoaded && e.source.type === 'raster' && e.sourceId === VIEWSHED_TILE_OVERLAY_SOURCE) {
                this.setVisibleLayer(true);
            }
        });
        ViewshedTool._instance = this;
    }

    static getInstance(): ViewshedTool {
        if (ViewshedTool._instance) {
            return ViewshedTool._instance;
        }
        else {
            throw new Error('No Instance of ViewshedTool instantiated.');
        }
    }

    drawSelectionChangeCallback({ features }: { features: Array<GeoJSON.Feature> }): void {

        if (features.length > 0 && !features.some((f) => {
            return this.viewshed_feature_id === f?.id;
        }) && features.some((f) => {return f.properties?.feature_type === WorkspaceFeatureTypes.AP})) {
            this.setVisibleLayer(false);
        }
    }

    drawModeChangeCallback({ mode }: { mode: string }): void {
        // this.setVisibleLayer(false);
    }

    drawDeleteCallback({ features }: { features: Array<GeoJSON.Feature> }): void {
        if (features.some((f) => {
            return this.viewshed_feature_id === f?.id;
        })) {
            this.setVisibleLayer(false);
        }
    }

    setVisibleLayer(setVisible: boolean) {
        const layer = this.map.getLayer(VIEWSHED_TILE_OVERLAY_LAYER)
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
            return f.properties?.uuid === data.uuid;
        });
        if (show_viewshed) {
            const matched_features = this.draw.getSelected().features.filter((f) => { return f.properties?.uuid === data.uuid; });
            if (matched_features.length > 0){
                const id = matched_features[0].id;
                if(id !== undefined){
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
                tiles: [
                    data.base_url,
                ],
                scheme: "tms",
                minzoom: 12,
            });
            this.map.addLayer({
                "id": VIEWSHED_TILE_OVERLAY_LAYER,
                "source": VIEWSHED_TILE_OVERLAY_SOURCE,
                "type": "raster",
                "paint": {
                    "raster-opacity": 1.0
                },
            }, EMPTY_LAYER_AFTER_BUILDING);
        }
    }
}