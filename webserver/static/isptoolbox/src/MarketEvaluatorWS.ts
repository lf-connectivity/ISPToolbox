/**  Copyright Facebook 2021
 *
 * Connection Manager for Market Evaluator Websocket
 *
 **/

import PubSub from 'pubsub-js';

export enum MarketEvalWSEvents {
    MKT_EVAL_WS_CONNECTED = 'ws.mkt_eval_connected',
    BUILDING_OVERLAYS_MSG = 'ws.building_overlays',
    INCOME_MSG = 'ws.area_income',
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
}

export type RDOFGeojsonResponse = {
    error: number,
    cbgid?: string,
    geojson?: string,
};

export type ZipGeojsonResponse = {
    error: number,
    zip?: string,
    geojson?: string,
};

export type TribalGeojsonResponse = {
    error: number,
    geoid?: string,
    geojson?: string,
};

export type CountyGeojsonResponse = {
    error: number,
    geojson?: string,
    statecode?: string,
    countycode?: string,
};

export type CensusBlockGeojsonResponse = {
    error: number,
    geojson?: string,
    blockcode?: string,
};

export type ViewshedGeojsonResponse = {
    error: number,
    coverage?: GeoJSON.GeometryCollection,
    uuid: string,
};

type MedianSpeed = {
    'Download (Mbit/s)': string,
    'Upload (Mbit/s)': string,
    Zipcode: string,
    pct_area: string,
};

export type MedianSpeedResponse = Array<MedianSpeed>;

export type ServiceProvidersResponse = {
    error: number,
    competitors: Array<string>,
    down_ad_speed: Array<number>,
    tech_used: Array<Array<number>>,
    up_ad_speed: Array<number>,
};

export type BroadbandNowResponse = {
    bbnPriceRange: Array<string> | null,
};

export type BuildingOverlaysResponse = {
    done: boolean,
    gc: {
        type: string,
        geometries: Array<GeoJSON.Polygon>,
    },
    offset: string,
};

export type MedianIncomeResponse = {
    averageMedianIncome: number,
    error?: string,
};

type MarketEvaluatorWSValue =
    | MedianSpeedResponse
    | ServiceProvidersResponse
    | BroadbandNowResponse
    | BuildingOverlaysResponse
    | MedianIncomeResponse
    | RDOFGeojsonResponse
    | ZipGeojsonResponse
    | CountyGeojsonResponse
    | ViewshedGeojsonResponse
    | string;

type GeoArea = GeoJSON.FeatureCollection | GeoJSON.Feature | GeoJSON.GeometryObject;

