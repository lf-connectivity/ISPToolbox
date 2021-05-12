import mapboxgl, * as MapboxGL from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { LinkCheckBasePopup } from "./LinkCheckBasePopup";
import { AccessPoint } from "../../workspace/WorkspaceFeatures";
import { isUnitsUS } from '../../utils/MapPreferences';
import { ft2m, miles2km } from "../../LinkCalcUtils";
import * as StyleConstants from '../styles/StyleConstants';

var _ = require('lodash');

const NAME_INPUT_ID = 'name-input-tower-popup';
const LAT_INPUT_ID = 'lat-input-tower-popup';
const LNG_INPUT_ID = 'lng-input-tower-popup';
const HGT_INPUT_ID = 'hgt-input-tower-popup';
const CPE_HGT_INPUT_ID = 'cpe-hgt-input-tower-popup';
const RADIUS_INPUT_ID = 'radius-input-tower-popup';
const PLOT_LIDAR_BUTTON_ID = 'plot-lidar-coverage-btn-tower-popup';

enum ImperialToMetricConversion {
    FT_TO_M = 'ft2m',
    MI_TO_KM = 'mi2km'
}

const CONVERSION_FORMULAS: Map<ImperialToMetricConversion, (input: number) => number> = new Map();
CONVERSION_FORMULAS.set(ImperialToMetricConversion.FT_TO_M, (input: number) => {
    return isUnitsUS() ? ft2m(input) : input
});
CONVERSION_FORMULAS.set(ImperialToMetricConversion.MI_TO_KM, (input: number) => {
    return isUnitsUS() ? miles2km(input) : input
});

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

    protected cleanup() {
        if (!this.accessPointMoving) {
            this.accessPoint = undefined;
        }
    }

    protected setEventHandlers() {
        const updateAP = () => {
            if (this.accessPoint) {
                let feat = this.accessPoint.featureData;
                this.accessPoint.update(feat, (resp: any) => {
                    // @ts-ignore
                    this.map.fire('draw.update', {features: [feat]});
                });
            }
        };

        const createNumberChangeCallback = (id: string, property: string, conversionFormula: ImperialToMetricConversion) => {
            let htmlID = `#${id}`;
            $(htmlID).on('change',
                _.debounce((e: any) => {
                    let inputValue = parseFloat(String($(htmlID).val()));       
                    let transformedValue = (CONVERSION_FORMULAS.get(conversionFormula) as any)(inputValue);

                    // @ts-ignore
                    this.accessPoint.featureData.properties[property] = transformedValue;
                    updateAP();
                }, 500)
            );
        }

        const createCoordinateChangeCallback = (id: string, coord: number) => {
            let htmlID = `#${id}`;
            $(htmlID).on('change',
                _.debounce((e: any) => {
                    let newVal = parseFloat(String($(htmlID).val()));
                    // @ts-ignore
                    this.accessPoint.featureData.geometry.coordinates[coord] = newVal;

                    // @ts-ignore
                    this.draw.add(this.accessPoint.featureData);

                    // @ts-ignore
                    this.map.fire('draw.update', { features: [this.accessPoint.featureData]})
                }, 500)
            );
        }

        $(`#${NAME_INPUT_ID}`).on('input',
            _.debounce((e: any) => {
                let name = String($(`#${NAME_INPUT_ID}`).val());

                // @ts-ignore
                this.accessPoint.featureData.properties.name = name;
                updateAP();
            }, 500)
        );

        createNumberChangeCallback(HGT_INPUT_ID, 'height', ImperialToMetricConversion.FT_TO_M);
        createNumberChangeCallback(RADIUS_INPUT_ID, 'max_radius', ImperialToMetricConversion.MI_TO_KM);
        createNumberChangeCallback(CPE_HGT_INPUT_ID, 'default_cpe_height', ImperialToMetricConversion.FT_TO_M);

        createCoordinateChangeCallback(LAT_INPUT_ID, 1);
        createCoordinateChangeCallback(LNG_INPUT_ID, 0);
    }

    protected getStatsHTML() {
        if (this.accessPoint?.featureData.id){
            const feat = this.draw.get(this.accessPoint?.featureData.id as string);
            if(feat &&
                feat.properties?.serviceable != null && 
                feat.properties?.unknown != null && 
                feat.properties?.unserviceable != null){
                return `
                    <li class="stat-row">
                        <div class="ap-stat" style="border: 1px solid ${StyleConstants.SERVICEABLE_BUILDINGS_COLOR}">
                            <p class="ap-stat--label">Clear LOS Rooftops</p>
                            <p class="ap-stat--value" style="color: ${StyleConstants.SERVICEABLE_BUILDINGS_COLOR}">${
                                feat.properties?.serviceable
                            }</p>
                        </div>
                        <div class="ap-stat" style="border: 1px solid ${StyleConstants.UNSERVICEABLE_BUILDINGS_COLOR}">
                            <p class="ap-stat--label">Obstructed Rooftops</p>
                            <p class="ap-stat--value" style="color: ${StyleConstants.UNSERVICEABLE_BUILDINGS_COLOR}">${
                                feat.properties?.unserviceable
                            }</p>
                        </div>
                    </li>
            `;
            }
        }
        return '';
    }

    protected getHTML() {
        const sanitizeName = (name: string) => {
            return name.replace(/'/g, '&#39;');
        }

        return `
            <div class="tooltip--tower-summary">
                <div class="title"> 
                    <h6>Edit Tower</h6>
                </div>
                <div>
                    <ul>
                        <li class="name-row">
                            <input type='text' 
                                class="input--tower-name" 
                                id='${NAME_INPUT_ID}' 
                                value='${sanitizeName(this.accessPoint?.featureData.properties?.name)}' 
                                placeholder='Tower Name'>
                            <div class="coordinates">
                                <div class="data-with-unit">
                                    <input type='number'
                                            value='${this.accessPoint?.featureData.geometry.coordinates[1].toFixed(5)}'
                                            id='${LAT_INPUT_ID}'
                                            min='-90' max='90' step='.00001'
                                            placeholder='latitude'
                                            class="input--value"
                                    >
                                    <span>&deg;</span>
                                </div>
                                <span class="comma">,</span>
                                <div class="data-with-unit">
                                    <input type='number'
                                            value='${this.accessPoint?.featureData.geometry.coordinates[0].toFixed(5)}'
                                            id='${LNG_INPUT_ID}'
                                            min='-180' max='180' step='.00001'
                                            placeholder='longitude'
                                            class="input--value"
                                    >
                                    <span>&deg;</span>
                                </div>
                            </div>
                        </li>
                        <li>
                            <p class="label">Access Point <span>Height Above Ground</span></p>
                            <div class="data-with-unit">
                                <input type='number'
                                       value='${Math.round(
                                            isUnitsUS() ?
                                            this.accessPoint?.featureData.properties?.height_ft :
                                            this.accessPoint?.featureData.properties?.height
                                       )}'
                                       id='${HGT_INPUT_ID}'
                                       min='0' max='10000'
                                       class="input--value"
                                >
                                <span>${isUnitsUS() ? 'ft' : 'm'}</span>
                            </div>
                        </li>
                        <li>
                            <p class="label">Receiver Height <span>Height Above Surfaces</span></p>
                            <div class="data-with-unit">
                                <input type='number'
                                       value='${Math.round(
                                            isUnitsUS() ?
                                            this.accessPoint?.featureData.properties?.default_cpe_height_ft :
                                            this.accessPoint?.featureData.properties?.default_cpe_height
                                       )}'
                                       id='${CPE_HGT_INPUT_ID}'
                                       min='0' max='10000'
                                       class="input--value"
                                >
                                <span>${isUnitsUS() ? 'ft' : 'm'}</span>
                            </div>
                        </li>
                        <li>
                            <p class="label">Radius</p>
                            <div class="data-with-unit">
                                <input type='number'
                                       value='${
                                            isUnitsUS() ?
                                            this.accessPoint?.featureData.properties?.max_radius_miles.toFixed(2) :
                                            this.accessPoint?.featureData.properties?.max_radius.toFixed(2)
                                       }'
                                       id='${RADIUS_INPUT_ID}'
                                       min='0.01' max='100' step='0.01'
                                       class="input--value"
                                >
                                <span>${isUnitsUS() ? 'mi' : 'km'}</span>
                            </div>
                        </li>
                        ${this.getStatsHTML()}
                    </ul>
                </div>

                <div class="button-row">
                    <button class='btn btn-primary isptoolbox-btn' id='${PLOT_LIDAR_BUTTON_ID}'>Plot Lidar Coverage</button>
                    <p class="microcopy small">This may take several minutes</p>
                </div>
            </div>
        `;
    }
}