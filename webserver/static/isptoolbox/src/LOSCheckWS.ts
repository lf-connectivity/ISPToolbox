/**  Copyright Facebook 2020
 *
 * Connection Manager for LOS Check Websocket
 *
 **/
import PubSub from 'pubsub-js';

export enum LOSWSEvents {
    LIDAR_MSG = 'ws.lidar_msg',
    TERRAIN_MSG = 'ws.terrain_msg',
    LINK_MSG = 'ws.link_msg',
    VIEWSHED_MSG = 'ws.viewshed_msg',
}

export enum LOSWSHandlers {
    LIDAR = 'lidar',
    TERRAIN = 'terrain',
    LINK = 'link'
}

export type LinkResponse = {
    type: "standard.message",
    handler: LOSWSHandlers.LINK,
    error : string | null,
    hash: string,
    dist: number
}

export type TerrainResponse = {
    type: "standard.message",
    handler: LOSWSHandlers.TERRAIN,
    error: string | null,
    hash: string,
    source: string | null,
    dist: number,
    aoi: [number, number],
    terrain_profile: Array<{elevation: number, lat : number, lng: number}>,
}

export type ViewShedResponse = {
    type: "ap.viewshed",
    base_url: string,
    url: string,
    coordinates: GeoJSON.Polygon
}

export type LidarResponse = {
    type: "standard.message",
    handler: LOSWSHandlers.LIDAR,
    error: string | null,
    hash: string,
    source : Array<string>,
    lidar_profile: Array<number>
    dist : number,
    res: number,
    url: Array<string>,
    bb : Array<number>,
    aoi: [number, number],
    rx : [number, number],
    tx : [number, number],
    still_loading: boolean,
}
export type AccessPointCoverageResponse = {
    type: "ap.status",
    uuid: string
}

export type LOSCheckResponse =  LinkResponse | TerrainResponse | LidarResponse;
export type WSResponse = LOSCheckResponse | AccessPointCoverageResponse | ViewShedResponse;

interface LOSCheckWSCallbacks {
    (message : LOSCheckResponse) : void
}

interface AccesPointWSCallback {
    (message : AccessPointCoverageResponse) : void
}
class LOSCheckWS {
    ws : WebSocket;
    networkName : string;
    pendingRequests : Array<string> = [];
    message_handlers: Array<LOSCheckWSCallbacks>;
    ap_callback : AccesPointWSCallback;
    hash : string = '';
    constructor(networkName : string, message_handlers : Array<LOSCheckWSCallbacks>){
        this.networkName = networkName;
        this.message_handlers = message_handlers;
        this.connect();
    }

    setConnectionStatus(connected: boolean){
        const element = $('#los-check-connection-status');
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
        this.ws = new WebSocket(protocol + domain + '/ws/los/' + this.networkName + '/');


        this.ws.onclose = (e) => {
            this.setConnectionStatus(false);
            setTimeout(()=> {
                this.connect();
            }, 1000)
        }

        this.ws.onopen = (e) => {
            this.setConnectionStatus(true);
            while(this.pendingRequests.length > 0) {
                const msg = this.pendingRequests.pop();
                if (typeof msg === 'string')
                {
                    this.ws.send(msg);
                }
            }
        }

        this.ws.onmessage = (e) => {
            const resp = JSON.parse(e.data) as WSResponse;
            switch(resp.type){
                case "standard.message":
                    if(resp.hash === this.hash){
                        this.message_handlers.forEach((handler)=>{
                            handler(resp);
                        });
                    }
                    break;
                case "ap.status":
                    this.ap_callback(resp);
                    break;
                case "ap.viewshed":
                    PubSub.publish(LOSWSEvents.VIEWSHED_MSG, resp);
                    break;
                default:
                    break;
            }
        }
    }

    setAccessPointCallback(callback: AccesPointWSCallback){
        this.ap_callback = callback;
    }

    sendRequest(tx: [number, number], rx: [number, number], fbid: string, freq: number = 0, aoi : [number ,number] = [0, 1]) {
        const hash = [String(tx), String(rx), fbid, aoi].join(',');
        this.hash = hash;
        const request = JSON.stringify({
            msg : 'link',
            tx : tx,
            rx : rx,
            fbid: fbid,
            aoi: aoi,
            hash: hash,
            freq: freq,
        });
        if(this.ws.readyState !== WebSocket.OPEN) {
            this.pendingRequests.push(request);
        } else {
            this.ws.send(request);
        }
    }

    sendAPRequest(uuid: string, height: number){
        const request = JSON.stringify({
            msg : 'ap',
            ap_hgt: height,
            uuid: uuid,
        });
        if(this.ws.readyState !== WebSocket.OPEN) {
            this.pendingRequests.push(request);
        } else {
            this.ws.send(request);
        }
    }
}

export default LOSCheckWS;