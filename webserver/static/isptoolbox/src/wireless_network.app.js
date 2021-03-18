import {LinkCheckPage} from './LinkCheckPage'
import {AccessPointModal} from './organisms/access_point_modal';

$(document).ready(function () {
    window.mapboxgl.accessToken = 'pk.eyJ1IjoiZmJtYXBzIiwiYSI6ImNqOGFmamkxdTBmbzUyd28xY3lybnEwamIifQ.oabgbuGc81ENlOJoPhv4OQ';
    const networkID = window.networkID;
    const userRequestIdentity = window.userRequestIdentity;
    const radio_names = window.radio_names;
    const los_check = new LinkCheckPage(networkID, userRequestIdentity, radio_names);
    const ap_modal = new AccessPointModal('#accessPointModal');
});