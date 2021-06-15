/**  Copyright Facebook 2021
 *
 * Connection Manager for Market Evaluator Websocket
 *
 **/

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
    pct_area?: string,
  };

type MedianSpeedResponse = Array<MedianSpeed>;

type ServiceProvidersResponse = {
  error: number,
  competitors: Array<string>,
  down_ad_speed: Array<number>,
  tech_used: Array<Array<number>>,
  up_ad_speed: Array<number>,
};

type BroadbandNowResponse = {
  bbnPriceRange: Array<string> | null,
};

type BuildingOverlaysResponse = {
  done: boolean,
  gc: {
    type: string,
    geometries: Array<GeoJSON.Polygon>,
  },
  offset: string,
};

type MedianIncomeResponse = {
  averageMedianIncome: number,
  error?: string,
};

type AuthenticationResponse = {
  token?: string,
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
  | AuthenticationResponse
  | string;

type MarketEvaluatorWSResponse = {
  type: string,
  uuid: string,
  value: MarketEvaluatorWSValue,
};


interface MarketEvaluatorWSCallback {
    (message : MarketEvaluatorWSResponse) : void
}

class MarketEvaluatorWS {
    ws : WebSocket;
    networkName : string;
    message_handlers: Array<MarketEvaluatorWSCallback>;
    hash : string = '';
    constructor(networkName : string, message_handlers : Array<MarketEvaluatorWSCallback>){
        this.networkName = networkName;
        this.message_handlers = message_handlers;
        this.connect();
    }

    setConnectionStatus(connected: boolean){
        const element = $('#websocket-connection-status');
        const geocoder = $('#geocoder');
        if(connected){
            element.addClass('d-none');
            geocoder.removeClass('d-none');
        } else {
            element.removeClass('d-none');
            geocoder.addClass('d-none');
        }
    }

    connect(){
        const protocol = location.protocol !== 'https:' ? 'ws://' : 'wss://';
        const domain = location.protocol !== 'https:' ? location.host : 'isptoolbox.io';
        this.ws = new WebSocket(protocol + domain + '/ws/market-evaluator/' + this.networkName + '/');


        this.ws.onclose = (e) => {
            this.setConnectionStatus(false);
            setTimeout(()=> {
                this.connect();
            }, 1000)
        }

        this.ws.onopen = (e) => {
            this.setConnectionStatus(true);
        }

        this.ws.onmessage = (e) => {
            const resp = JSON.parse(e.data) as MarketEvaluatorWSResponse;
            this.message_handlers.forEach((handler)=>{
                handler(resp);
            });
        }
    }
}

export default MarketEvaluatorWS;