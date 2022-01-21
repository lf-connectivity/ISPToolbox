/**  Copyright Facebook 2021
 *
 * Connection Manager for Market Evaluator Websocket
 *
 **/

import PubSub from 'pubsub-js';
var _ = require('lodash');

export enum MarketEvalWSRequestType {
    POLYGON = 'standard_polygon',
    RDOF = 'grant',
    ZIP = 'zip',
    COUNTY = 'county',
    CENSUS_BLOCK = 'census_block',
    TRIBAL = 'tribal',
    VIEWSHED = 'viewshed',
    ASR_VIEWSHED = 'asr_viewshed'
}

export enum MarketEvalWSEvents {
    MKT_EVAL_WS_CONNECTED = 'ws.mkt_eval_connected',
    BUILDING_OVERLAYS_MSG = 'ws.building_overlays',
    INCOME_MSG = 'ws.area_income',
    POPULATION_MSG = 'ws.population',
    SERVICE_PROV_MSG = 'ws.area_service_providers',
    BROADBAND_NOW_MSG = 'ws.area_bbn',
    SPEEDS_MSG = 'ws.area_speeds',
    POLY_AREA_MSG = 'ws.area_size',
    RDOF_GEOG_MSG = 'ws.geog_rdof',
    ZIP_GEOG_MSG = 'ws.geog_zip',
    COUNTY_GEOG_MSG = 'ws.geog_county',
    CENSUSBLOCK_GEOG_MSG = 'ws.geog_censusblock',
    TRIBAL_GEOG_MSG = 'ws.geog_tribal',
    CLOUDRF_VIEWSHED_MSG = 'ws.viewshed_cloudrf',
    MKT_EVAL_WS_ERR = 'ws.mkt_eval_err',
    SEND_REQUEST = 'ws.send_request',
    REQUEST_CANCELLED = 'ws.request_cancelled'
}

export type RDOFGeojsonResponse = {
    error: number;
    cbgid?: string;
    geojson?: string;
};

export type ZipGeojsonResponse = {
    error: number;
    zip?: string;
    geojson?: string;
};

export type TribalGeojsonResponse = {
    error: number;
    geoid?: string;
    geojson?: string;
};

export type CountyGeojsonResponse = {
    error: number;
    geojson?: string;
    statecode?: string;
    countycode?: string;
};

export type CensusBlockGeojsonResponse = {
    error: number;
    geojson?: string;
    blockcode?: string;
};

export type ViewshedGeojsonResponse = {
    error: number;
    coverage?: string;
    ap_uuid?: string;
    registration_number?: string;
    uuid: string;
};

export type MedianSpeed = {
    'Download (Mbit/s)': string;
    'Upload (Mbit/s)': string;
    Zipcode: string;
    pct_area: string;
};

export type MedianSpeedResponse = Array<MedianSpeed>;

export type ServiceProvidersResponse = {
    error: number;
    competitors: Array<string>;
    down_ad_speed: Array<number>;
    tech_used: Array<Array<number>>;
    up_ad_speed: Array<number>;
};

export type BroadbandNowResponse = {
    bbnPriceRange: Array<string> | null;
};

export type BuildingOverlaysResponse = {
    done: boolean;
    gc: {
        type: string;
        geometries: Array<GeoJSON.Polygon>;
    };
    offset: string;
};

export type MedianIncomeResponse = {
    averageMedianIncome: number;
    error?: string;
};

export type PopulationResponse = {
    population: string;
    error: number;
};

type MarketEvaluatorWSValue =
    | MedianSpeedResponse
    | ServiceProvidersResponse
    | BroadbandNowResponse
    | BuildingOverlaysResponse
    | MedianIncomeResponse
    | PopulationResponse
    | RDOFGeojsonResponse
    | ZipGeojsonResponse
    | CountyGeojsonResponse
    | ViewshedGeojsonResponse
    | string;

type GeoArea = GeoJSON.FeatureCollection | GeoJSON.Feature | GeoJSON.GeometryObject;

