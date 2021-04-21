import mapboxgl, * as MapboxGL from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { LinkCheckBasePopup } from "./LinkCheckBasePopup";

const DEFAULT_STREET = 'Unknown Street Name';
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

export class LinkCheckDrawPtPPopup extends LinkCheckBasePopup {
    private geocoder: any;
    private static _instance: LinkCheckDrawPtPPopup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw, geocoder: any) {
        if (LinkCheckDrawPtPPopup._instance) {
            return LinkCheckDrawPtPPopup._instance;
        }
        super(map, draw);
        this.geocoder = geocoder;
        LinkCheckDrawPtPPopup._instance = this;
    }

    show() {
        super.show();
        
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

        if (this.geocoder) {
            this.popup.on('close', () => {
                this.geocoder.clear();
            });
        }
    }

    hide() {
        super.hide();
        if (this.popup.isOpen()) {
            this.geocoder.clear();
        }
    }

    static getInstance() {
        if (LinkCheckDrawPtPPopup._instance) {
            return LinkCheckDrawPtPPopup._instance;
        }
        else {
            throw new Error('No instance of LinkCheckDrawPtPPopup instantiated.')
        }
    }

    protected getHTML() {
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