import mapboxgl, * as MapboxGL from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";

const DEFAULT_STREET = '123 Random Street';
const DEFAULT_CITY = 'Anytown, USA, 12345';
const DEFAULT_LATLNG: [number, number] = [0.00000, 0.00000];

const DRAW_PTP_BUTTON_ID = 'draw-ptp-btn-popup';
const ADD_TOWER_BUTTON_ID = 'add-tower-btn-popup';

const US_STATE_ABBREVIATIONS = {
    'Alabama': 'AL',
    'Alaska': 'AK',
    'Arizona': 'AZ',
    'Arkansas': 'AR',
    'California': 'CA',
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

export class LinkCheckDrawPtPPopup {
    private map: mapboxgl.Map;
    private draw: MapboxDraw;
    private geocoder: any;
    private street: string;
    private city: string;
    private lnglat: [number, number];
    private popup: mapboxgl.Popup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw, geocoder: any) {
        this.map = map;
        this.draw = draw;
        this.geocoder = geocoder;
        this.street = DEFAULT_STREET;
        this.city = DEFAULT_CITY;
        this.lnglat = DEFAULT_LATLNG;
        this.popup = new window.mapboxgl.Popup();;
    }

    setAddress(address: string) {
        // Address should be in the form <stuff>, street, city, state ZIP CODE, USA
        let components = address.split(', ').reverse()
        
        // Change state name (state ZIP) to "<abbreviated state>, zip"
        let stateName = components[1].split(' ').slice(0, -1).join(' ');
        let zipCode = components[1].split(' ').slice(-1)[0];

        // @ts-ignore
        this.city = `${components[2]}, ${US_STATE_ABBREVIATIONS[stateName]}, ${zipCode}`;
        this.street = components[3];
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
        
        $(`#${DRAW_PTP_BUTTON_ID}`).on('click', () => {
            //@ts-ignore
            this.draw.changeMode('draw_link', {start: this.lnglat});
            this.map.fire('draw.modechange', {mode: 'draw_link'});
            this.hide();
        });

        $(`#${ADD_TOWER_BUTTON_ID}`).on('click', () => {
            //@ts-ignore
            this.draw.changeMode('draw_radius', {start: this.lnglat});
            this.map.fire('draw.modechange', {mode: 'draw_radius'});
            this.hide();
        });

        this.popup.on('close', () => {
            this.geocoder.clear();
        });
    }

    hide() {
        if (this.popup.isOpen()) {
            this.popup.remove();
            this.geocoder.clear();
        }
    }

    private getHTML() {
        return `
        <center>
        <h6>${this.street}</h6>
        ${this.city}
        <br/>
        (${this.lnglat[0]}, ${this.lnglat[1]})
        <br/>
        <br/>
        <br/>
        <br/>
        <button class='btn btn-primary isptoolbox-btn' id='${DRAW_PTP_BUTTON_ID}'>Draw PtP</button>
        <br/>
        <button class='btn btn-primary isptoolbox-btn' id='${ADD_TOWER_BUTTON_ID}'>Place Tower</button>
        </center>
        `
    }
}