export type MarketEvaluatorWSResponse = {
    type: string;
    uuid: string;
    value: MarketEvaluatorWSValue;
};

interface MarketEvaluatorWSCallback {
    (message: MarketEvaluatorWSResponse): void;
}

export type UUID = string;

/**
 * UUID function from core WWW
 * Based on the rfc4122-compliant solution posted at
 * http://stackoverflow.com/questions/105034
 */
export function uuid(): UUID {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

class MarketEvaluatorWS {
    ws: WebSocket;
    message_handlers: Array<MarketEvaluatorWSCallback>;
    currentRequests: {
        [request_type in MarketEvalWSRequestType]: {
            uuid: UUID;
            request_type: MarketEvalWSRequestType;
            [s: string]: any;
        };
    };
    private static _instance: MarketEvaluatorWS;

    constructor(message_handlers: Array<MarketEvaluatorWSCallback>) {
        if (MarketEvaluatorWS._instance) {
            throw Error('This singleton has already been instantiated, use getInstance.');
        }
        this.message_handlers = message_handlers;
        let currentRequests: any = {};
        Object.values(MarketEvalWSRequestType).forEach((v: string) => {
            currentRequests[v] = { uuid: uuid() };
        });
        this.currentRequests = currentRequests;

        this.connect();
        MarketEvaluatorWS._instance = this;
    }

    static getInstance(): MarketEvaluatorWS {
        if (MarketEvaluatorWS._instance) {
            return MarketEvaluatorWS._instance;
        } else {
            throw new Error('No Instance of MarketEvaluatorWS instantiated.');
        }
    }

    protected setConnectionStatus(connected: boolean) {
        const element = $('#websocket-connection-status');
        const geocoder = $('#geocoder');
        if (connected) {
            element.addClass('d-none');
            geocoder.removeClass('d-none');
        } else {
            element.removeClass('d-none');
            geocoder.addClass('d-none');
        }
    }

    protected connect() {
        const protocol = location.protocol !== 'https:' ? 'ws://' : 'wss://';
        const domain =
            location.host === 'isptoolbox.io'
                ? 'isptoolbox.io'
                : location.host.split(':')[0] + ':8010'; // dev or prod, dev goes to port 8010
        this.ws = new WebSocket(protocol + domain + '/ws/market-evaluator/');

        this.ws.onclose = (e) => {
            this.setConnectionStatus(false);
            setTimeout(() => {
                this.connect();
            }, 1000);
        };

        this.ws.onopen = (e) => {
            this.setConnectionStatus(true);
            PubSub.publish(MarketEvalWSEvents.MKT_EVAL_WS_CONNECTED);
        };

        this.ws.onmessage = (e) => {
            const response = JSON.parse(e.data) as MarketEvaluatorWSResponse;
            this.message_handlers.forEach((handler) => {
                handler(response);
            });
            // One active request per message type.
            if (
                !Object.values(this.currentRequests)
                    .map((f: any) => f.uuid)
                    .includes(response.uuid)
            ) {
                return;
            }
            switch (response.type) {
                case 'building.overlays':
                    const buildings: BuildingOverlaysResponse =
                        response.value as BuildingOverlaysResponse;
                    PubSub.publish(MarketEvalWSEvents.BUILDING_OVERLAYS_MSG, buildings);
                    break;

                case 'median.income':
                    const medianIncome: MedianIncomeResponse =
                        response.value as MedianIncomeResponse;
                    PubSub.publish(MarketEvalWSEvents.INCOME_MSG, medianIncome);
                    break;

                case 'population':
                    const population: PopulationResponse = response.value as PopulationResponse;
                    PubSub.publish(MarketEvalWSEvents.POPULATION_MSG, population);
                    break;

                case 'service.providers':
                    const serviceProviders: ServiceProvidersResponse =
                        response.value as ServiceProvidersResponse;
                    PubSub.publish(MarketEvalWSEvents.SERVICE_PROV_MSG, serviceProviders);
                    break;

                case 'broadband.now':
                    const broadBandNow: BroadbandNowResponse =
                        response.value as BroadbandNowResponse;
                    PubSub.publish(MarketEvalWSEvents.BROADBAND_NOW_MSG, broadBandNow);
                    break;

                case 'median.speeds':
                    const medianSpeeds: MedianSpeedResponse = response.value as MedianSpeedResponse;
                    PubSub.publish(MarketEvalWSEvents.SPEEDS_MSG, medianSpeeds);
                    break;

                case 'polygon.area':
                    const polygonArea: number = parseFloat(response.value as string);
                    PubSub.publish(MarketEvalWSEvents.POLY_AREA_MSG, polygonArea);
                    break;

                case 'grant.geog':
                    const grantGeog: RDOFGeojsonResponse = response.value as RDOFGeojsonResponse;
                    PubSub.publish(MarketEvalWSEvents.RDOF_GEOG_MSG, grantGeog);
                    break;

                case 'zip.geog':
                    const zipGeog: ZipGeojsonResponse = response.value as ZipGeojsonResponse;
                    PubSub.publish(MarketEvalWSEvents.ZIP_GEOG_MSG, zipGeog);
                    break;

                case 'county.geog':
                    const countyGeog: CountyGeojsonResponse =
                        response.value as CountyGeojsonResponse;
                    PubSub.publish(MarketEvalWSEvents.COUNTY_GEOG_MSG, countyGeog);
                    break;

                case 'censusblock.geog':
                    const censusBlockGeog: CensusBlockGeojsonResponse =
                        response.value as CensusBlockGeojsonResponse;
                    PubSub.publish(MarketEvalWSEvents.CENSUSBLOCK_GEOG_MSG, censusBlockGeog);
                    break;

                case 'tribal.geog':
                    const tribalGeog: TribalGeojsonResponse =
                        response.value as TribalGeojsonResponse;
                    PubSub.publish(MarketEvalWSEvents.TRIBAL_GEOG_MSG, tribalGeog);

                case 'tower.viewshed':
                    const viewshed: ViewshedGeojsonResponse =
                        response.value as ViewshedGeojsonResponse;
                    PubSub.publish(MarketEvalWSEvents.CLOUDRF_VIEWSHED_MSG, viewshed);
                    break;

                case 'error':
                    const err: string = response.value as string;
                    PubSub.publish(MarketEvalWSEvents.MKT_EVAL_WS_ERR, err);
                    break;
            }
        };
    }

    /**
     * Converts a geo area to a Geometry Object
     * @param obj The object to convert to GeometryObject
     * @returns Geometry Object
     */
    convertGeoJSONObject(obj: GeoArea): GeoJSON.GeometryObject {
        if (obj.type === 'FeatureCollection') {
            const geometries = obj.features
                .map((f) => {
                    return f.geometry;
                })
                .filter(Boolean);
            return {
                type: 'GeometryCollection',
                geometries
            };
        } else if (obj.type === 'Feature') {
            return obj.geometry;
        } else {
            return obj;
        }
    }

    /**
     * Sends JSON object on the websocket, attaching an appropriate UUID to the request and returning it.
     * @param req Json Object
     * @returns The request-identifying UUID sent with the request
     */
    private sendJsonWithUUID(req: {
        request_type: MarketEvalWSRequestType;
        [s: string]: any;
    }): UUID {
        const reqUUID: UUID = uuid();
        const reqWithUUID = {
            ...req,
            uuid: reqUUID
        };
        this.currentRequests[req.request_type] = reqWithUUID;
        this.ws.send(JSON.stringify(reqWithUUID));
        PubSub.publish(MarketEvalWSEvents.SEND_REQUEST, req);
        return reqUUID;
    }

    /**
     * Cancels the current websocket request by resetting the current uuid
     * so the resulting event does not get fired. Not putting anything resets the entire
     * object.
     */
    cancelCurrentRequest(request_type: MarketEvalWSRequestType | undefined = undefined): void {
        let oldRequest;
        if (request_type === undefined) {
            Object.keys(this.currentRequests).forEach((type: MarketEvalWSRequestType) => {
                oldRequest = this.getCurrentRequest(type);
                this.currentRequests[type] = { request_type: type, uuid: uuid() };
                PubSub.publish(MarketEvalWSEvents.REQUEST_CANCELLED, oldRequest);
            });
        } else {
            oldRequest = this.getCurrentRequest(request_type);
            this.currentRequests[request_type] = { request_type, uuid: uuid() };
            PubSub.publish(MarketEvalWSEvents.REQUEST_CANCELLED, oldRequest);
        }
    }

    /**
     * Gets the current request of a certain request type.
     * @param request_type Request type
     * @returns
     */
    getCurrentRequest(request_type: MarketEvalWSRequestType) {
        return _.omit(this.currentRequests[request_type], ['uuid']);
    }

    /**
     * Main request of Market Evaluator, requests evaluation of a given GeoJSON area.
     * @param include GeoJSON area of interest
     * @returns The request-identifying UUID
     */
    sendPolygonRequest(include: GeoArea): UUID {
        let uuid = this.sendJsonWithUUID({
            request_type: MarketEvalWSRequestType.POLYGON,
            include: this.convertGeoJSONObject(include)
        });
        return uuid;
    }

    /**
     * Requests RDOF GeoJSON corresponsing to given census block group ID.
     * @param cbgid census block id
     * @returns The request-identifying UUID
     */
    sendRDOFRequest(cbgid: string): UUID {
        return this.sendJsonWithUUID({
            request_type: MarketEvalWSRequestType.RDOF,
            cbgid
        });
    }

    /**
     * Requests Zip GeoJSON corresponsing to given zipcode.
     * @param zip zipcode
     * @returns The request-identifying UUID
     */
    sendZipRequest(zip: string): UUID {
        return this.sendJsonWithUUID({
            request_type: MarketEvalWSRequestType.ZIP,
            zip
        });
    }

    /**
     * Requests County GeoJSON corresponsing to given county and statecode.
     * @param countycode the county code
     * @param statecode the state code
     * @returns The request-identifying UUID
     */
    sendCountyRequest(countycode: string, statecode: string): UUID {
        return this.sendJsonWithUUID({
            request_type: MarketEvalWSRequestType.COUNTY,
            countycode,
            statecode
        });
    }

    /**
     * Requests census block GeoJSON corresponsing to given blockcode.
     * @param blockcode the census block code
     * @returns The request-identifying UUID
     */
    sendCensusBlockRequest(blockcode: string): UUID {
        return this.sendJsonWithUUID({
            request_type: MarketEvalWSRequestType.CENSUS_BLOCK,
            blockcode
        });
    }

    sendTribalRequest(geoid: string): UUID {
        return this.sendJsonWithUUID({
            request_type: MarketEvalWSRequestType.TRIBAL,
            geoid
        });
    }

    /**
     * Requests CloudRF viewshed associated with given parameters.
     * @param apUuid sector UUID
     * @returns The request-identifying UUID
     */
    sendViewshedRequest(apUuid: string): UUID {
        // TODO: Only the sector UUID is needed. Deprecate the other params.
        return this.sendJsonWithUUID({
            request_type: MarketEvalWSRequestType.VIEWSHED,
            customerHeight: 0,
            height: 0,
            lat: 0,
            lon: 0,
            radius: 0,
            apUuid
        });
    }

    /**
     * Requests CloudRF viewshed associated with given parameters.
     * @param height Height in meters
     * @param lat latitude as float
     * @param lon longitude as float
     * @param radius Radius in km
     * @param registrationNumber ASR registration number
     * @returns The request-identifying UUID
     */
    sendASRViewshedRequest(
        height: number,
        lat: number,
        lon: number,
        radius: number,
        registrationNumber: string
    ): UUID {
        return this.sendJsonWithUUID({
            request_type: MarketEvalWSRequestType.ASR_VIEWSHED,
            height,
            lat,
            lon,
            radius,
            registrationNumber
        });
    }
}

export default MarketEvaluatorWS;
