// (c) Meta Platforms, Inc. and affiliates. Copyright
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import mapboxgl from "mapbox-gl";
import { IMapboxDrawPlugin, initializeMapboxDrawInterface } from "./utils/IMapboxDrawPlugin";
import { LOWEST_LAYER_LAYER } from "./isptoolbox-mapbox-draw/styles/StyleConstants";

export const HOVER_POINT_SOURCE = 'hover-point-link-source';
export const HOVER_POINT_LAYER = 'hover-point-link-layer';
export const SELECTED_LINK_SOURCE = 'selected-link-source';
export const SELECTED_LINK_LAYER = 'selected-link-layer';

export class LinkCheckPTPOverlay implements IMapboxDrawPlugin {
    highlightedLinkId : string | number | undefined;
    constructor(private map: mapboxgl.Map, private draw: MapboxDraw){
        initializeMapboxDrawInterface(this, map);
        this.map.addSource(SELECTED_LINK_SOURCE, {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });
        this.map.addLayer(
            {
                id: SELECTED_LINK_LAYER,
                type: 'line',
                source: SELECTED_LINK_SOURCE,
                layout: {
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#FFFFFF',
                    'line-width': 7
                }
            },
            LOWEST_LAYER_LAYER
        );
        this.map.addSource(HOVER_POINT_SOURCE, {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });

        // HOVER POINT MAP LAYERS
        this.map.addLayer(
            {
                id: `${HOVER_POINT_LAYER}_halo`,
                type: 'circle',
                source: HOVER_POINT_SOURCE,
                paint: {
                    'circle-radius': 7,
                    'circle-color': '#FFFFFF'
                }
            },
            LOWEST_LAYER_LAYER
        );

        this.map.addLayer(
            {
                id: HOVER_POINT_LAYER,
                type: 'circle',
                source: HOVER_POINT_SOURCE,
                paint: {
                    'circle-radius': 5,
                    'circle-color': '#3887be'
                }
            },
            LOWEST_LAYER_LAYER
        );
    }

    drawDeleteCallback(event: {features: Array<GeoJSON.Feature>}) {
        const selected_link_source = this.map.getSource(SELECTED_LINK_SOURCE);
        if (selected_link_source.type === 'geojson') {
            if(event.features.filter( f => f.id === this.highlightedLinkId)){
                selected_link_source.setData({ type: 'FeatureCollection', features: [] });
            }
        }
    }

    drawSelectionChangeCallback (event: { features: Array<GeoJSON.Feature> })
    {
        if(event.features.length === 1){
            const feat = event.features[0];
            if( feat.geometry.type === "LineString"){
                const selected_link_source =
                    this.map.getSource(SELECTED_LINK_SOURCE);
                if (selected_link_source.type === 'geojson') {
                    selected_link_source.setData({
                        type: 'FeatureCollection',
                        features: [feat]
                    });
                    this.highlightedLinkId = feat.id;
                }
            }
        }
    }

    drawUpdateCallback(event: { 
        features: Array<GeoJSON.Feature>;
        action: 'move' | 'change_coordinates';
    }){
        if(event.features.length === 1){
            const feat = event.features[0];
            if( feat.geometry.type === "LineString"){
                const selected_link_source =
                    this.map.getSource(SELECTED_LINK_SOURCE);
                if (selected_link_source.type === 'geojson') {
                    selected_link_source.setData({
                        type: 'FeatureCollection',
                        features: [feat]
                    });
                    this.highlightedLinkId = feat.id;
                }
            }
        }
    }

    drawCreateCallback (event: { features: Array<GeoJSON.Feature> }){
        if(event.features.length === 1){
            const feat = event.features[0];
            if( feat.geometry.type === "LineString"){
                const selected_link_source =
                    this.map.getSource(SELECTED_LINK_SOURCE);
                if (selected_link_source.type === 'geojson') {
                    selected_link_source.setData({
                        type: 'FeatureCollection',
                        features: [feat]
                    });
                    this.highlightedLinkId = feat.id;
                }
            }
        }
    }
}