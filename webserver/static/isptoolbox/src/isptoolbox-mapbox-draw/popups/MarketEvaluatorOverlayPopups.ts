import mapboxgl from 'mapbox-gl';
import { m2ft, roundToDecimalPlaces } from '../../LinkCalcUtils';
import { MAX_RADIUS, MIN_RADIUS } from '../../LinkCheckUtils';
import { validateNumber } from '../../molecules/InputValidator';
import { ASREvents, ASRLoadingState } from '../../workspace/WorkspaceConstants';
import { LinkCheckBasePopup, LOADING_SVG } from './LinkCheckBasePopup';
import pass_svg from '../styles/pass-icon.svg';
import { ASRViewshedGeojsonResponse, MarketEvalWSEvents } from '../../MarketEvaluatorWS';

const ASR_HEIGHT_INPUT = 'asr-input-height-asr-popup';
const ASR_RADIUS_INPUT = 'asr-input-radius-asr-popup';
const ASR_COVERAGE_BUTTON_LI = 'asr-li-coverage-btn-asr-popup';
const ASR_COVERAGE_BUTTON = 'asr-btn-coverage-asr-popup';

abstract class MarketEvaluatorBaseOverlayPopup extends LinkCheckBasePopup {
    protected featureProperties: any | undefined;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        super(map, draw);
    }

    setFeature(feature: any) {
        this.featureProperties = feature?.properties;
    }

    cleanup() {
        this.featureProperties = undefined;
    }

    setEventHandlers() {}
}

export class RdofOverlayPopup extends MarketEvaluatorBaseOverlayPopup {
    static _instance: RdofOverlayPopup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        if (RdofOverlayPopup._instance) {
            return RdofOverlayPopup._instance;
        }
        super(map, draw);
        RdofOverlayPopup._instance = this;
    }

    static getInstance() {
        if (RdofOverlayPopup._instance) {
            return RdofOverlayPopup._instance;
        } else {
            throw new Error('No Instance of RdofOverlayPopup instantiated.');
        }
    }

    getHTML() {
        return `
            <div class="overlay-tooltip">
                <div class="title"> 
                    <h6>RDOF Census Group (${this.featureProperties.cbg_id})</h6>
                </div>
                <ul>
                    <li class="mapboxgl-popup-row">
                        <p class="mapboxgl-popup-label">Eligible Locations</p>
                        <p class="mapboxgl-popup-data">
                            ${this.featureProperties.locations}
                        </p>
                    </li>

                    <li class="mapboxgl-popup-row">
                        <p class="mapboxgl-popup-label">Reserve Price</p>
                        <p class="mapboxgl-popup-data">
                            ${Number(this.featureProperties.reserve).toLocaleString()}
                        </p>
                    </li>

                    <li class="mapboxgl-popup-row">
                        <p class="mapboxgl-popup-label">County</p>
                        <p class="mapboxgl-popup-data">
                            ${this.featureProperties.county}
                        </p>
                    </li>

                    <li class="mapboxgl-popup-row">
                        <a class="mapboxgl-popup-label mapboxgl-popup-link" href="https://www.fcc.gov/auction/904" target="_blank">
                        Read More at FCC.gov
                            <span class="link-arrow-svg">
                                <svg
                                width="19"
                                height="19"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg">
                                <path
                                    d="M4.294 14.763l9.155-9.155m-6.117-.47l6.43.156.158 6.432"
                                    stroke="#c2d8ec"
                                    strokeWidth="1.5px"
                                />
                                </svg>
                            </span>
                        </a>
                    </li>
                </ul>
            </div>
      `;
    }
}

export class CommunityConnectOverlayPopup extends MarketEvaluatorBaseOverlayPopup {
    static _instance: CommunityConnectOverlayPopup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        if (CommunityConnectOverlayPopup._instance) {
            return CommunityConnectOverlayPopup._instance;
        }
        super(map, draw);
        CommunityConnectOverlayPopup._instance = this;
    }

    static getInstance() {
        if (CommunityConnectOverlayPopup._instance) {
            return CommunityConnectOverlayPopup._instance;
        } else {
            throw new Error('No Instance of CommunityConnectOverlayPopup instantiated.');
        }
    }

    getHTML() {
        return `
            <div class="overlay-tooltip">
                <div class="title"> 
                    <h6>Non-urban < 10/1 Mbps</h6>
                </div>
                <ul>
                    <li class="mapboxgl-popup-row">
                        <p class="mapboxgl-popup-label">Zipcode</p>
                        <p class="mapboxgl-popup-data">
                        ${this.featureProperties.zipcode}
                        </p>
                    </li>

                    <li class="mapboxgl-popup-row">
                        <p class="mapboxgl-popup-label">Download (Mbit/s)</p>
                        <p class="mapboxgl-popup-data">
                        ${this.featureProperties.download.toFixed(2)}
                        </p>
                    </li>

                    <li class="mapboxgl-popup-row">
                        <p class="mapboxgl-popup-label">Upload (Mbit/s)</p>
                        <p class="mapboxgl-popup-data">
                        ${this.featureProperties.upload.toFixed(2)}
                        </p>
                    </li>

                    <li class="mapboxgl-popup-row">
                        <a class="mapboxgl-popup-label mapboxgl-popup-link" href="https://www.measurementlab.net/data/" target="_blank">
                        See Data Source
                        <span class="link-arrow-svg">
                            <svg
                            width="19"
                            height="19"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M4.294 14.763l9.155-9.155m-6.117-.47l6.43.156.158 6.432"
                                stroke="#c2d8ec"
                                strokeWidth="1.5px"
                            />
                            </svg>
                        </span>
                        </a>
                    </li>
                </ul>
            </div>
      `;
    }
}

