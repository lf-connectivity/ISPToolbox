// (c) Meta Platforms, Inc. and affiliates. Copyright
import { DSMAdminPage } from '../DSMAdminPage';
// @ts-ignore
$(() => {
    //@ts-ignore
    window.mapboxgl.accessToken = window.mapbox_access_token;
    new DSMAdminPage();
});
