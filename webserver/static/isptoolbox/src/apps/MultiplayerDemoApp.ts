// (c) Meta Platforms, Inc. and affiliates. Copyright
import { MapboxMultiplayerControl } from '../utils/multiplayer/MapboxMultiplayerControl';
import { MultiplayerConnection } from '../utils/multiplayer/MultiplayerConnection';

console.log('Starting Multiplayer Test');
type SessionInformation = {
    id: string;
    token: string;
};
// Get Session information from DOM
const session_info = document.getElementById('session_information');
const session = JSON.parse(
    session_info ? (session_info.textContent ? session_info.textContent : '{}') : '{}'
) as SessionInformation;

// Create WebSocket Connection With Server
//@ts-ignore
window.mapboxgl.accessToken = window.mapbox_access_token;
const map = new window.mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/satellite-streets-v11' // stylesheet location
});
map.on('load', () => {
    const draw = new window.MapboxDraw({
        userProperties: true,
        displayControlsDefault: true
    });
    map.addControl(draw, 'bottom-right');
    const connection = new MultiplayerConnection(session.token, session.id);
    const multiplayer = new MapboxMultiplayerControl(draw, connection);
    map.addControl(multiplayer, 'top-right');
    //@ts-ignore
    $('#inviteModal').modal('show');
});
