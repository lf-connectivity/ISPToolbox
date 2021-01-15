/**  Copyright Facebook 2020
 *
 * Connection Manager for LOS Check Websocket
 *
 **/

type LOSCheckResponse =  {

}
interface LOSCallback {
    (response : LOSCheckResponse) : void
};

type LOSCheckWSCallbacks = {
    'ptp' : LOSCallback
}
class LOSCheckWS {
    ws : WebSocket;
    networkName : string;
    pendingRequests : Array<string> = [];
    callbacks: LOSCheckWSCallbacks = {
        'ptp' : () => null,
    };
    hash : string = '';
    constructor(networkName : string, callback : LOSCallback){
        this.networkName = networkName;
        this.connect();
        this.callbacks['ptp'] = callback;
    }

    connect(){
        const protocol = location.protocol !== 'https:' ? 'ws://' : 'wss://';
        const domain = location.protocol !== 'https:' ? location.host : 'isptoolbox.io';
        this.ws = new WebSocket(protocol + domain + '/ws/los/' + this.networkName + '/');

        this.ws.onmessage = function(e) {
            const data = JSON.parse(e.data);
        };

        this.ws.onclose = (e) => {
            setTimeout(()=> {
                this.connect();
            }, 1000)
        }

        this.ws.onopen = (e) => {
            this.pendingRequests.map(req => {
                this.ws.send(req);
            })
            this.pendingRequests = [];
        }

        this.ws.onmessage = (e) => {
            const resp = JSON.parse(e.data);
            if(resp.hash === this.hash)
            {
                this.callbacks['ptp'](e);
            }
        }
    }

    sendRequest(tx: [number, number], rx: [number, number], fbid: string) {
        const hash = [String(tx), String(rx), fbid].join(',');
        this.hash = hash;
        const request = JSON.stringify({
            msg : 'ptp',
            tx : tx,
            rx : rx,
            fbid: fbid,
            hash: hash
        });
        if(this.ws.readyState !== WebSocket.OPEN)
        {
            this.pendingRequests.push(request);
        } else {
            this.ws.send(request);
        }
    }
}

export default LOSCheckWS;