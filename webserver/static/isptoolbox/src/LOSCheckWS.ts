/**  Copyright Facebook 2020
 *
 * Connection Manager for LOS Check Websocket
 *
 **/
import PubSub from 'pubsub-js';
import { ViewshedTool } from './organisms/ViewshedTool';
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
        const domain =
            location.host === 'isptoolbox.io'
                ? 'isptoolbox.io'
                : location.host.split(':')[0] + ':8010'; // dev or prod, dev goes to port 8010
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
}

export default LOSCheckWS;
