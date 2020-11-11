/**  Copyright Facebook 2020
 *
 * Connection Manager for LOS Check Websocket
 *
 **/

class LOSCheckWS {
    ws : WebSocket;
    networkName : string;
    constructor(networkName : string){
        this.networkName = networkName;
        this.connect();
    }

    connect(){
        const protocol = location.protocol !== 'https:' ? 'ws://' : 'wss://';
        const domain = location.protocol !== 'https:' ? 'localhost:59264' : 'isptoolbox.io';
        this.ws = new WebSocket(protocol + domain + '/ws/los/' + this.networkName + '/');

        this.ws.onmessage = function(e) {
            const data = JSON.parse(e.data);
        };

        this.ws.onclose = (e) => {
            setTimeout(()=> {
                this.connect();
            }, 1000)
        }
    }

    sendRequest(tx: [number, number], rx: [number, number], resolution: string, fbid: string) {
        this.ws.send(JSON.stringify({
            msg : 'ptp',
            tx : tx,
            rx : rx,
            resolution : resolution,
            fbid: fbid,
        }));
    }
}

export default LOSCheckWS;