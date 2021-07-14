import mapboxgl from "mapbox-gl";
import { LinkCheckBasePopup } from "./LinkCheckBasePopup";

abstract class MarketEvaluatorBaseOverlayPopup extends LinkCheckBasePopup {
    protected featureProperties: any | undefined

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
        }
        else {
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
        }
        else {
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
                        ${this.featureProperties.ZIPCODE}
                        </p>
                    </li>

                    <li class="mapboxgl-popup-row">
                        <p class="mapboxgl-popup-label">Download (Mbit/s)</p>
                        <p class="mapboxgl-popup-data">
                        ${this.featureProperties.DOWNLOAD.toFixed(2)}
                        </p>
                    </li>

                    <li class="mapboxgl-popup-row">
                        <p class="mapboxgl-popup-label">Upload (Mbit/s)</p>
                        <p class="mapboxgl-popup-data">
                        ${this.featureProperties.UPLOAD.toFixed(2)}
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
        }
        else {
            throw new Error('No Instance of CbrsOverlayPopup instantiated.');
        }
    }

    getHTML() {
        return `
            <div class="overlay-tooltip">
                <div class="title"> 
                    <h6>
                        ${this.featureProperties.COUNTY} County, ${this.featureProperties.STATE}
                        <br>
                        (\$${Number(this.featureProperties.PRICE).toLocaleString()} Gross License Price)
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
        let companies = this.featureProperties.COMPANIES.split('|');
        let licenseCounts = this.featureProperties.LICENSECOU.split('|');
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
        }
        else {
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
        }
        else {
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