export class CbrsOverlayPopup extends MarketEvaluatorBaseOverlayPopup {
    static _instance: CbrsOverlayPopup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        if (CbrsOverlayPopup._instance) {
            return CbrsOverlayPopup._instance;
        }
        super(map, draw);
        CbrsOverlayPopup._instance = this;
    }

    static getInstance() {
        if (CbrsOverlayPopup._instance) {
            return CbrsOverlayPopup._instance;
        } else {
            throw new Error('No Instance of CbrsOverlayPopup instantiated.');
        }
    }

    getHTML() {
        return `
            <div class="overlay-tooltip">
                <div class="title"> 
                    <h6>
                        ${this.featureProperties.county} County, ${this.featureProperties.state}
                        <br>
                        (\$${Number(
                            this.featureProperties.price
                        ).toLocaleString()} Gross License Price)
                    </h6>
                </div>

                <ul>
                    <li class="mapboxgl-popup-row-header">
                        <p class="mapboxgl-popup-header--label">PAL Holders</p>
                        <p class="mapboxgl-popup-header--label">Qty Won</p>
                    </li>

                    ${this.getCompaniesHTML()}
                    <li class="mapboxgl-popup-row">
                        <a class="mapboxgl-popup-label mapboxgl-popup-link" href="https://auctiondata.fcc.gov/public/projects/auction105/reports/results_by_license" target="_blank">
                            See Data Source
                            <span class="link-arrow-svg">
                                <svg
                                    width="19"
                                    height="19"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg">
                                    <path
                                    d="M4.294 14.763l9.155-9.155m-6.117-.47l6.43.156.158 6.432"
                                    stroke="#c2d8ec"
                                    strokeWidth="1.5px"
                                    />
                                </svg>
                            </span>
                        </a>
                    </li>
                </ul>
            </div>
      `;
    }

    getCompaniesHTML() {
        let companies = this.featureProperties.companies.split('|');
        let licenseCounts = this.featureProperties.licensecounts.split('|');
        let companiesHTML = '';

        for (let i = 0; i < companies.length; i++) {
            companiesHTML += `
                <li class="mapboxgl-popup-row">
                    <p class="mapboxgl-popup-label">${companies[i]}</p>
                    <p class="mapboxgl-popup-data">
                    ${licenseCounts[i]}
                    </p>
                </li>
            `;
        }

        return companiesHTML;
    }
}

export class CensusBlocksOverlayPopup extends MarketEvaluatorBaseOverlayPopup {
    static _instance: CensusBlocksOverlayPopup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        if (CensusBlocksOverlayPopup._instance) {
            return CensusBlocksOverlayPopup._instance;
        }
        super(map, draw);
        CensusBlocksOverlayPopup._instance = this;
    }

    static getInstance() {
        if (CensusBlocksOverlayPopup._instance) {
            return CensusBlocksOverlayPopup._instance;
        } else {
            throw new Error('No Instance of CensusBlocksOverlayPopup instantiated.');
        }
    }

    getHTML() {
        return `
            <div class="overlay-tooltip">
                <div class="title"> 
                    <h6>Census Block</h6>
                </div>
                <ul>
                    <li class="mapboxgl-popup-row">
                        <p class="mapboxgl-popup-label">Census Block Code</p>
                        <p class="mapboxgl-popup-data">
                            ${this.featureProperties.fullblockcode}
                        </p>
                    </li>

                    <li class="mapboxgl-popup-row">
                        <a class="mapboxgl-popup-label mapboxgl-popup-link" href="https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html" target="_blank">
                        See Data Source
                        <span class="link-arrow-svg">
                            <svg
                            width="19"
                            height="19"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M4.294 14.763l9.155-9.155m-6.117-.47l6.43.156.158 6.432"
                                stroke="#c2d8ec"
                                strokeWidth="1.5px"
                            />
                            </svg>
                        </span>
                        </a>
                    </li>
                </ul>
            </div>
        `;
    }
}

