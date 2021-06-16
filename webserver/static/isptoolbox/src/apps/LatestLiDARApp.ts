import LidarAvailabilityLayer from '../availabilityOverlay';
import mapboxgl, * as MapboxGL from "mapbox-gl";
const NEW_GIS_DATA_SOURCE = 'new-gis-source';
const NEW_GIS_DATA_LAYER = 'new-gis-layer';
const GIS_LAYER_PATH = 'https://static.isptoolbox.io/static/';

const SVG_ARROW = `<svg width="25" height="26" viewBox="0 0 25 26" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5.94922 19.9369L18.4658 7.42039M9.27442 6.71337L18.9371 6.94904L19.1728 16.6117" stroke="white" stroke-width="1.5"/>
</svg>`;
class NewGISDataLayer {
    popup : mapboxgl.Popup;
    popupCTA: mapboxgl.Popup;

    constructor(private map: mapboxgl.Map, private month: string, private year: string){
        this.popup = new window.mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: "lidar-availability-popup"
        });
        this.popupCTA = new window.mapboxgl.Popup({
            closeButton: false,
            closeOnClick: true,
            className: "lidar-availability-popup"
        });
        map.addSource(NEW_GIS_DATA_SOURCE, {
            type: 'geojson',
            data: { type: 'FeatureCollection', 'features': [] }
        });
        map.addLayer({
            id: NEW_GIS_DATA_LAYER,
            source: NEW_GIS_DATA_SOURCE,
            type: 'fill',
            layout: {
            },
            paint: {
                "fill-color": "#9540ea",
                "fill-opacity": 0.5,
            }
        });
             
        this.map.on('mouseenter', NEW_GIS_DATA_LAYER, (e: any) => {
            // Change the cursor style as a UI indicator.
            this.map.getCanvas().style.cursor = 'pointer';
            var description = `Newly Added Data for ${this.month}/${this.year}`
            // Populate the popup and set its coordinates
            // based on the feature found.
            this.popup.setLngLat(e.lngLat).setHTML(description).addTo(this.map);
        });

        this.map.on('mousemove', NEW_GIS_DATA_LAYER, (e : any) => {
            this.popup.setLngLat(e.lngLat);
        });
                
        this.map.on('mouseleave', NEW_GIS_DATA_LAYER, (e : any)=> {
            this.map.getCanvas().style.cursor = '';
            this.popup.remove();
        });

        this.map.on('click', NEW_GIS_DATA_LAYER, (e: any) => {
            const params = new URLSearchParams({
                lat: e.lngLat.lat,
                lon: e.lngLat.lng,
            });
            var description = `<a target="_parent" href="/demo/los-check/?${params.toString()}">Explore Region in LiDAR LOS Tool ${SVG_ARROW}</a>`
            this.popupCTA.setLngLat(e.lngLat).setHTML(description).addTo(this.map);
        });
        const geojson_filename = `${year}-${month}-01-latest-added-pt-clouds.geojson`;
        const url = GIS_LAYER_PATH  + geojson_filename;
        $.getJSON(url, this.ajaxcallback.bind(this));
    }

    ajaxcallback(data: any, status: string){
        if (status === 'success') {
            const source = this.map.getSource(NEW_GIS_DATA_SOURCE);
            if (source && source.type === 'geojson') {
                source.setData(data);
            }
        }
    };  


}

$(() => {
    // Document Ready, Time to Party
    //@ts-ignore
    window.mapboxgl.accessToken = window.mapbox_access_token;
    const map = new window.mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/satellite-streets-v11', // stylesheet location
        zoom: 3,
        center: [-98.583333, 39.8333],

    });
    map.on('load', () => {
        new LidarAvailabilityLayer(map);
        const { month, year } = getRequestedDateTime();
        new NewGISDataLayer(map, month, year);
    })
});

function getRequestedDateTime() {
    const month = JSON.parse(document.getElementById('month-gis-data')?.textContent ?? '');
    const year = JSON.parse(document.getElementById('year-gis-data')?.textContent ?? '');
    return { month, year };
}