import mapboxgl, * as MapboxGL from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { getStreetAndAddressInfo } from '../../LinkCheckUtils';
import CollapsibleComponent from '../../atoms/CollapsibleComponent';

const DEFAULT_LNGLAT: [number, number] = [0.0, 0.0];

export const LOADING_SVG = `
    <svg
    class="loader-logo" 
    width="25"
    height="25"
    viewBox="0 0 157 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg">
    <rect
        width="23.9455"
        height="119.727"
        transform="matrix(-1 0 0 1 90.5199 0)"
        fill="#A8B0B7"
    />
    <path
        class="WispLoadingIcon_animatingRectangle"
        d="M0.124794 0H46.7554V35.288L0.124794 0Z"
        fill="#A8B0B7"
    />
    <path
        class="WispLoadingIcon_animatingRectangle"
        d="M156.97 0H110.339V35.288L156.97 0Z"
        fill="#A8B0B7"
    />
    </svg>
`;

export const ERROR_SVG = `
<svg width="22" height="21" viewBox="0 0 22 21" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.9996 17.8078C11.8068 17.8078 12.4612 17.1535 12.4612 16.3463C12.4612 15.5391 11.8068 14.8848 10.9996 14.8848C10.1924 14.8848 9.53809 15.5391 9.53809 16.3463C9.53809 17.1535 10.1924 17.8078 10.9996 17.8078Z" fill="#D82020"/>
    <path d="M11 7.57715V12.6925" stroke="#D82020" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M0.769043 20L10.9998 1L21.2306 20H0.769043Z" stroke="#D82020" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
</svg> 
`;

export function createLoadingHTMLContent(message: string = "Loading"){
    return `<div class="mapboxgl-popup--loading-tooltip"><div class="my-auto text-center">
        ${LOADING_SVG}<p>${message}</p></div></div>`
}

export function createErrorHTMLContent(title: string = "Unexpected Error", message: string= "Try reopening the tooltip") {
    return `<div class="mapboxgl-popup--loading-tooltip"><div class="my-auto text-center">
        ${ERROR_SVG}
            <h1>${title}</h1>
            <p>${message}</p>
        </div>
    </div>`
}

export abstract class LinkCheckBasePopup extends CollapsibleComponent {
    protected map: mapboxgl.Map;
    protected draw: MapboxDraw;
    protected street: string;
    protected city: string;
    protected lnglat: [number, number];
    protected popup: mapboxgl.Popup;

    protected cleanupCall: any;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        super();
        this.map = map;
        this.draw = draw;
        this.street = '';
        this.city = '';
        this.lnglat = DEFAULT_LNGLAT;
        this.popup = new window.mapboxgl.Popup({
            className: 'map-tooltip'
        });
        this.cleanupCall = this.cleanup.bind(this);
        this.popup.on('close', this.cleanupCall);
    }

    setAddress(address: string) {
        let response = getStreetAndAddressInfo(address);
        this.city = response.city;
        this.street = response.street;
    }

    setLngLat(lnglat: [number, number]) {
        this.lnglat = lnglat;
    }

    protected showComponent() {
        this.popup.setLngLat(this.lnglat);
        if (!this.popup.isOpen()) {
            this.popup.setHTML(this.getHTML());
            this.popup.addTo(this.map);
            this.setEventHandlers();
        }
    }

    protected hideComponent() {
        if (this.popup.isOpen()) {
            this.popup.remove();
        }
    }

    displayLatLng() {
        return `${this.lnglat[1].toFixed(5)}&deg;, ${this.lnglat[0].toFixed(5)}&deg;`;
    }

    /**
     * Hide all tooltips
     */
    protected onComponentShown(msg: any, { component }: { component: CollapsibleComponent }) {
        if (component !== this && component instanceof LinkCheckBasePopup) {
            this.hideComponent();
        }
        super.onComponentShown(msg, { component });
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
    static createPopupFromReverseGeocodeResponse(
        cls: any,
        lngLat: [number, number],
        response: any
    ) {
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
