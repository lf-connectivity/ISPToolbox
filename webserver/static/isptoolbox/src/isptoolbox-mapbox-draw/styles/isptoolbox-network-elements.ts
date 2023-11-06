// (c) Meta Platforms, Inc. and affiliates. Copyright
import cpe_icon from './cpe-icon.svg';
import cpe_active_icon from './cpe-active-icon.svg';
import ap_icon from './ap-icon.svg';

export function load_custom_icons(map: mapboxgl.Map) {
    let img_cpe_inactive = new Image(50, 50);
    img_cpe_inactive.crossOrigin = 'Anonymous';
    img_cpe_inactive.onload = () => map.addImage('cpe-inactive-isptoolbox', img_cpe_inactive);
    img_cpe_inactive.src = cpe_icon;

    let img_cpe_active = new Image(50, 50);
    img_cpe_active.crossOrigin = 'Anonymous';
    img_cpe_active.onload = () => map.addImage('cpe-active-isptoolbox', img_cpe_active);
    img_cpe_active.src = cpe_active_icon;

    let img_ap_inactive = new Image(50, 37);
    img_ap_inactive.crossOrigin = 'Anonymous';
    img_ap_inactive.onload = () => map.addImage('ap-inactive-isptoolbox', img_ap_inactive);
    img_ap_inactive.src = ap_icon;

    let img_ap_active = new Image(50, 37);
    img_ap_active.crossOrigin = 'Anonymous';
    img_ap_active.onload = () => map.addImage('ap-active-isptoolbox', img_ap_active);
    img_ap_active.src = ap_icon;
}
