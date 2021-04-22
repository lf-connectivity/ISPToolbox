import mapboxgl, * as MapboxGL from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";

const DEFAULT_STREET = 'Unknown Street Name';
const DEFAULT_CITY = 'Anytown, USA, 12345';
const DEFAULT_LNGLAT: [number, number] = [0.00000, 0.00000];

const US_STATE_ABBREVIATIONS = {
    'Alabama': 'AL',
    'Alaska': 'AK',
    'Arizona': 'AZ',
    'Arkansas': 'AR',
    'California': 'CA',
    'Connecticut': 'CT',
    'District of Columbia': 'DC',
    'Florida': 'FL',
    'Georgia': 'GA',
    'Hawaii': 'HI',
    'Idaho': 'ID',
    'Illinois': 'IL',
    'Indiana': 'IN',
    'Iowa': 'IA',
    'Kansas': 'KS',
    'Kentucky': 'KY',
    'Louisiana': 'LA',
    'Maine': 'ME',
    'Maryland': 'MD',
    'Massachusetts': 'MA',
    'Michigan': 'MI',
    'Minnesota': 'MN',
    'Mississippi': 'MS',
    'Missouri': 'MO',
    'Montana': 'MT',
    'Nebraska': 'NE',
    'Nevada': 'NV',
    'New Hampshire': 'NH',
    'New Jersey': 'NJ',
    'New Mexico': 'NM',
    'New York': 'NY',
    'North Carolina': 'NC',
    'North Dakota': 'ND',
    'Ohio': 'OH',
    'Oklahoma': 'OK',
    'Oregon': 'OR',
    'Pennsylvania': 'PA',
    'Rhode Island': 'RI',
    'South Carolina': 'SC',
    'South Dakota': 'SD',
    'Tennessee': 'TN',
    'Texas': 'TX',
    'Utah': 'UT',
    'Vermont': 'VT',
    'Virginia': 'VA',
    'Washington': 'WA',
    'West Virginia': 'WV',
    'Wisconsin': 'WI',
    'Wyoming': 'WY',
};

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
        this.street = DEFAULT_STREET;
        this.city = DEFAULT_CITY;
        this.lnglat = DEFAULT_LNGLAT;
        this.popup = new window.mapboxgl.Popup();

        this.popup.on('close', () => {
            this.cleanup();
        });
    }

    setAddress(address: string) {
        // Address should be in the form <stuff>, street, city, state ZIP CODE, USA
        let components = address.split(', ').reverse()
        
        // Change state name (state ZIP) to "<abbreviated state>, zip"
        let stateName = components[1].split(' ').slice(0, -1).join(' ');
        let zipCode = components[1].split(' ').slice(-1)[0];

        // @ts-ignore
        this.city = `${components[2]}, ${US_STATE_ABBREVIATIONS[stateName]}, ${zipCode}`;
        this.street = components[3] || DEFAULT_STREET;
    }

    setLngLat(lnglat: [number, number]) {
        this.lnglat = lnglat;
    }

    show() {
        this.popup.setLngLat(this.lnglat)
                  .setHTML(this.getHTML());

        if (!this.popup.isOpen()) {
            this.popup.addTo(this.map);
        }
    }

    hide() {
        if (this.popup.isOpen()) {
            this.popup.remove();
        }
    }

    displayLngLat() {
        return `(${this.lnglat[0].toFixed(5)}, ${this.lnglat[1].toFixed(5)})`
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
    abstract cleanup(): void;
}