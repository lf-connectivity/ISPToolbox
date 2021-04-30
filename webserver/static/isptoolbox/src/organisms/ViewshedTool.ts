import MapboxDraw from '@mapbox/mapbox-gl-draw';
import mapboxgl from 'mapbox-gl';
import PubSub from 'pubsub-js';
import {LOSWSEvents, ViewShedResponse} from '../LOSCheckWS';
import {LOWEST_LAYER_LAYER} from '../LinkCheckPage';
import {EMPTY_LAYER_AFTER_BUILDING} from '../workspace/WorkspaceManager';

export enum ViewshedEvents {
    VS_REQUEST = 'vs.request',
    VS_COMPUTED = 'vs.computed',
    VS_LOAD = 'vs.load',
    VS_CLOSED = 'vs.closed',
}

const VIEWSHED_OVERLAY_SOURCE = 'isptoolbox.viewshedoverlay-source';
const VIEWSHED_OVERLAY_LAYER = 'isptoolbox.viewshedoverlay-layer';

export class ViewshedTool {
    map: mapboxgl.Map;
    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        this.map = map;
        PubSub.subscribe(LOSWSEvents.VIEWSHED_MSG, this.updateViewshedImage.bind(this));
        this.map.on('draw.selectionchange', () => {this.setVisibleLayer(false);});
        this.map.on('draw.modechange', () => {this.setVisibleLayer(false);});
        this.map.on('draw.delete', () => {this.setVisibleLayer(false);});
        this.map.on('sourcedata', (e) => {
            if (e.isSourceLoaded && e.source.type === 'image' && e.sourceId === VIEWSHED_OVERLAY_SOURCE) {
                this.setVisibleLayer(true);
            }
        });
    }

    setVisibleLayer(setVisible : boolean){
        const layer = this.map.getLayer(VIEWSHED_OVERLAY_LAYER)
        if (layer){
            this.map.setLayoutProperty(
                VIEWSHED_OVERLAY_LAYER,
                'visibility',
                setVisible ? 'visible' : 'none'
            );
        }
    }

    updateViewshedImage(msg: string, data: ViewShedResponse) {
        const source = this.map.getSource(VIEWSHED_OVERLAY_SOURCE);
        if(source){
            if (source.type === 'image') {
                source.updateImage({
                    url: data.url,
                    coordinates: data.coordinates.coordinates[0].slice(0,4)
                });
            }
        } else {
            this.map.addSource(VIEWSHED_OVERLAY_SOURCE, {
                type: 'image',
                url: data.url,
                coordinates: data.coordinates.coordinates[0].slice(0,4)
            });
            this.map.addLayer({
                "id": VIEWSHED_OVERLAY_LAYER,
                "source": VIEWSHED_OVERLAY_SOURCE,
                "type": "raster",
                "paint": {
                    "raster-opacity": 1.0
                }
            }, EMPTY_LAYER_AFTER_BUILDING);
        }
    }



}