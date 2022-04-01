import { LinkCheckPage } from '../LinkCheckPage';
import {BaseWorkspaceManager} from '../workspace/BaseWorkspaceManager';

$(() => {
    //@ts-ignore
    window.mapboxgl.accessToken = window.mapbox_access_token;
    //@ts-ignore
    const networkID = window.networkID;
    //@ts-ignore
    const userRequestIdentity = window.userRequestIdentity;
    new LinkCheckPage(networkID, userRequestIdentity);
});

export default {BaseWorkspaceManager};