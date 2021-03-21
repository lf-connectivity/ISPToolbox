import {LinkCheckPage} from './LinkCheckPage'

$(document).ready(function () {
    window.mapboxgl.accessToken = 'pk.eyJ1IjoiZmJtYXBzIiwiYSI6ImNqOGFmamkxdTBmbzUyd28xY3lybnEwamIifQ.oabgbuGc81ENlOJoPhv4OQ';
    const networkID = window.networkID;
    const userRequestIdentity = window.userRequestIdentity;
    let radio_names = window.radio_names;
    if(radio_names === undefined) {
        radio_names = ['ap', 'cpe']
    }
    new LinkCheckPage(networkID, userRequestIdentity, radio_names);
});