import mapboxgl, * as MapboxGL from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { LinkCheckBasePopup, LOADING_SVG } from './LinkCheckBasePopup';
import { AccessPoint } from '../../workspace/WorkspaceFeatures';
import { isUnitsUS } from '../../utils/MapPreferences';
import { ft2m, miles2km, roundToDecimalPlaces } from '../../LinkCalcUtils';
import * as StyleConstants from '../styles/StyleConstants';
import pass_svg from '../styles/pass-icon.svg';
import fail_svg from '../styles/fail-icon.svg';
import {
    MIN_RADIUS,
    MAX_RADIUS,
    MAX_HEIGHT,
    MIN_HEIGHT,
    validateName,
    validateRadius,
    validateHeight,
    isBeta
} from '../../LinkCheckUtils';
import { sanitizeString } from '../../molecules/InputValidator';
import { parseFormLatitudeLongitude } from '../../utils/LatLngInputUtils';
import {
    LOSWSEvents,
    ViewshedProgressResponse,
    ViewshedUnexpectedError,
    WorkspaceFeatureTypes
} from '../../workspace/WorkspaceConstants';
import MarketEvaluatorWS, {
    MarketEvalWSEvents,
    MarketEvalWSRequestType,
    ViewshedGeojsonResponse
} from '../../MarketEvaluatorWS';
import { applyChanges } from 'automerge';

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

const DEBOUNCE_TIME = 500;

const CONVERSION_FORMULAS: Map<ImperialToMetricConversion, (input: number) => number> = new Map();
CONVERSION_FORMULAS.set(ImperialToMetricConversion.FT_TO_M, (input: number) => {
    return isUnitsUS() ? ft2m(input) : input;
});
CONVERSION_FORMULAS.set(ImperialToMetricConversion.MI_TO_KM, (input: number) => {
    return isUnitsUS() ? miles2km(input) : input;
});

