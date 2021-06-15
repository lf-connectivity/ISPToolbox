// Create new mapbox Map
import * as MapboxGL from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
//@ts-ignore
import styles from "@mapbox/mapbox-gl-draw/src/lib/theme";

//@ts-ignore
const mapboxgl = window.mapboxgl;

const mapbox_draw_lib = window.MapboxDraw;

export class MarketEvaluatorPage {
    map: MapboxGL.Map;
    draw: MapboxDraw;

    constructor() {
        let initial_map_center = {'lon': 0, 'lat': 0};
        let initial_zoom = 17;

        try {
            // @ts-ignore
            initial_map_center = window.ISPTOOLBOX_SESSION_INFO.initialMapCenter.coordinates;
            // @ts-ignore
            initial_zoom = window.ISPTOOLBOX_SESSION_INFO.initialMapZoom;
        } catch (err) { }

        this.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/satellite-streets-v11', // stylesheet location
            center: initial_map_center, // starting position [lng, lat]
            zoom: initial_zoom, // starting zoom
        });

        this.map.on('load', () => {
        });
    }
}