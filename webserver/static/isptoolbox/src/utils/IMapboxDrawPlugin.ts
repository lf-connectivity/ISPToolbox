import MapboxDraw from '@mapbox/mapbox-gl-draw';
import mapboxgl from 'mapbox-gl';

export interface IMapboxDrawPlugin {
    drawCreateCallback? (event: { features: Array<GeoJSON.Feature> }) : void;
    drawDeleteCallback? (event: { features: Array<GeoJSON.Feature> }) : void;
    drawCombineCallback? (event: {
        deletedFeatures: Array<GeoJSON.Feature>;
        createdFeatures: Array<GeoJSON.Feature>;
    }) : void;
    drawUncombineCallback? (event: {
        deletedFeatures: Array<GeoJSON.Feature>;
        createdFeatures: Array<GeoJSON.Feature>;
    }) : void;
    drawUpdateCallback? (event: {
        features: Array<GeoJSON.Feature>;
        action: 'move' | 'change_coordinates';
    }) : void;
    drawSelectionChangeCallback? (event: { features: Array<GeoJSON.Feature> }): void;
    drawModeChangeCallback? (event: { mode: MapboxDraw.DrawMode }) : void;
    drawRenderCallback? (): void;
    drawActionableCallback? (event: {
        actions: {
            trash: boolean;
            combineFeatures: boolean;
            uncombineFeatures: boolean;
        };
    }): void;
}

export function initializeMapboxDrawInterface(interfaceInit: IMapboxDrawPlugin, map: mapboxgl.Map){
    interfaceInit.drawCreateCallback ? map.on('draw.create', interfaceInit.drawCreateCallback.bind(interfaceInit)) : null;
    interfaceInit.drawDeleteCallback ? map.on('draw.delete', interfaceInit.drawDeleteCallback.bind(interfaceInit)) : null;
    interfaceInit.drawCombineCallback ? map.on('draw.combine', interfaceInit.drawCombineCallback.bind(interfaceInit)) : null;
    interfaceInit.drawUncombineCallback ? map.on('draw.uncombine', interfaceInit.drawUncombineCallback.bind(interfaceInit)) : null;
    interfaceInit.drawUpdateCallback ? map.on('draw.update', interfaceInit.drawUpdateCallback.bind(interfaceInit)) : null;
    interfaceInit.drawModeChangeCallback ? map.on('draw.modechange', interfaceInit.drawModeChangeCallback.bind(interfaceInit)) : null;
    interfaceInit.drawSelectionChangeCallback ? map.on('draw.selectionchange', interfaceInit.drawSelectionChangeCallback.bind(interfaceInit)) : null;
    interfaceInit.drawRenderCallback ? map.on('draw.render', interfaceInit.drawRenderCallback.bind(interfaceInit)) : null;
    interfaceInit.drawActionableCallback ? map.on('draw.actionable', interfaceInit.drawActionableCallback.bind(interfaceInit)) : null;
}

export function deactivateMapboxDrawInterface(interfaceInit: IMapboxDrawPlugin, map: mapboxgl.Map)
{
    interfaceInit.drawCreateCallback ? map.off('draw.create', interfaceInit.drawCreateCallback.bind(interfaceInit)) : null;
    interfaceInit.drawDeleteCallback ? map.off('draw.delete', interfaceInit.drawDeleteCallback.bind(interfaceInit)) : null;
    interfaceInit.drawCombineCallback ? map.off('draw.combine', interfaceInit.drawCombineCallback.bind(interfaceInit)) : null;
    interfaceInit.drawUncombineCallback ? map.off('draw.uncombine', interfaceInit.drawUncombineCallback.bind(interfaceInit)) : null;
    interfaceInit.drawUpdateCallback ? map.off('draw.update', interfaceInit.drawUpdateCallback.bind(interfaceInit)) : null;
    interfaceInit.drawModeChangeCallback ? map.off('draw.modechange', interfaceInit.drawModeChangeCallback.bind(interfaceInit)) : null;
    interfaceInit.drawSelectionChangeCallback ? map.off('draw.selectionchange', interfaceInit.drawSelectionChangeCallback.bind(interfaceInit)) : null;
    interfaceInit.drawRenderCallback ? map.off('draw.render', interfaceInit.drawRenderCallback.bind(interfaceInit)) : null;
    interfaceInit.drawActionableCallback ? map.off('draw.actionable', interfaceInit.drawActionableCallback.bind(interfaceInit)) : null;
}