export abstract class BaseTowerPopup extends LinkCheckBasePopup {
    protected accessPoint?: AccessPoint;
    protected static _instance: BaseTowerPopup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        super(map, draw);
    }

    getAccessPoint(): AccessPoint | undefined {
        return this.accessPoint;
    }

    setAccessPoint(accessPoint: AccessPoint) {
        this.accessPoint = accessPoint;

        if (this.accessPoint != undefined) {
            const coords = accessPoint.getFeatureGeometryCoordinates();
            this.setLngLat(coords as [number, number]);
        }
    }

    onAPUpdate(ap: AccessPoint) {
        if (this.accessPoint === ap) {
            this.refreshPopup();
            // Adjust lat/lng/height if they have been changed from bottom bar
            let coord = this.accessPoint.getFeatureGeometryCoordinates();
            if (coord) {
                if (this.hasAPMoved()) {
                    $(`#${LAT_LNG_INPUT_ID}`).val(`${coord[1].toFixed(5)}, ${coord[0].toFixed(5)}`);
                    this.setLngLat([coord[0], coord[1]]);
                    this.popup.setLngLat(this.lnglat);
                }
            }
        }

        $(`#${HGT_INPUT_ID}`).val(this.getHeightValue());
        $(`#${DELETE_ROW_DIV_ID}`).html(this.getDeleteRow());
        this.setEventHandlers();
    }

    protected hasAPMoved() {
        // Calculate things differently if popup is open or closed
        let coord = this.accessPoint?.getFeatureGeometryCoordinates();
        if (coord) {
            if (this.popup.isOpen()) {
                let coord_input = parseFormLatitudeLongitude(`#${LAT_LNG_INPUT_ID}`);
                return (
                    coord_input != null &&
                    (String(coord_input[0]) !== coord[1].toFixed(5) ||
                        String(coord_input[1]) !== coord[0].toFixed(5))
                );
            } else {
                return this.lnglat[0] !== coord[0] || this.lnglat[1] !== coord[1];
            }
        } else {
            return false;
        }
    }

    protected cleanup() {}

    protected getHeightValue() {
        return Math.round(
            isUnitsUS()
                ? this.accessPoint?.getFeatureProperty('height_ft')
                : this.accessPoint?.getFeatureProperty('height')
        );
    }

    protected setEventHandlers() {
        const updateAP = () => {
            if (this.accessPoint) {
                let feat = this.accessPoint.getFeatureData();
                this.map.fire('draw.update', { features: [feat] });
            }
        };

        const createNumberChangeCallback = (
            id: string,
            property: string,
            conversionFormula: ImperialToMetricConversion,
            validatorFunction: (n: number, id: string) => number
        ) => {
            let htmlID = `#${id}`;
            $(htmlID).on(
                'change',
                _.debounce((e: any) => {
                    let inputValue = validatorFunction(parseFloat(String($(htmlID).val())), id);
                    let transformedValue = (CONVERSION_FORMULAS.get(conversionFormula) as any)(
                        inputValue
                    );

                    // @ts-ignore
                    this.accessPoint?.setFeatureProperty(property, transformedValue);
                    updateAP();
                }, DEBOUNCE_TIME)
            );
        };

        const createCoordinateChangeCallback = (id: string) => {
            let htmlID = `#${id}`;
            $(htmlID).on(
                'change',
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
        };

        $(`#${TOWER_DELETE_BUTTON_ID}`)
            .off()
            .on('click', () => {
                $(`#ap-delete-confirm-btn`)
                    .off()
                    .on('click', () => {
                        this.map.fire('draw.delete', {
                            features: [this.accessPoint?.getFeatureData()]
                        });
                    });
            });

        $(`#${NAME_INPUT_ID}`).on(
            'input',
            _.debounce((e: any) => {
                let name = validateName(String($(`#${NAME_INPUT_ID}`).val()), NAME_INPUT_ID);
                this.accessPoint?.setFeatureProperty('name', name);
                updateAP();
            }, DEBOUNCE_TIME)
        );

        createNumberChangeCallback(
            HGT_INPUT_ID,
            'height',
            ImperialToMetricConversion.FT_TO_M,
            validateHeight
        );
        createNumberChangeCallback(
            RADIUS_INPUT_ID,
            'max_radius',
            ImperialToMetricConversion.MI_TO_KM,
            validateRadius
        );
        createNumberChangeCallback(
            CPE_HGT_INPUT_ID,
            'default_cpe_height',
            ImperialToMetricConversion.FT_TO_M,
            validateHeight
        );

        createCoordinateChangeCallback(LAT_LNG_INPUT_ID);

        // For ASR/uneditable towers, no changing location
        if (this.accessPoint?.getFeatureProperty('uneditable')) {
            $(`#${LAT_LNG_INPUT_ID}`).prop('readonly', true);
        }
    }

    protected getHTML() {
        const coords = this.accessPoint?.getFeatureGeometryCoordinates();
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
                                value='${sanitizeString(
                                    this.accessPoint?.getFeatureProperty('name') ?? ''
                                )}' 
                                placeholder='Tower Name'>
                            <div class="coordinates">
                                <div class="data-with-unit">
                                    <input type='text'
                                            value='${
                                                coords
                                                    ? `${coords[1].toFixed(5)}, ${coords[0].toFixed(
                                                          5
                                                      )}`
                                                    : ''
                                            }'
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
                            <p class="label">Customer Antenna<span>Height Above Rooftop</span></p>
                            <div class="data-with-unit">
                                <input type='number'
                                       value='${Math.round(
                                           isUnitsUS()
                                               ? this.accessPoint?.getFeatureProperty(
                                                     'default_cpe_height_ft'
                                                 )
                                               : this.accessPoint?.getFeatureProperty(
                                                     'default_cpe_height'
                                                 )
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
                                       value='${
                                           isUnitsUS()
                                               ? this.accessPoint
                                                     ?.getFeatureProperty('radius_miles')
                                                     .toFixed(2)
                                               : this.accessPoint
                                                     ?.getFeatureProperty('max_radius')
                                                     .toFixed(2)
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

    protected refreshPopup(): void {}

    protected getDeleteRow() {
        return `
            <a id="${TOWER_DELETE_BUTTON_ID}" data-toggle="modal" data-target="#apDeleteModal">Delete Tower</a>
            ${
                this.accessPoint && this.accessPoint.getFeatureProperty('last_updated')
                    ? `<p>Last edited ${this.accessPoint.getFeatureProperty('last_updated')}</p>`
                    : ''
            }
        `;
    }

    static getInstance() {
        if (BaseTowerPopup._instance) {
            return BaseTowerPopup._instance;
        } else {
            throw new Error('No instance of BaseTowerPopup instantiated.');
        }
    }
}