export class TribalOverlayPopup extends MarketEvaluatorBaseOverlayPopup {
    static _instance: TribalOverlayPopup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        if (TribalOverlayPopup._instance) {
            return TribalOverlayPopup._instance;
        }
        super(map, draw);
        TribalOverlayPopup._instance = this;
    }

    static getInstance() {
        if (TribalOverlayPopup._instance) {
            return TribalOverlayPopup._instance;
        } else {
            throw new Error('No Instance of TribalOverlayPopup instantiated.');
        }
    }

    getHTML() {
        return `
            <div class="overlay-tooltip">
                <div class="title"> 
                    <h6>Tribal Land</h6>
                </div>
                <ul>
                    <li class="mapboxgl-popup-row">
                        <p class="mapboxgl-popup-label">Tribal Area</p>
                        <p class="mapboxgl-popup-data">
                            ${this.featureProperties.NAMELSAD}
                        </p>
                    </li>

                    <li class="mapboxgl-popup-row">
                        <a class="mapboxgl-popup-label mapboxgl-popup-link" href="https://www.census.gov/cgi-bin/geo/shapefiles/index.php?year=2020&layergroup=American+Indian+Area+Geography" target="_blank">
                        See Data Source
                        <span class="link-arrow-svg">
                            <svg
                            width="19"
                            height="19"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M4.294 14.763l9.155-9.155m-6.117-.47l6.43.156.158 6.432"
                                stroke="#c2d8ec"
                                strokeWidth="1.5px"
                            />
                            </svg>
                        </span>
                        </a>
                    </li>
                </ul>
            </div>
      `;
    }
}