export type MarketEvaluatorWSResponse = {
    type: string,
    uuid: string,
    value: MarketEvaluatorWSValue,
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
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        const v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

class MarketEvaluatorWS {
    ws: WebSocket;
    message_handlers: Array<MarketEvaluatorWSCallback>;
    currentRequestUUID: UUID;

    constructor(message_handlers: Array<MarketEvaluatorWSCallback>) {
        this.message_handlers = message_handlers;
        this.connect();
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
        const domain = location.protocol !== 'https:' ? location.host : 'isptoolbox.io';
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
            // For now, only one active request at a time
            if (response.uuid !== this.currentRequestUUID) {
                return;
            }
            switch (response.type) {
                case 'building.overlays':
                    const buildings: BuildingOverlaysResponse = response.value as BuildingOverlaysResponse;
                    PubSub.publish(MarketEvalWSEvents.BUILDING_OVERLAYS_MSG, buildings);
                    break;

                case 'median.income':
                    const medianIncome: MedianIncomeResponse = response.value as MedianIncomeResponse;
                    PubSub.publish(MarketEvalWSEvents.INCOME_MSG, medianIncome);
                    break;

                case 'service.providers':
                    const serviceProviders: ServiceProvidersResponse = response.value as ServiceProvidersResponse;
                    PubSub.publish(MarketEvalWSEvents.SERVICE_PROV_MSG, serviceProviders);
                    break;

                case 'broadband.now':
                    const broadBandNow: BroadbandNowResponse = response.value as BroadbandNowResponse;
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
                    const countyGeog: CountyGeojsonResponse = response.value as CountyGeojsonResponse;
                    PubSub.publish(MarketEvalWSEvents.COUNTY_GEOG_MSG, countyGeog);
                    break;

                case 'censusblock.geog':
                    const censusBlockGeog: CensusBlockGeojsonResponse = response.value as CensusBlockGeojsonResponse;
                    PubSub.publish(MarketEvalWSEvents.CENSUSBLOCK_GEOG_MSG, censusBlockGeog);
                    break;

                case 'tribal.geog':
                    const tribalGeog: TribalGeojsonResponse = response.value as TribalGeojsonResponse;
                    PubSub.publish(MarketEvalWSEvents.TRIBAL_GEOG_MSG, tribalGeog)

                case 'tower.viewshed':
                    const viewshed: ViewshedGeojsonResponse = response.value as ViewshedGeojsonResponse;
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
                .map(f => {
                    return f.geometry;
                })
                .filter(Boolean);
            return {
                type: 'GeometryCollection',
                geometries,
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
    private sendJson(req: Object): UUID {
        const reqUUID: UUID = uuid();
        this.currentRequestUUID = reqUUID;
        const reqWithUUID = {
            ...req,
            uuid: reqUUID,
        };
        this.ws.send(JSON.stringify(reqWithUUID));
        return reqUUID;
    }

    /**
     * Cancels the current websocket request by resetting the current uuid
     * so the resulting event does not get fired. 
     */
    cancelCurrentRequest(): void {
        this.currentRequestUUID = uuid();
    }

    /**
     * Main request of Market Evaluator, requests evaluation of a given GeoJSON area.
     * @param include GeoJSON area of interest
     * @returns The request-identifying UUID
     */
    sendPolygonRequest(include: GeoArea): UUID {
        return this.sendJson({
            request_type: 'standard_polygon',
            include: this.convertGeoJSONObject(include),
        });
    }

    /**
     * Requests RDOF GeoJSON corresponsing to given census block group ID.
     * @param cbgid census block id
     * @returns The request-identifying UUID
     */
    sendRDOFRequest(cbgid: string): UUID {
        return this.sendJson({
            request_type: 'grant',
            cbgid,
        });
    }

    /**
     * Requests Zip GeoJSON corresponsing to given zipcode.
     * @param zip zipcode
     * @returns The request-identifying UUID
     */
    sendZipRequest(zip: string): UUID {
        return this.sendJson({
            request_type: 'zip',
            zip,
        });
    }

    /**
     * Requests County GeoJSON corresponsing to given county and statecode.
     * @param countycode the county code
     * @param statecode the state code
     * @returns The request-identifying UUID
     */
    sendCountyRequest(countycode: string, statecode: string): UUID {
        return this.sendJson({
            request_type: 'county',
            countycode,
            statecode,
        });
    }

    /**
     * Requests census block GeoJSON corresponsing to given blockcode.
     * @param blockcode the census block code
     * @returns The request-identifying UUID
     */
    sendCensusBlockRequest(blockcode: string): UUID {
        return this.sendJson({
            request_type: 'census_block',
            blockcode,
        });
    }

    /**
     * Requests CloudRF viewshed associated with given parameters.
     * @param customerHeight CPE height in meters
     * @param height Height in meters
     * @param lat latitude as float
     * @param lon longitude as float
     * @param radius Radius in meters
     * @returns The request-identifying UUID
     */
    sendViewshedRequest(customerHeight: number, height: number, lat: number, lon: number, radius: number): UUID {
        return this.sendJson({
            request_type: 'viewshed',
            customerHeight,
            height,
            lat,
            lon,
            radius,
        });
    }
}

export default MarketEvaluatorWS;