import mapboxgl from 'mapbox-gl';
import { m2ft, roundToDecimalPlaces } from '../../LinkCalcUtils';
import { ASREvents, WorkspaceFeatureTypes } from '../../workspace/WorkspaceConstants';
import { LinkCheckBasePopup } from './LinkCheckBasePopup';
import pass_svg from '../styles/pass-icon.svg';

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
    static _instance: ASROverlayPopup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        if (ASROverlayPopup._instance) {
            return ASROverlayPopup._instance;
        }
        super(map, draw);
        ASROverlayPopup._instance = this;
    }

    cleanup() {
        super.cleanup();
    }

    setFeature(feature: any) {
        super.setFeature(feature);
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
                        <a href="${this.featureProperties.fcc_url}"
                            class="asr-registration-link"
                            target="_blank"
                            >
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

                <li class="mapboxgl-popup-button-row" id="${ASR_COVERAGE_BUTTON_LI}"">
                    ${this.getButtonRowHTML()}
                </li>
            </ul>
    </div>
        `;
    }

    setEventHandlers() {
        $(`#${ASR_COVERAGE_BUTTON}`).on('click', () => {
            PubSub.publish(ASREvents.SAVE_ASR_TOWER, {
                featureProperties: this.featureProperties
            });

            this.refreshButtonRow();
        });
    }

    protected getButtonRowHTML() {
        // Find if there's a tower already plotted
        let featureIds = this.draw.getFeatureIdsAt(this.map.project(this.lnglat));

        if (
            featureIds.some((id: string) => {
                let feat = this.draw.get(id);
                return (
                    feat &&
                    feat.properties &&
                    feat.properties.feature_type == WorkspaceFeatureTypes.AP
                );
            })
        ) {
            return `
                <div align="center">
                    <img src="${pass_svg}" width="20" height="25">
                    <p align="center bold" class="mt-1">Tower Coverage Plotted</p>
                </div>
            `;
        }

        return `
            <button class='btn btn-primary isptoolbox-btn' id='${ASR_COVERAGE_BUTTON}'>
                Plot As Tower
            </button>
        `;
    }

    protected refreshButtonRow() {
        if (this.popup.isOpen()) {
            $(`#${ASR_COVERAGE_BUTTON_LI}`).html(this.getButtonRowHTML());
            this.setEventHandlers();
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