export class ASROverlayPopup extends MarketEvaluatorBaseOverlayPopup {
    protected state: ASRLoadingState;
    protected towerRadius: number | undefined;
    protected towerHeight: number | undefined;
    static _instance: ASROverlayPopup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        if (ASROverlayPopup._instance) {
            return ASROverlayPopup._instance;
        }
        super(map, draw);
        PubSub.subscribe(
            MarketEvalWSEvents.ASR_CLOUDRF_VIEWSHED_MSG,
            this.viewshedMessageCallback.bind(this)
        );
        ASROverlayPopup._instance = this;
    }

    cleanup() {
        super.cleanup();
        this.towerRadius = undefined;
        this.towerHeight = undefined;
        this.state = ASRLoadingState.STANDBY;
    }

    setFeature(feature: any) {
        super.setFeature(feature);
        this.state = this.featureProperties.loading_state || ASRLoadingState.STANDBY;
        this.towerRadius = this.featureProperties.tower_radius_miles || 3;
        this.towerHeight =
            this.featureProperties.tower_height_ft ||
            roundToDecimalPlaces(m2ft(this.featureProperties.height_without_appurtenaces), 2);
    }

    getHTML() {
        const statusClass = ['C', 'G'].includes(this.featureProperties.status_code)
            ? 'good'
            : 'bad';
        const towerHeightMax = roundToDecimalPlaces(
            m2ft(this.featureProperties.height_without_appurtenaces),
            2
        );
        return `
        <div class="overlay-tooltip">
            <div class="title"> 
                <h6>${this.featureProperties.owner_name}</h6>
            </div>
            <ul>
                <li class="mapboxgl-popup-row">
                    <p class="mapboxgl-popup-label">Registration #</p>
                    <p class="mapboxgl-popup-data">
                        <a href="${this.featureProperties.fcc_url}" target="_blank">
                            ${this.featureProperties.registration_number}
                            <span class="link-arrow-svg">
                                <svg
                                    width="19"
                                    height="19"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg">
                                    <path
                                    d="M4.294 14.763l9.155-9.155m-6.117-.47l6.43.156.158 6.432"
                                    stroke="#c2d8ec"
                                    strokeWidth="1.5px"
                                    />
                                </svg>
                            </span>
                        </a>
                    </p>
                </li>

                <li class="mapboxgl-popup-row">
                    <p class="mapboxgl-popup-label">Status</p>
                    <div class="mapboxgl-popup-tower-status-data">
                        <span class="tower-status-swatch status-${statusClass}"></span>
                        <p class="tower-status-label status-${statusClass}">
                            ${this.featureProperties.status}
                        </p>
                    </p>
                </li>

                <li class="mapboxgl-popup-row">
                    <p class="mapboxgl-popup-label">Height w/o Attachment</p>
                    <p class="mapboxgl-popup-data">
                        ${towerHeightMax} ft
                    </p>
                </li>

                <li class="mapboxgl-popup-row">
                    <p class="mapboxgl-popup-label">Install Height</p>
                    <div class="data-with-unit">
                        <input type="number"
                                value="${this.towerHeight}"
                                id='${ASR_HEIGHT_INPUT}'
                                min='0.1' max='${towerHeightMax}'
                                class="input--value"
                        >
                        <span>ft</span>
                    </div>
                </li>

                <li class="mapboxgl-popup-row">
                    <p class="mapboxgl-popup-label">Prop. Radius</p>
                    <div class="data-with-unit">
                        <input type="number"
                                value="${this.towerRadius}"
                                id="${ASR_RADIUS_INPUT}"
                                min="${MIN_RADIUS}" max="${MAX_RADIUS}"
                                class="input--value"
                        >
                        <span>mi</span>
                    </div>
                </li>

                <li class="mapboxgl-popup-button-row" id="${ASR_COVERAGE_BUTTON_LI}"">
                    ${this.getButtonRowHTML()}
                </li>
            </ul>
    </div>
        `;
    }

    setEventHandlers() {
        $(`#${ASR_COVERAGE_BUTTON}`).on('click', () => {
            let height = parseFloat(String($(`#${ASR_HEIGHT_INPUT}`).val()));
            let radius = parseFloat(String($(`#${ASR_RADIUS_INPUT}`).val()));
            let maxHeight = roundToDecimalPlaces(
                m2ft(this.featureProperties.height_without_appurtenaces),
                2
            );

            // input validation on height/radius
            height = validateNumber(0.1, maxHeight, height, ASR_HEIGHT_INPUT);
            radius = validateNumber(0.1, MAX_RADIUS, radius, ASR_RADIUS_INPUT);

            PubSub.publish(ASREvents.PLOT_LIDAR_COVERAGE, {
                featureProperties: this.featureProperties,
                height: height,
                radius: radius
            });

            this.towerHeight = height;
            this.towerRadius = radius;
            this.state = ASRLoadingState.LOADING_COVERAGE;
            this.refreshButtonRow();
        });

        const inputChangeCallback = (id: string) => {
            return () => {
                if (this.state !== ASRLoadingState.STANDBY) {
                    this.state = ASRLoadingState.STANDBY;
                    this.refreshButtonRow();
                }

                const val = String($(`#${id}`).val());
                if (val) {
                    $(`#${ASR_COVERAGE_BUTTON}`).prop('disabled', false);
                } else {
                    $(`#${ASR_COVERAGE_BUTTON}`).prop('disabled', true);
                }
            };
        };

        $(`#${ASR_HEIGHT_INPUT}`).on('input', inputChangeCallback(ASR_HEIGHT_INPUT));
        $(`#${ASR_RADIUS_INPUT}`).on('input', inputChangeCallback(ASR_RADIUS_INPUT));
    }

    protected getButtonRowHTML() {
        switch (this.state) {
            case ASRLoadingState.STANDBY:
                return `
                    <button class='btn btn-primary isptoolbox-btn' id='${ASR_COVERAGE_BUTTON}'>
                        Plot Estimated Coverage
                        <sup>
                            <span class="footnote--bracket">[</span>12<span class="footnote--bracket">]</span>
                        </sup>
                    </button>
                `;
            case ASRLoadingState.LOADING_COVERAGE:
                return `
                    <div align="center">
                        ${LOADING_SVG}
                        <p align="center bold" class="mt-1">Plotting Lidar Coverage</p>
                    </div>
                `;
            case ASRLoadingState.LOADED_COVERAGE:
                return `
                    <div align="center">
                        <img src="${pass_svg}" width="20" height="25">
                        <p align="center bold" class="mt-1">Tower Coverage Plotted</p>
                    </div>
                `;
        }
    }

    protected refreshButtonRow() {
        if (this.popup.isOpen()) {
            $(`#${ASR_COVERAGE_BUTTON_LI}`).html(this.getButtonRowHTML());
            this.setEventHandlers();
        }
    }

    protected viewshedMessageCallback(msg: string, response: ASRViewshedGeojsonResponse) {
        let towerId = response.registrationNumber;
        if (response.error === 0 && towerId === this.featureProperties?.registration_number) {
            this.state = ASRLoadingState.LOADED_COVERAGE;
            this.refreshButtonRow();
        } else if (response.error !== 0) {
            this.state = ASRLoadingState.STANDBY;
            this.refreshButtonRow();
        }
    }

    static getInstance() {
        if (ASROverlayPopup._instance) {
            return ASROverlayPopup._instance;
        } else {
            throw new Error('No Instance of ASRPopup instantiated.');
        }
    }
}
