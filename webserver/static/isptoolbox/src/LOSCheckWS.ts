/**  Copyright Facebook 2020
 *
 * Connection Manager for LOS Check Websocket
 *
 **/

export enum LOSWSHandlers {
    LIDAR = 'lidar',
    TERRAIN = 'terrain',
    LINK = 'link'
}

export type LinkResponse = {
    handler: LOSWSHandlers.LINK,
    error : string | null,
    hash: string
}

export type TerrainResponse = {
    handler: LOSWSHandlers.TERRAIN,
    error: string | null,
    hash: string,
    source: string | null,
    terrain_profile: Array<{elevation: number, lat : number, lng: number}>,
}

export type LidarResponse = {
    handler: LOSWSHandlers.LIDAR,
    error: string | null,
    hash: string,
    source : string| null,
    lidar_profile: Array<[number, number]>,
    res: string,
    url: string,
    bb : Array<number>,
    rx : [number, number],
    tx : [number, number],
}

export type LOSCheckResponse =  LinkResponse | TerrainResponse | LidarResponse;

interface LOSCheckWSCallbacks {
    (message : LOSCheckResponse) : void
}
class LOSCheckWS {
    ws : WebSocket;
    networkName : string;
    pendingRequests : Array<string> = [];
    message_handlers: Array<LOSCheckWSCallbacks>;
    hash : string = '';
    constructor(networkName : string, message_handlers : Array<LOSCheckWSCallbacks>){
        this.networkName = networkName;
        this.message_handlers = message_handlers;
        this.connect();
    }

    connect(){
        const protocol = location.protocol !== 'https:' ? 'ws://' : 'wss://';
        const domain = location.protocol !== 'https:' ? location.host : 'isptoolbox.io';
        this.ws = new WebSocket(protocol + domain + '/ws/los/' + this.networkName + '/');


        this.ws.onclose = (e) => {
            setTimeout(()=> {
                this.connect();
            }, 1000)
        }

        this.ws.onopen = (e) => {
            while(this.pendingRequests.length > 0) {
                const request = this.pendingRequests.pop();
                if(typeof request === 'string'){
                    this.ws.send(request);
                }
            }
        }

        this.ws.onmessage = (e) => {
            const resp = JSON.parse(e.data) as LOSCheckResponse;
            if(resp.hash === this.hash){
                this.message_handlers.forEach((handler)=>{
                    handler(resp);
                })
            }
        }
    }

    sendRequest(tx: [number, number], rx: [number, number], fbid: string) {
        const hash = [String(tx), String(rx), fbid].join(',');
        this.hash = hash;
        const request = JSON.stringify({
            msg : 'link',
            tx : tx,
            rx : rx,
            fbid: fbid,
            hash: hash
        });
        if(this.ws.readyState !== WebSocket.OPEN) {
            this.pendingRequests.push(request);
        } else {
            this.ws.send(request);
        }
    }
}

export default LOSCheckWS;