import * as socketio from 'socket.io';
import {settings} from '../settings';
import Redis from "ioredis";

export type MultiplayerSessionValue = {
    user: string,
    session: string,
    name: string,
    token: string,
};
const redis = new Redis(settings.REDIS_BACKEND);

/**
 * 
 * @param socket - connection made to websocket nodejs
 * @returns boolean - indicates if request to connect is valid
 */
async function isValid(socket: socketio.Socket): Promise<boolean>{
    const token = socket.handshake.auth.token;
    const val = await redis.get(`multiplayer-auth-${token}`);
    if(val !== null){
        const value = JSON.parse(val) as MultiplayerSessionValue;
        if(socket.handshake.query.session !== value.session ||
            socket.handshake.auth.token !== value.token){
            return false;
        } else {
            socket.handshake.query.user = value.user;
            socket.handshake.query.name = value.name;
        }
    } else {
        return false;
    }
    return true;
}

export default async function django_multiplayer_session_auth_middleware(socket: socketio.Socket, next: any){
    if (await isValid(socket)) {
        next();
    } else {
        next(new Error("unauthorized"));
    }
}