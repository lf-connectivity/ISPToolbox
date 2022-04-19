import { MarketEvaluatorPage } from '../MarketEvaluatorPage';
import {BaseWorkspaceManager} from '../workspace/BaseWorkspaceManager';
import {djangoUrl} from '../utils/djangoUrl';

// @ts-ignore
$(() => {
    //@ts-ignore
    window.mapboxgl.accessToken = window.mapbox_access_token;
    new MarketEvaluatorPage();
});

export default {BaseWorkspaceManager, djangoUrl};