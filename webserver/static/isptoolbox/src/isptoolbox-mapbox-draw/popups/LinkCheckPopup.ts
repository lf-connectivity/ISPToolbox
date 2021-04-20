import mapboxgl, * as MapboxGL from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";

/**
 * Abstract class for popups with the buttons Draw PtP and Add Tower on them
 */
export abstract class LinkCheckPopup {
    private map: mapboxgl.Map;
    private draw: MapboxDraw;
    
    
}