export class LinkCheckTowerPopup extends BaseTowerPopup {
    private progress_message: string | null;
    private time_remaining: number | null;
    private error: string | null;
    private interval: NodeJS.Timeout | null;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        if (BaseTowerPopup._instance) {
            return BaseTowerPopup._instance as LinkCheckTowerPopup;
        }
        super(map, draw);
        BaseTowerPopup._instance = this;
        this.progress_message = null;
        this.time_remaining = null;
        this.error = null;
        this.interval = null;
        PubSub.subscribe(LOSWSEvents.VIEWSHED_PROGRESS_MSG, this.updateProgressStatus.bind(this));
        PubSub.subscribe(
            LOSWSEvents.VIEWSHED_UNEXPECTED_ERROR_MSG,
            this.updateErrorStatus.bind(this)
        );
    }

    static getInstance() {
        if (BaseTowerPopup._instance) {
            return BaseTowerPopup._instance as LinkCheckTowerPopup;
        } else {
            throw new Error('No instance of LinkCheckTowerPopup instantiated.');
        }
    }

    protected getAdditionalInfo() {
        return `
            <hr style="border-top: 1px solid #595959; margin-bottom: 0rem;">
            <li class="stat-row" id='${STATS_LI_ID}'>
                ${this.getStatsHTML()}
            </li>
        `;
    }

    protected getStatsHTML() {
        if (this.accessPoint) {
            if (
                this.accessPoint.getFeatureProperty('serviceable') != null &&
                this.accessPoint.getFeatureProperty('unserviceable') != null &&
                this.accessPoint.getFeatureProperty('unknown') != null &&
                this.accessPoint.getFeatureProperty('unknown') === 0
            ) {
                return `
                    <div class="ap-stat">
                    <p style="font-size: 0.75rem; color: white">These results are based on inputted specs.</p>
                    </div>
                    <div class="ap-stat">
                        <p class="ap-stat--label">Est. Clear LOS<span>at least 1 point on rooftop</span></p>
                        <p class="ap-stat--value" style="color: ${
                            StyleConstants.SERVICEABLE_BUILDINGS_COLOR
                        }">
                            <span class="ap-stat--icon"><img src="${pass_svg}"/></span>
                            ${this.accessPoint.getFeatureProperty('serviceable')}
                        </p>
                    </div>
                    <div class="ap-stat">
                        <p class="ap-stat--label">Est. Obstructed LOS</p>
                        <p class="ap-stat--value" style="color: ${
                            StyleConstants.UNSERVICEABLE_BUILDINGS_COLOR
                        }">
                            <span class="ap-stat--icon"><img src="${fail_svg}"/></span>
                            ${this.accessPoint.getFeatureProperty('unserviceable')}
                        </p>
                    </div>
                    <div class="ap-stat">
                    <p class="ap-stat--label text-white">Results Legend</span> 
                    <div class="d-flex align-items-center">
                    <div style="width: 10px; height: 10px; background-color:#7C848D"></div>
                    <span class="ap stat--value text-white m-1">clear</span> 
                    </div>
                    <div class="d-flex align-items-center">
                    <div style="width: 10px; height: 10px; background-color:#44474C"></div>
                    <span class="ap stat--value text-white m-1">obstructed</span> 
                    <div>
                    </div>
            `;
            }
        }
        if (this.error === null) {
            return `
            <div align="center">
                ${LOADING_SVG}
                <p align="center bold">${
                    this.progress_message ? this.progress_message : 'Finalizing results'
                }</p>
                <p align="center">${this.formatTimeRemaining()}</p>
            </div>
        `;
        } else {
            return `<div align="center">
            <svg class="loader-error" width="25" height="25" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 13C8.55228 13 9 12.5523 9 12C9 11.4477 8.55228 11 8 11C7.44772 11 7 11.4477 7 12C7 12.5523 7.44772 13 8 13Z" fill="#F23E3E"/>
                <path d="M8 4.5V9.5" stroke="#F23E3E" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M0.741037 12.776L6.97004 1.20799C7.07022 1.02206 7.21887 0.866707 7.40021 0.758426C7.58156 0.650145 7.78883 0.592972 8.00004 0.592972C8.21125 0.592972 8.41852 0.650145 8.59986 0.758426C8.7812 0.866707 8.92985 1.02206 9.03004 1.20799L15.259 12.776C15.3548 12.9542 15.4028 13.1542 15.3982 13.3565C15.3936 13.5588 15.3367 13.7564 15.2329 13.9301C15.1291 14.1038 14.9821 14.2476 14.8062 14.3475C14.6302 14.4473 14.4314 14.4999 14.229 14.5H1.77104C1.56871 14.4999 1.36987 14.4473 1.19392 14.3475C1.01797 14.2476 0.870936 14.1038 0.767167 13.9301C0.663397 13.7564 0.606442 13.5588 0.601862 13.3565C0.597283 13.1542 0.645235 12.9542 0.741037 12.776V12.776Z" stroke="#F23E3E" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <p align="center">${this.error}</p></div>`;
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
            this.refreshPopup();
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
                return 'Hold tight, almost there!';
            }
            var date = new Date(0);
            date.setSeconds(this.time_remaining);
            return 'Time Remaining: ' + date.toISOString().substr(14, 5);
        }
        return 'This may take several minutes';
    }
}

