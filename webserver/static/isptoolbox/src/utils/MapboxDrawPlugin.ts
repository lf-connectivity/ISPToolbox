import MapboxDraw from '@mapbox/mapbox-gl-draw';
import mapboxgl from 'mapbox-gl';

export abstract class IMapboxDrawPlugin {
    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        map.on('draw.create', this.drawCreateCallback.bind(this));
        map.on('draw.delete', this.drawDeleteCallback.bind(this));
        map.on('draw.combine', this.drawCombineCallback.bind(this));
        map.on('draw.uncombine', this.drawUncombineCallback.bind(this));
        map.on('draw.update', this.drawUpdateCallback.bind(this));
        map.on('draw.modechange', this.drawModeChangeCallback.bind(this));
        map.on('draw.selectionchange', this.drawSelectionChangeCallback.bind(this));
        map.on('draw.render', this.drawRenderCallback.bind(this));
        map.on('draw.actionable', this.drawActionableCallback.bind(this));
    }
    drawCreateCallback(event: { features: Array<GeoJSON.Feature> }) {}
    drawDeleteCallback(event: { features: Array<GeoJSON.Feature> }) {}
    drawCombineCallback(event: {
        deletedFeatures: Array<GeoJSON.Feature>;
        createdFeatures: Array<GeoJSON.Feature>;
    }) {}
    drawUncombineCallback(event: {
        deletedFeatures: Array<GeoJSON.Feature>;
        createdFeatures: Array<GeoJSON.Feature>;
    }) {}
    drawUpdateCallback(event: {
        features: Array<GeoJSON.Feature>;
        action: 'move' | 'change_coordinates';
    }) {}
    drawSelectionChangeCallback(event: { features: Array<GeoJSON.Feature> }) {}
    drawModeChangeCallback(event: { mode: MapboxDraw.DrawMode }) {}
    drawRenderCallback() {}
    drawActionableCallback(event: {
        actions: {
            trash: boolean;
            combineFeatures: boolean;
            uncombineFeatures: boolean;
        };
    }) {}
}
