import mapboxgl, * as MapboxGL from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { LinkCheckBasePopup } from "./LinkCheckBasePopup";
import { AccessPoint } from "../../workspace/WorkspaceFeatures";
import { isUnitsUS } from '../../utils/MapPreferences';
import { ft2m, miles2km } from "../../LinkCalcUtils";
import * as StyleConstants from '../styles/StyleConstants';
import ap_icon from '../styles/ap-icon.svg';
import pass_svg from '../styles/pass-icon.svg';
import fail_svg from '../styles/fail-icon.svg';
import {
    MIN_RADIUS, MAX_RADIUS, MIN_LAT, MAX_LAT, MIN_LNG, MAX_LNG, MAX_HEIGHT, MIN_HEIGHT,
    validateName, validateLat, validateLng, validateRadius, validateHeight
} from '../../LinkCheckUtils';
import { sanitizeString } from "../../molecules/InputValidator";
import { parseFormLatitudeLongitude } from "../../utils/LatLngInputUtils";
import { LOSWSEvents, ViewshedProgressResponse, ViewshedUnexpectedError } from "../../LOSCheckWS";

var _ = require('lodash');

const NAME_INPUT_ID = 'name-input-tower-popup';
const LAT_LNG_INPUT_ID = 'lat-lng-input-tower-popup';
const HGT_INPUT_ID = 'hgt-input-tower-popup';
const CPE_HGT_INPUT_ID = 'cpe-hgt-input-tower-popup';
const RADIUS_INPUT_ID = 'radius-input-tower-popup';
const STATS_LI_ID = 'stats-li-tower-popup';
const PLOT_COVERAGE_BUTTON_ID = 'plot-estimated-coverage-button-tower-popup';
const COVERAGE_LI_ID = 'coverage-li-tower-popup';
const TOWER_DELETE_BUTTON_ID = 'tower-delete-btn';
const DELETE_ROW_DIV_ID = 'delete-tower-row-tower-popup';

enum ImperialToMetricConversion {
    FT_TO_M = 'ft2m',
    MI_TO_KM = 'mi2km'
}

const DEBOUNCE_TIME = 200;

const CONVERSION_FORMULAS: Map<ImperialToMetricConversion, (input: number) => number> = new Map();
CONVERSION_FORMULAS.set(ImperialToMetricConversion.FT_TO_M, (input: number) => {
    return isUnitsUS() ? ft2m(input) : input
});
CONVERSION_FORMULAS.set(ImperialToMetricConversion.MI_TO_KM, (input: number) => {
    return isUnitsUS() ? miles2km(input) : input
});

