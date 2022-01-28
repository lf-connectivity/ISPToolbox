/**  Copyright Facebook 2020
 *
 * Connection Manager for LOS Check Websocket
 *
 **/
import PubSub from 'pubsub-js';
import { ViewshedTool } from './organisms/ViewshedTool';
import { setConnectionStatus } from './utils/ConnectionIssues';
import { getSessionID } from './utils/MapPreferences';
import {
    AccessPointCoverageResponse,
    LOSCheckResponse,
    LOSWSEvents,
    WSResponse,
    WS_AP_Events
} from './workspace/WorkspaceConstants';

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

    private static _instance: LOSCheckWS;

    constructor(networkName: string) {
        if (LOSCheckWS._instance) {
            return LOSCheckWS._instance;
        }
        this.networkName = networkName;
        this.connect();
        LOSCheckWS._instance = this;
    }

    setWSConnectionStatus(connected: boolean) {
        setConnectionStatus(connected);
    }

    connect() {
        const protocol = location.protocol !== 'https:' ? 'ws://' : 'wss://';
        const domain =
            location.host === 'isptoolbox.io'
                ? 'isptoolbox.io'
                : location.host.split(':')[0] + ':8010'; // dev or prod, dev goes to port 8010
        this.ws = new WebSocket(protocol + domain + '/ws/los/' + this.networkName + '/');

        this.ws.onclose = (e) => {
            this.setWSConnectionStatus(false);
            setTimeout(() => {
                this.connect();
            }, 1000);
        };

        this.ws.onopen = (e) => {
            this.setWSConnectionStatus(true);
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
                    break;
                case WS_AP_Events.CPE_SECTOR_CREATED:
                    PubSub.publish(LOSWSEvents.CPE_SECTOR_CREATED_MSG, resp);
                    break;
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

    sendAPRequest(uuid: string) {
        const request = JSON.stringify({
            msg: 'ap',
            uuid: uuid
        });
        if (this.ws.readyState !== WebSocket.OPEN) {
            this.pendingRequests.push(request);
        } else {
            this.ws.send(request);
        }
        ViewshedTool.getInstance().setVisibleLayer(false);
    }

    static sendCPELocationRequest(lng: number, lat: number) {
        const request = JSON.stringify({
            msg: 'cpe_location',
            session_id: getSessionID(),
            lng: lng,
            lat: lat
        });
        const ws = LOSCheckWS._instance.ws;
        if (ws.readyState !== WebSocket.OPEN) {
            LOSCheckWS._instance.pendingRequests.push(request);
        } else {
            ws.send(request);
        }
    }
}

export default LOSCheckWS;
