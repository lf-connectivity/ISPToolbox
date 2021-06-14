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
import { MIN_RADIUS, MAX_RADIUS, MIN_LAT, MAX_LAT, MIN_LNG, MAX_LNG, MAX_HEIGHT, MIN_HEIGHT,
    validateName, validateLat, validateLng, validateRadius, validateHeight } from '../../LinkCheckUtils';
import { sanitizeString } from "../../molecules/InputValidator";
import { WorkspaceEvents } from "../../workspace/WorkspaceConstants";
import { EMPTY_BUILDING_COVERAGE } from "../../workspace/BuildingCoverage";
import { parseFormLatitudeLongitude } from "../../utils/LatLngInputUtils";

var _ = require('lodash');

const NAME_INPUT_ID = 'name-input-tower-popup';
const LAT_LNG_INPUT_ID = 'lat-lng-input-tower-popup';
const HGT_INPUT_ID = 'hgt-input-tower-popup';
const CPE_HGT_INPUT_ID = 'cpe-hgt-input-tower-popup';
const RADIUS_INPUT_ID = 'radius-input-tower-popup';
const STATS_LI_ID = 'stats-li-tower-popup';

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

    static onAPUpdate(ap: AccessPoint) {
        const popup = LinkCheckTowerPopup.getInstance();
        if (popup.accessPoint === ap) {
            $(`#${STATS_LI_ID}`).html(popup.getStatsHTML());
            popup.setEventHandlers();
            // Adjust lat/lng/height if they have been changed from bottom bar
            let coord = popup.accessPoint.featureData.geometry.coordinates;
            let coord_input = parseFormLatitudeLongitude(`#${LAT_LNG_INPUT_ID}`);
            if(coord_input != null){
                if (String(coord_input[0]) !== coord[1].toFixed(5) ||
                    String(coord_input[1]) !== coord[0].toFixed(5)) {
                        $(`#${LAT_LNG_INPUT_ID}`).val(`${coord[1].toFixed(5)}, ${coord[0].toFixed(5)}`);
                        popup.lnglat = [coord[0], coord[1]];
                        popup.popup.setLngLat(popup.lnglat);
                }
            }

            $(`#${HGT_INPUT_ID}`).val(popup.getHeightValue());
        }
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

        const createNumberChangeCallback = (id: string, property: string, conversionFormula: ImperialToMetricConversion,
            validatorFunction: (n: number, id: string) => number) => {
            let htmlID = `#${id}`;
            $(htmlID).on('change',
                _.debounce((e: any) => {
                    let inputValue = validatorFunction(parseFloat(String($(htmlID).val())), id);       
                    let transformedValue = (CONVERSION_FORMULAS.get(conversionFormula) as any)(inputValue);

                    // @ts-ignore
                    this.accessPoint.featureData.properties[property] = transformedValue;
                    updateAP();
                }, DEBOUNCE_TIME)
            );
        }

        const createCoordinateChangeCallback = (id: string) => {
            let htmlID = `#${id}`;
            $(htmlID).on('change',
                _.debounce((e: any) => {
                    let newVal = parseFormLatitudeLongitude(htmlID);
                    if(newVal != null && this.accessPoint){
                        newVal = [newVal[1], newVal[0]];
                        this.accessPoint.featureData.geometry.coordinates = newVal;

                        this.draw.add(this.accessPoint.featureData);
                        this.lnglat = newVal;
                        this.popup.setLngLat(this.lnglat);

                        this.map.fire('draw.update', { features: [this.accessPoint.featureData]})
                    }
                }, DEBOUNCE_TIME)
            );
        }

        $(`#tower-delete-btn`).off().on('click', () => {
            $(`#ap-delete-confirm-btn`).off().on('click', () => {
                this.map.fire('draw.delete', {features: [this.accessPoint?.featureData]});
                PubSub.publish(WorkspaceEvents.AP_RENDER_SELECTED);
            });
        });

        $(`#${NAME_INPUT_ID}`).on('input',
            _.debounce((e: any) => {
                let name = validateName(String($(`#${NAME_INPUT_ID}`).val()), NAME_INPUT_ID);

                // @ts-ignore
                this.accessPoint.featureData.properties.name = name;
                updateAP();
            }, DEBOUNCE_TIME)
        );

        createNumberChangeCallback(HGT_INPUT_ID, 'height', ImperialToMetricConversion.FT_TO_M, validateHeight);
        createNumberChangeCallback(RADIUS_INPUT_ID, 'max_radius', ImperialToMetricConversion.MI_TO_KM, validateRadius);
        createNumberChangeCallback(CPE_HGT_INPUT_ID, 'default_cpe_height', ImperialToMetricConversion.FT_TO_M, validateHeight);

        createCoordinateChangeCallback(LAT_LNG_INPUT_ID);
    }

    protected getStatsHTML() {
        if (this.accessPoint?.featureData.id){
            const feat = this.draw.get(this.accessPoint?.featureData.id as string);
            if(feat &&
                feat.properties?.serviceable != null &&
                feat.properties?.unknown != null && 
                feat.properties?.unserviceable != null &&
                feat.properties.unknown === 0){
                return `
                    <li class="ap-stat">
                        <p class="ap-stat--label">Clear LOS Rooftops</p>
                        <p class="ap-stat--value" style="color: ${StyleConstants.SERVICEABLE_BUILDINGS_COLOR}">
                            <span class="ap-stat--icon"><img src="${pass_svg}"/></span>
                            ${feat.properties?.serviceable}
                        </p>
                    </li>
                    <li class="ap-stat">
                        <p class="ap-stat--label">Obstructed Rooftops</p>
                        <p class="ap-stat--value" style="color: ${StyleConstants.UNSERVICEABLE_BUILDINGS_COLOR}">
                            <span class="ap-stat--icon"><img src="${fail_svg}"/></span>
                            ${feat.properties?.unserviceable}
                        </p>
                    </li>
                    <div class="node-edits">
                        <a id="tower-delete-btn" data-toggle="modal" data-target="#apDeleteModal">Delete Tower</a>
                        <p>Last edited ${feat.properties?.last_updated}</p>
                    </div>
            `;
            }
        }
        return `
            <div align="center">
                <img src="${ap_icon}" height="35" width="35">
                <p align="center"><b>Plotting Lidar Coverage</p>
                <p align="center">This may take several minutes</p>
            </div>
            <div class="node-edits">
                <a id="tower-delete-btn" data-toggle="modal" data-target="#apDeleteModal">Delete Tower</a>
            </div>
        `;
    }

    protected getHeightValue() {
        return Math.round(
            isUnitsUS() ?
            this.accessPoint?.featureData.properties?.height_ft :
            this.accessPoint?.featureData.properties?.height
       )
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
                                value='${sanitizeString(this.accessPoint?.featureData.properties?.name)}' 
                                placeholder='Tower Name'>
                            <div class="coordinates">
                                <div class="data-with-unit">
                                    <input type='text'
                                            value='${this.accessPoint?.featureData.geometry.coordinates[1].toFixed(5)}, ${this.accessPoint?.featureData.geometry.coordinates[0].toFixed(5)}'
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
                                            this.accessPoint?.featureData.properties?.default_cpe_height_ft :
                                            this.accessPoint?.featureData.properties?.default_cpe_height
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
                                            isUnitsUS() ?
                                            this.accessPoint?.featureData.properties?.max_radius_miles.toFixed(2) :
                                            this.accessPoint?.featureData.properties?.max_radius.toFixed(2)
                                       }'
                                       id='${RADIUS_INPUT_ID}'
                                       min='${MIN_RADIUS}' max='${MAX_RADIUS}' step='0.01'
                                       class="input--value"
                                >
                                <span>${isUnitsUS() ? 'mi' : 'km'}</span>
                            </div>
                        </li>
                        <li class="stat-row" id=${STATS_LI_ID}>
                            ${this.getStatsHTML()}
                        </li>
                    </ul>
                </div>
            </div>
        `;
    }
}