import mapboxgl, * as MapboxGL from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { getStreetAndAddressInfo } from "../../LinkCheckUtils";

const DEFAULT_LNGLAT: [number, number] = [0.00000, 0.00000];

export abstract class LinkCheckBasePopup {
    protected map: mapboxgl.Map;
    protected draw: MapboxDraw;
    protected street: string;
    protected city: string;
    protected lnglat: [number, number];
    protected popup: mapboxgl.Popup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        this.map = map;
        this.draw = draw;
        this.street = '';
        this.city = '';
        this.lnglat = DEFAULT_LNGLAT;
        this.popup = new window.mapboxgl.Popup({
            className: "lineofsight-tooltip"
        });
        this.popup.on('close', () => {
            this.cleanup();
        });
    }

    setAddress(address: string) {
        let response = getStreetAndAddressInfo(address);
        this.city = response.city;
        this.street = response.street;
    }

    setLngLat(lnglat: [number, number]) {
        this.lnglat = lnglat;
    }

    show() {
        this.popup.setLngLat(this.lnglat)
        if (!this.popup.isOpen()) {
            this.popup.setHTML(this.getHTML());
            this.popup.addTo(this.map);
            this.setEventHandlers();
        }
    }

    hide() {
        if (this.popup.isOpen()) {
            this.popup.remove();
        }
    }

    displayLatLng() {
        return `${this.lnglat[1].toFixed(5)}&deg;, ${this.lnglat[0].toFixed(5)}&deg;`
    }

    /**
     * Creates a popup of the type class (must be singleton) at the specified lat/long
     * with the given mapbox reverse geocode response. Must be done from within the success
     * callback of a mapbox sdk reverse geocode call.
     * 
     * @param cls Class of popup to set
     * @param lngLat Long/lat
     * @param response Mapbox Reverse Geocode response
     * @returns A popup instance of the specified class, set to the correct address and coordinates.
     */
    static createPopupFromReverseGeocodeResponse(cls: any, lngLat: [number, number], response: any) {
        let result = response.body.features;
        let popup = cls.getInstance();
        popup.setLngLat(lngLat);

        // Choose the best fitting/most granular result. Might not have
        // a street address in all cases though.
        popup.setAddress(result[0].place_name);
        return popup;
    }

    protected abstract getHTML(): string;
    protected abstract cleanup(): void;
    protected abstract setEventHandlers(): void;
}
