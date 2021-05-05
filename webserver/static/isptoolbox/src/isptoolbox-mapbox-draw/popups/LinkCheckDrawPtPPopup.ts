import mapboxgl, * as MapboxGL from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { LinkCheckBasePopup } from "./LinkCheckBasePopup";

const DRAW_PTP_BUTTON_ID = 'draw-ptp-btn-popup';
const ADD_TOWER_BUTTON_ID = 'add-tower-btn-popup';

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

    protected setEventHandlers() {     
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
    }

    protected cleanup() {
        this.geocoder.clear();
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
        <div class="tooltip--location">
            <div class="title"> 
                <h6>${this.street}</h6>
            </div>
            <div class="description">
                <p>${this.city}</p>
                <p>${this.displayLatLng()}</p>
            </div>
            <div class="button-row">
                <button class='btn btn-primary isptoolbox-btn' id='${DRAW_PTP_BUTTON_ID}'>Draw PtP</button>
                <a id='${ADD_TOWER_BUTTON_ID}' class="link">Place Tower</a>
            </div>
        </div>
        `
    }
}