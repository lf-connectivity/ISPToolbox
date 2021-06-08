import PubSub from 'pubsub-js';
const io = require("socket.io-client");

const SOCKET_OPTIONS = {
    path: '/live',
    transports: ['websocket'],
}
const SOCKET_IO_ENDPOINT = window.location.protocol  === 'http:' ? "ws://localhost:8080" : "wss://isptoolbox.io";

export class MultiplayerConnection {
    socket: any;
    constructor(private token: string, private session: string){
        const options = {
            ...SOCKET_OPTIONS,
            auth: {
                token
            },
            query: {
                session
            }
        };
        this.socket = io(SOCKET_IO_ENDPOINT, options);
        this.socket.on("connect", () => {
            console.log("socket io connected");
        });
        
        // handle the event sent with this.socket.send()
        this.socket.on('multiplayer-msg', (data: any) => {
            console.log(data);
            PubSub.publish(data.type, data);
        });
    }

    getProtocol(): string{
        return location.protocol !== 'https:' ? 'ws://' : 'wss://';
    }

    getDomain(): string {
        return location.protocol !== 'https:' ? location.host : 'isptoolbox.io';
    }

    send(data: any){
        this.socket.emit('multiplayer-msg', data);
    }
}