export class MarketEvaluatorTowerPopup extends BaseTowerPopup {
    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        if (BaseTowerPopup._instance) {
            return BaseTowerPopup._instance as MarketEvaluatorTowerPopup;
        }
        super(map, draw);
        BaseTowerPopup._instance = this;
        PubSub.subscribe(MarketEvalWSEvents.SEND_REQUEST, this.onWSRequestSendOrCancel.bind(this));
        PubSub.subscribe(
            MarketEvalWSEvents.REQUEST_CANCELLED,
            this.onWSRequestSendOrCancel.bind(this)
        );
        PubSub.subscribe(MarketEvalWSEvents.CLOUDRF_VIEWSHED_MSG, this.onWSViewshedMsg.bind(this));
    }

    static getInstance() {
        if (BaseTowerPopup._instance) {
            return BaseTowerPopup._instance as MarketEvaluatorTowerPopup;
        } else {
            throw new Error('No instance of MarketEvaluatorTowerPopup instantiated.');
        }
    }

    protected setEventHandlers() {
        super.setEventHandlers();
        $(`#${PLOT_COVERAGE_BUTTON_ID}`).on('click', () => {
            let properties = this.accessPoint?.getFeatureData()?.properties;
            let point = this.accessPoint?.getFeatureData().geometry.coordinates;
            if (this.accessPoint && properties && point) {
                MarketEvaluatorWS.getInstance().sendViewshedRequest(this.accessPoint.workspaceId);
            }
        });
    }

    protected getAdditionalInfo() {
        return `
            <li class="stat-row" id='${COVERAGE_LI_ID}'>
                ${this.getButtonHTML()}
            </li>
        `;
    }

    protected getButtonHTML() {
        // Three states: Plotting lidar coverage, plotted lidar coverage, no lidar coverage.
        let ws = MarketEvaluatorWS.getInstance();

        // Plotted Lidar Coverage
        if (
            this.accessPoint?.getFeatureData().properties.cloudrf_coverage_geojson_json &&
            this.accessPoint?.getFeatureData().properties.cloudrf_coverage_geojson_json !== null
        ) {
            return `
                <div align="center">
                    <img src="${pass_svg}" width="20" height="25">
                    <p align="center bold" class="mt-1">Tower Coverage Plotted</p>
                </div>
            `;
        }

        // Plotting Lidar Coverage
        else if (
            ws.getCurrentRequest(MarketEvalWSRequestType.VIEWSHED)?.apUuid ===
            this.accessPoint?.workspaceId
        ) {
            return `
                <div align="center">
                    ${LOADING_SVG}
                    <p align="center bold" class="mt-1">Plotting Lidar Coverage</p>
                </div>
            `;
        }

        // No lidar coverage and not plotting lidar coverage either
        else {
            return `
                <button class='btn btn-primary isptoolbox-btn' id='${PLOT_COVERAGE_BUTTON_ID}'>
                    Plot Estimated Coverage
                    <sup>
                        <span class="footnote--bracket">[</span>12<span class="footnote--bracket">]</span>
                    </sup>
                </button>
            `;
        }
    }

    protected refreshPopup() {
        $(`#${COVERAGE_LI_ID}`).html(this.getButtonHTML());
        this.setEventHandlers();
    }

    protected onWSRequestSendOrCancel(msg: string, request: any) {
        if (
            request.request_type === MarketEvalWSRequestType.VIEWSHED &&
            request.apUuid === this.accessPoint?.workspaceId
        ) {
            this.refreshPopup();
        }
    }

    protected onWSViewshedMsg(msg: string, response: ViewshedGeojsonResponse) {
        if (response.ap_uuid && response.ap_uuid === this.accessPoint?.workspaceId) {
            let coords = this.accessPoint.getFeatureGeometryCoordinates() as [number, number];

            // Fly to AP if AP isn't on map. We center the AP horizontally, but place it
            // 65% of the way down on the screen so the tooltip fits.
            if (!this.map.getBounds().contains(coords)) {
                let south = this.map.getBounds().getSouth();
                let north = this.map.getBounds().getNorth();
                this.map.flyTo({
                    center: [coords[0], coords[1] + +0.15 * (north - south)]
                });
            }
            this.refreshPopup();
        }
    }
}
