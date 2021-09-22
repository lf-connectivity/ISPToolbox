/**  Copyright Facebook 2020
 *
 * Connection Manager for LOS Check Websocket
 *
 **/
import PubSub from 'pubsub-js';
import { ViewshedTool } from './organisms/ViewshedTool';

export enum LOSWSEvents {
    LIDAR_MSG = 'ws.lidar_msg',
    TERRAIN_MSG = 'ws.terrain_msg',
    LINK_MSG = 'ws.link_msg',
    VIEWSHED_MSG = 'ws.viewshed_msg',
    AP_MSG = 'ws.ap_msg',
    VIEWSHED_PROGRESS_MSG = 'ws.viewshed_progress_msg',
    VIEWSHED_UNEXPECTED_ERROR_MSG = 'ws.viewshed_unexpected_err_msg',
    STD_MSG = 'ws.std_msg'
}

export enum WS_AP_Events {
    STD_MSG = 'standard.message',
    AP_VIEWSHED = 'ap.viewshed',
    AP_STATUS = 'ap.status',
    AP_UNEXPECTED_ERROR = 'ap.unexpected_error',
    AP_ERROR = 'ap.error',
    AP_VIEWSHED_PROGRESS = 'ap.viewshed_progress'
}

export enum LOSWSHandlers {
    LIDAR = 'lidar',
    TERRAIN = 'terrain',
    LINK = 'link'
}

export type LinkResponse = {
    type: 'standard.message';
    handler: LOSWSHandlers.LINK;
    error: string | null;
    hash: string;
    dist: number;
};

export type TerrainResponse = {
    type: 'standard.message';
    handler: LOSWSHandlers.TERRAIN;
    error: string | null;
    hash: string;
    source: string | null;
    dist: number;
    aoi: [number, number];
    terrain_profile: Array<{ elevation: number; lat: number; lng: number }>;
};

export type ViewShedResponse = {
    type: WS_AP_Events.AP_VIEWSHED;
    base_url: string;
    maxzoom: number;
    minzoom: number;
    uuid: string;
};

export type ViewshedUnexpectedError = {
    type: WS_AP_Events.AP_UNEXPECTED_ERROR;
    msg: string;
    uuid: string;
};

export type ViewshedProgressResponse = {
    type: WS_AP_Events.AP_VIEWSHED_PROGRESS;
    progress: string | null;
    time_remaining: number | null;
    uuid: string;
};

export type LidarResponse = {
    type: 'standard.message';
    handler: LOSWSHandlers.LIDAR;
    error: string | null;
    hash: string;
    source: Array<string>;
    lidar_profile: Array<number>;
    dist: number;
    res: number;
    url: Array<string>;
    bb: Array<number>;
    aoi: [number, number];
    rx: [number, number];
    tx: [number, number];
    still_loading: boolean;
};
export type AccessPointCoverageResponse = {
    type: WS_AP_Events.AP_STATUS;
    uuid: string;
};

export type LOSCheckResponse = LinkResponse | TerrainResponse | LidarResponse;
export type WSResponse =
    | LOSCheckResponse
    | AccessPointCoverageResponse
    | ViewShedResponse
    | ViewshedProgressResponse
    | ViewshedUnexpectedError;

interface LOSCheckWSCallbacks {
    (message: LOSCheckResponse): void;
}

interface AccesPointWSCallback {
    (message: AccessPointCoverageResponse): void;
}
class LOSCheckWS {
    ws: WebSocket;
    networkName: string;
    pendingRequests: Array<string> = [];
    ap_callback: AccesPointWSCallback;
    hash: string = '';
    constructor(networkName: string) {
        this.networkName = networkName;
        this.connect();
    }

    setConnectionStatus(connected: boolean) {
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

    connect() {
        const protocol = location.protocol !== 'https:' ? 'ws://' : 'wss://';
        const domain = location.protocol !== 'https:' ? location.host : 'isptoolbox.io';
        this.ws = new WebSocket(protocol + domain + '/ws/los/' + this.networkName + '/');

        this.ws.onclose = (e) => {
            this.setConnectionStatus(false);
            setTimeout(() => {
                this.connect();
            }, 1000);
        };

        this.ws.onopen = (e) => {
            this.setConnectionStatus(true);
            while (this.pendingRequests.length > 0) {
                const msg = this.pendingRequests.pop();
                if (typeof msg === 'string') {
                    this.ws.send(msg);
                }
            }
        };

        this.ws.onmessage = (e) => {
            const resp = JSON.parse(e.data) as WSResponse;
            switch (resp.type) {
                case WS_AP_Events.STD_MSG:
                    PubSub.publish(LOSWSEvents.STD_MSG, resp);
                    break;
                case WS_AP_Events.AP_STATUS:
                    PubSub.publish(LOSWSEvents.AP_MSG, resp);
                    break;
                case WS_AP_Events.AP_VIEWSHED:
                    PubSub.publish(LOSWSEvents.VIEWSHED_MSG, resp);
                    break;
                case WS_AP_Events.AP_VIEWSHED_PROGRESS:
                    PubSub.publish(LOSWSEvents.VIEWSHED_PROGRESS_MSG, resp);
                    break;
                case WS_AP_Events.AP_UNEXPECTED_ERROR:
                    PubSub.publish(LOSWSEvents.VIEWSHED_UNEXPECTED_ERROR_MSG, resp);
                default:
                    break;
            }
        };
    }

    sendRequest(
        tx: [number, number],
        rx: [number, number],
        fbid: string,
        freq: number = 0,
        aoi: [number, number] = [0, 1]
    ) {
        const hash = [String(tx), String(rx), fbid, aoi].join(',');
        this.hash = hash;
        const request = JSON.stringify({
            msg: 'link',
            tx: tx,
            rx: rx,
            fbid: fbid,
            aoi: aoi,
            hash: hash,
            freq: freq
        });
        if (this.ws.readyState !== WebSocket.OPEN) {
            this.pendingRequests.push(request);
        } else {
            this.ws.send(request);
        }
    }

    sendAPRequest(uuid: string, height: number) {
        const request = JSON.stringify({
            msg: 'ap',
            ap_hgt: height,
            uuid: uuid
        });
        if (this.ws.readyState !== WebSocket.OPEN) {
            this.pendingRequests.push(request);
        } else {
            this.ws.send(request);
        }
        ViewshedTool.getInstance().setVisibleLayer(false);
    }
}

export default LOSCheckWS;
