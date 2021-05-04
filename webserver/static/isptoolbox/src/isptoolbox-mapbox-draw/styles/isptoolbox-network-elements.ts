import cpe_icon from './cpe-icon.svg';
import ap_icon from './ap-icon.svg';


export function load_custom_icons(map: mapboxgl.Map) {
    let img_cpe = new Image(20,20)
    img_cpe.onload = ()=>map.addImage('cpe-isptoolbox', img_cpe);
    img_cpe.src = cpe_icon;

    let img_ap = new Image(20,20)
    img_ap.onload = ()=>map.addImage('ap-isptoolbox', img_ap);
    img_ap.src = ap_icon;
}
