import mapboxgl, * as MapboxGL from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { LinkCheckBasePopup } from "./LinkCheckBasePopup";
import { AccessPoint } from "../../workspace/WorkspaceFeatures";
import { isUnitsUS } from '../../utils/MapPreferences';

const NAME_INPUT_ID = 'name-input-tower-popup';
const LAT_INPUT_ID = 'lat-input-tower-popup';
const LNG_INPUT_ID = 'lng-input-tower-popup';
const HGT_INPUT_ID = 'hgt-input-tower-popup';
const CPE_HGT_INPUT_ID = 'cpe-hgt-input-tower-popup';
const RADIUS_INPUT_ID = 'radius-input-tower-popup';
const PLOT_LIDAR_BUTTON_ID = 'plot-lidar-coverage-btn-tower-popup';

export class LinkCheckTowerPopup extends LinkCheckBasePopup {
    private accessPoint?: AccessPoint;
    private accessPointMoving: boolean;
    private static _instance: LinkCheckTowerPopup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        if (LinkCheckTowerPopup._instance) {
            return LinkCheckTowerPopup._instance;
        }
        super(map, draw);
        LinkCheckTowerPopup._instance = this;
    }

    getAccessPoint(): AccessPoint | undefined {
        return this.accessPoint;
    }

    setAccessPoint(accessPoint: AccessPoint) {
        this.accessPoint = accessPoint;

        // @ts-ignore
        this.setLngLat(accessPoint.featureData.geometry.coordinates);
    }

    onAPStartMoving() {
        this.accessPointMoving = true;
    }

    onAPStopMoving() {
        this.accessPointMoving = false;

        // @ts-ignore
        this.setLngLat(this.accessPoint.featureData.geometry.coordinates);
    }

    static getInstance() {
        if (LinkCheckTowerPopup._instance) {
            return LinkCheckTowerPopup._instance;
        }
        else {
            throw new Error('No instance of LinkCheckTowerPopup instantiated.')
        }
    }

    cleanup() {
        if (!this.accessPointMoving) {
            this.accessPoint = undefined;
        }
    }

    getHTML() {
        return `
            <div>
                <div>
                    <h6>Edit Tower</h6>
                </div>
                <div>
                    <input type='text' style='width: 225px' id='${NAME_INPUT_ID}' value='${this.accessPoint?.featureData.properties?.name}'>
                </div>
                <div>
                    <ul>
                        <li>
                            <p>Latitude</p>
                            <div>
                                <input type='number'
                                       value='${this.accessPoint?.featureData.geometry.coordinates[1].toFixed(5)}'
                                       id='${LAT_INPUT_ID}'
                                       min='-90' max='90' step='.00001'
                                >
                                <span>&deg;</span>
                            </div>
                        </li>
                        <li>
                            <p>Longitude</p>
                            <div>
                                <input type='number'
                                       value='${this.accessPoint?.featureData.geometry.coordinates[0].toFixed(5)}'
                                       id='${LNG_INPUT_ID}'
                                       min='-180' max='180' step='.00001'
                                >
                                <span>&deg;</span>
                            </div>
                        </li>
                        <li>
                            <p>Access Point Height</p>
                            <div>
                                <input type='number'
                                       value='${Math.round(
                                            isUnitsUS() ?
                                            this.accessPoint?.featureData.properties?.height_ft :
                                            this.accessPoint?.featureData.properties?.height
                                       )}'
                                       id='${HGT_INPUT_ID}'
                                       min='0' max='10000'
                                >
                                <span>${isUnitsUS() ? 'ft' : 'm'}</span>
                            </div>
                        </li>
                        <li>
                            <p>Receiver Height <span>(attachment height)</span></p>
                            <div>
                                <input type='number'
                                       value='${Math.round(
                                            isUnitsUS() ?
                                            this.accessPoint?.featureData.properties?.default_cpe_height_ft :
                                            this.accessPoint?.featureData.properties?.default_cpe_height
                                       )}'
                                       id='${CPE_HGT_INPUT_ID}'
                                       min='0' max='10000'
                                >
                                <span>${isUnitsUS() ? 'ft' : 'm'}</span>
                            </div>
                        </li>
                        <li>
                            <p>Radius</p>
                            <div>
                                <input type='number'
                                       value='${
                                            isUnitsUS() ?
                                            this.accessPoint?.featureData.properties?.max_radius_miles.toFixed(2) :
                                            this.accessPoint?.featureData.properties?.max_radius.toFixed(2)
                                       }'
                                       id='${RADIUS_INPUT_ID}'
                                       min='0.01' max='100' step='0.01'
                                >
                                <span>${isUnitsUS() ? 'mi' : 'km'}</span>
                            </div>
                        </li>
                    </ul>
                </div>

                <div class="button-row">
                    <button class='btn btn-primary isptoolbox-btn' id='${PLOT_LIDAR_BUTTON_ID}'>Plot Lidar Coverage</button>
                    <p>This may take several minutes</p>
                </div>
            </div>
        `;
    }
}