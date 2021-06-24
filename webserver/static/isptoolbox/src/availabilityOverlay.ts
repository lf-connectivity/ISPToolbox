import * as MapboxGL from "mapbox-gl";

//@ts-ignore
const mapboxgl = window.mapboxgl;

const LOW_RESOLUTION_LIDAR_AVAILABILITY_SOURCE = 'low-res-lidar-boundary-source';
const LOW_RESOLUTION_LIDAR_AVAILABILITY_LAYER = 'low-res-lidar-boundary-layer';
const HIGH_RESOLUTION_LIDAR_AVAILABILITY_SOURCE = 'high-res-lidar-boundary-source';
const HIGH_RESOLUTION_LODAR_AVAILABILITY_LAYER =  'high-res-lidar-boundary-layer';
const MAPBOX_OVERLAY_URL = 'isptoolbox.highreslidarboundary';
const MAPBOX_OVERLAY_LAYER = 'original';
const AVAILABILITY_PAINT_FILL_STYLE = {
    'fill-color': '#687B8B',
    'fill-opacity': 0.77
};

export default class LidarAvailabilityLayer{
    map: MapboxGL.Map;
    popup: MapboxGL.Popup;
    constructor(map: MapboxGL.Map,){
        this.map = map;
        this.popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: "lidar-availability-popup"
        });
        this.getHighResolutionTileSet();
    }

    getHighResolutionTileSet(){
        this.map.addSource(HIGH_RESOLUTION_LIDAR_AVAILABILITY_SOURCE, {
            type: 'vector',
            url: `mapbox://${MAPBOX_OVERLAY_URL}` //TODO: replace with overlay url object from server
        });
        this.map.addLayer({
            'id': HIGH_RESOLUTION_LODAR_AVAILABILITY_LAYER,
            'type': 'fill',
            'source': HIGH_RESOLUTION_LIDAR_AVAILABILITY_SOURCE,
            'source-layer': MAPBOX_OVERLAY_LAYER, // TODO: replace with source-layer from overlay object django
            'layout' : {},
            'paint': AVAILABILITY_PAINT_FILL_STYLE
        });
        this.map.on('mouseenter', HIGH_RESOLUTION_LODAR_AVAILABILITY_LAYER, (e: any) => {
            // Change the cursor style as a UI indicator.
            this.map.getCanvas().style.cursor = 'pointer';
            var description = 'LiDAR Data Not<br>Available Here'

             
            // Populate the popup and set its coordinates
            // based on the feature found.
            this.popup.setLngLat(e.lngLat).setHTML(description).addTo(this.map);
        });

        this.map.on('mousemove', HIGH_RESOLUTION_LODAR_AVAILABILITY_LAYER, (e : any) => {
            this.popup.setLngLat(e.lngLat);
        });
             
        this.map.on('mouseleave', HIGH_RESOLUTION_LODAR_AVAILABILITY_LAYER, (e : any)=> {
            this.map.getCanvas().style.cursor = '';
            this.popup.remove();
        });
    }

}