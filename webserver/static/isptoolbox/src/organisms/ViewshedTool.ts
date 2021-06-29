import MapboxDraw from '@mapbox/mapbox-gl-draw';
import mapboxgl from 'mapbox-gl';
import PubSub from 'pubsub-js';
import { LOSWSEvents, ViewShedResponse } from '../LOSCheckWS';
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
    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        this.map = map;
        this.draw = draw;
        PubSub.subscribe(LOSWSEvents.VIEWSHED_MSG, this.updateViewshedImage.bind(this));
        this.map.on('draw.selectionchange', () => { this.setVisibleLayer(false); });
        this.map.on('draw.modechange', () => { this.setVisibleLayer(false); });
        this.map.on('draw.delete', () => { this.setVisibleLayer(false); });
        this.map.on('sourcedata', (e) => {
            if (e.isSourceLoaded && e.source.type === 'raster' && e.sourceId === VIEWSHED_TILE_OVERLAY_SOURCE) {
                this.setVisibleLayer(true);
            }
        });
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