export abstract class BaseTowerPopup extends LinkCheckBasePopup {
    protected accessPoint?: AccessPoint;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        super(map, draw);
    }

    getAccessPoint(): AccessPoint | undefined {
        return this.accessPoint;
    }

    setAccessPoint(accessPoint: AccessPoint) {
        this.accessPoint = accessPoint;

        // @ts-ignore
        this.setLngLat(accessPoint.getFeatureGeometryCoordinates());
    }

    isAPMoving() {
        if (!this.accessPoint) {
            return false;
        }
        let coords = this.accessPoint.getFeatureGeometryCoordinates();
        return (coords[0] !== this.lnglat[0] || coords[1] !== this.lnglat[1]);
    }

    onAPUpdate(ap: AccessPoint) {
        if (this.accessPoint === ap) {
            this.refreshPopup();
            // Adjust lat/lng/height if they have been changed from bottom bar
            let coord = this.accessPoint.getFeatureGeometryCoordinates();
            let coord_input = parseFormLatitudeLongitude(`#${LAT_LNG_INPUT_ID}`);
            if (coord_input != null) {
                if (String(coord_input[0]) !== coord[1].toFixed(5) ||
                    String(coord_input[1]) !== coord[0].toFixed(5)) {
                    $(`#${LAT_LNG_INPUT_ID}`).val(`${coord[1].toFixed(5)}, ${coord[0].toFixed(5)}`);
                    this.setLngLat([coord[0], coord[1]]);
                    this.popup.setLngLat(this.lnglat);
                }
            }

            $(`#${HGT_INPUT_ID}`).val(this.getHeightValue());
            $(`#${DELETE_ROW_DIV_ID}`).html(this.getDeleteRow());
            this.setEventHandlers();
        }
    }

    protected cleanup() { }

    protected getHeightValue() {
        return Math.round(
            isUnitsUS() ?
                this.accessPoint?.getFeatureProperty('height_ft') :
                this.accessPoint?.getFeatureProperty('height')
        )
    }

    protected setEventHandlers() {
        const updateAP = () => {
            if (this.accessPoint) {
                let feat = this.accessPoint.getFeatureData();
                this.map.fire('draw.update', { features: [feat] });
            }
        };

        const createNumberChangeCallback = (id: string, property: string, conversionFormula: ImperialToMetricConversion,
            validatorFunction: (n: number, id: string) => number) => {
            let htmlID = `#${id}`;
            $(htmlID).on('change',
                _.debounce((e: any) => {
                    let inputValue = validatorFunction(parseFloat(String($(htmlID).val())), id);
                    let transformedValue = (CONVERSION_FORMULAS.get(conversionFormula) as any)(inputValue);

                    // @ts-ignore
                    this.accessPoint?.setFeatureProperty(property, transformedValue);
                    updateAP();
                }, DEBOUNCE_TIME)
            );
        }

        const createCoordinateChangeCallback = (id: string) => {
            let htmlID = `#${id}`;
            $(htmlID).on('change',
                _.debounce((e: any) => {
                    let newVal = parseFormLatitudeLongitude(htmlID);
                    if (newVal != null && this.accessPoint) {
                        newVal = [newVal[1], newVal[0]];
                        this.lnglat = newVal;
                        this.popup.setLngLat(this.lnglat);
                        this.accessPoint.move(newVal);
                    }
                }, DEBOUNCE_TIME)
            );
        }

        $(`#${TOWER_DELETE_BUTTON_ID}`).off().on('click', () => {
            $(`#ap-delete-confirm-btn`).off().on('click', () => {
                this.map.fire('draw.delete', {features: [this.accessPoint?.getFeatureData()]});
            });
        });

        $(`#${NAME_INPUT_ID}`).on('input',
            _.debounce((e: any) => {
                let name = validateName(String($(`#${NAME_INPUT_ID}`).val()), NAME_INPUT_ID);

                this.accessPoint?.setFeatureProperty('name', name);
                updateAP();
            }, DEBOUNCE_TIME)
        );

        createNumberChangeCallback(HGT_INPUT_ID, 'height', ImperialToMetricConversion.FT_TO_M, validateHeight);
        createNumberChangeCallback(RADIUS_INPUT_ID, 'max_radius', ImperialToMetricConversion.MI_TO_KM, validateRadius);
        createNumberChangeCallback(CPE_HGT_INPUT_ID, 'default_cpe_height', ImperialToMetricConversion.FT_TO_M, validateHeight);

        createCoordinateChangeCallback(LAT_LNG_INPUT_ID);
    }

    protected getHTML() {
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
                                value='${sanitizeString(this.accessPoint?.getFeatureProperty('name'))}' 
                                placeholder='Tower Name'>
                            <div class="coordinates">
                                <div class="data-with-unit">
                                    <input type='text'
                                            value='${this.accessPoint?.getFeatureGeometryCoordinates()[1].toFixed(5)}, ${this.accessPoint?.getFeatureGeometryCoordinates()[0].toFixed(5)}'
                                            id='${LAT_LNG_INPUT_ID}'
                                            placeholder='latitude, longitude'
                                            class="input--value"
                                    >
                                </div>
                            </div>
                        </li>
                        <li>
                            <p class="label">Access Point<span>Height Above Ground</span></p>
                            <div class="data-with-unit">
                                <input type='number'
                                       value='${this.getHeightValue()}'
                                       id='${HGT_INPUT_ID}'
                                       min='${MIN_HEIGHT}' max='${MAX_HEIGHT}'
                                       class="input--value"
                                >
                                <span>${isUnitsUS() ? 'ft' : 'm'}</span>
                            </div>
                        </li>
                        <li>
                            <p class="label">Customer Antenna<span>Height Above Surfaces</span></p>
                            <div class="data-with-unit">
                                <input type='number'
                                       value='${Math.round(
            isUnitsUS() ?
                this.accessPoint?.getFeatureProperty('default_cpe_height_ft') :
                this.accessPoint?.getFeatureProperty('default_cpe_height')
        )}'
                                       id='${CPE_HGT_INPUT_ID}'
                                       min='${MIN_HEIGHT}' max='${MAX_HEIGHT}'
                                       class="input--value"
                                >
                                <span>${isUnitsUS() ? 'ft' : 'm'}</span>
                            </div>
                        </li>
                        <li>
                            <p class="label">Radius</p>
                            <div class="data-with-unit">
                                <input type='number'
                                       value='${isUnitsUS() ?
                this.accessPoint?.getFeatureProperty('max_radius_miles').toFixed(2) :
                this.accessPoint?.getFeatureProperty('max_radius').toFixed(2)
            }'
                                       id='${RADIUS_INPUT_ID}'
                                       min='${MIN_RADIUS}' max='${MAX_RADIUS}' step='0.01'
                                       class="input--value"
                                >
                                <span>${isUnitsUS() ? 'mi' : 'km'}</span>
                            </div>
                        </li>
                        ${this.getAdditionalInfo()}
                        <div class="node-edits" id="${DELETE_ROW_DIV_ID}">
                            ${this.getDeleteRow()}
                        </div>
                    </ul>
                </div>
            </div>
        `;
    }

    protected getAdditionalInfo(): string {
        return '';
    }

    protected refreshPopup(): void {
    }

    protected getDeleteRow() {
        return `
            <a id="${TOWER_DELETE_BUTTON_ID}" data-toggle="modal" data-target="#apDeleteModal">Delete Tower</a>
            ${this.accessPoint && this.accessPoint.getFeatureProperty('last_updated') ?
                `<p>Last edited ${this.accessPoint.getFeatureProperty('last_updated')}</p>` : ''
            }
        `;
    }
}

export class LinkCheckTowerPopup extends BaseTowerPopup {
    private static _instance: LinkCheckTowerPopup;
    private progress_message: string | null;
    private time_remaining: number | null;
    private error: string | null;
    private interval: NodeJS.Timeout | null;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        if (LinkCheckTowerPopup._instance) {
            return LinkCheckTowerPopup._instance;
        }
        super(map, draw);
        LinkCheckTowerPopup._instance = this;
        this.progress_message = null;
        this.time_remaining = null;
        this.error = null;
        this.interval = null;
        PubSub.subscribe(LOSWSEvents.VIEWSHED_PROGRESS_MSG, this.updateProgressStatus.bind(this));
        PubSub.subscribe(LOSWSEvents.VIEWSHED_UNEXPECTED_ERROR_MSG, this.updateErrorStatus.bind(this));
    }

    static getInstance() {
        if (LinkCheckTowerPopup._instance) {
            return LinkCheckTowerPopup._instance;
        }
        else {
            throw new Error('No instance of LinkCheckTowerPopup instantiated.')
        }
    }

    protected getAdditionalInfo() {
        return `
            <li class="stat-row" id='${STATS_LI_ID}'>
                ${this.getStatsHTML()}
            </li>
        `;
    }

    protected getStatsHTML() {
        if (this.accessPoint) {
            if (this.accessPoint.getFeatureProperty('serviceable') != null &&
                this.accessPoint.getFeatureProperty('unserviceable') != null &&
                this.accessPoint.getFeatureProperty('unknown') != null &&
                this.accessPoint.getFeatureProperty('unknown') === 0) {
                return `
                    <div class="ap-stat">
                        <p class="ap-stat--label">Clear LOS Rooftops</p>
                        <p class="ap-stat--value" style="color: ${StyleConstants.SERVICEABLE_BUILDINGS_COLOR}">
                            <span class="ap-stat--icon"><img src="${pass_svg}"/></span>
                            ${this.accessPoint.getFeatureProperty('serviceable')}
                        </p>
                    </div>
                    <div class="ap-stat">
                        <p class="ap-stat--label">Obstructed Rooftops</p>
                        <p class="ap-stat--value" style="color: ${StyleConstants.UNSERVICEABLE_BUILDINGS_COLOR}">
                            <span class="ap-stat--icon"><img src="${fail_svg}"/></span>
                            ${this.accessPoint.getFeatureProperty('unserviceable')}
                        </p>
                    </div>
            `;
            }
        }
        if (this.error === null) {
            return `
            <div align="center">
                <img src="${ap_icon}" height="35" width="35">
                <p align="center"><b>${this.progress_message ? this.progress_message : 'Starting Computation'}</p>
                <p align="center">${this.formatTimeRemaining()}</p>
            </div>
        `;
        } else {
            return `<div align="center"><img src="${ap_icon}" height="35" width="35">
            <p align="center"><b>${this.error}</p></div>`;
        }

    }

    protected refreshPopup() {
        $(`#${STATS_LI_ID}`).html(this.getStatsHTML());
    }

    /**
     * Update current status of computation in tooltip
     */
    protected updateProgressStatus(msg: string, data: ViewshedProgressResponse) {
        if (data.uuid === this.accessPoint?.workspaceId) {
            this.error = null;
            this.progress_message = data.progress;
            this.time_remaining = data.time_remaining;
            this.refreshPopup();
            this.startTimer();
        }
    }

    protected updateErrorStatus(msg: string, data: ViewshedUnexpectedError) {
        if (data.uuid === this.accessPoint?.workspaceId) {
            this.error = data.msg;
            this.stopTimer();
        }
    }

    /**
     * Create interval callback to count down the remaining time
     */
    protected startTimer() {
        this.stopTimer();
        this.interval = setInterval(() => {
            if (this.time_remaining != null) {
                this.time_remaining -= 1;
                this.time_remaining = Math.max(this.time_remaining, 0);
                this.refreshPopup();
            }
        }, 1000);
    }

    protected stopTimer() {
        if (this.interval != null) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    /**
     * @returns formatted version of time remaining - must be less than 1 hr to display properly
     */
    protected formatTimeRemaining(): string {
        if (this.time_remaining != null) {
            if (this.time_remaining === 0) {
                return "Hold tight, almost there!"
            }
            var date = new Date(0);
            date.setSeconds(this.time_remaining);
            return "Time Remaining: " + date.toISOString().substr(14, 5);
        }
        return "This may take several minutes";
    }
}

export class MarketEvaluatorTowerPopup extends BaseTowerPopup {
    private static _instance: MarketEvaluatorTowerPopup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        if (MarketEvaluatorTowerPopup._instance) {
            return MarketEvaluatorTowerPopup._instance;
        }
        super(map, draw);
        MarketEvaluatorTowerPopup._instance = this;
    }

    static getInstance() {
        if (MarketEvaluatorTowerPopup._instance) {
            return MarketEvaluatorTowerPopup._instance;
        }
        else {
            throw new Error('No instance of MarketEvaluatorTowerPopup instantiated.')
        }
    }

    protected getAdditionalInfo() {
        return `
            <li class="button-row" id='${COVERAGE_LI_ID}'>
                ${this.getButtonHTML()}
            </li>
        `
    }

    protected getButtonHTML() {
        return `
            <button class='btn btn-primary isptoolbox-btn' id='${PLOT_COVERAGE_BUTTON_ID}'>Plot Estimated Coverage</button>
        `
    }
}