import * as mapboxgl from "mapbox-gl";
import { getCookie } from "./Cookie";
var _ = require('lodash');


export function setCenterZoomPreferences(map: mapboxgl.Map) {
    const requestChangeMapPreferences = () => {
        const center = map.getCenter();
        const zoom = map.getZoom();
        $.ajax({
            url: `/pro/workspace/api/network/${(window as any).ISPTOOLBOX_SESSION_INFO.networkID as string}/`,
            data: { map_center: `SRID=4326;POINT (${center.lng} ${center.lat})`, zoom_level: zoom },
            method: "PATCH",
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
    }
    map.on('moveend', _.debounce(requestChangeMapPreferences, 1000));
}

export function isUnitsUS(){
    // @ts-ignore
    if(window.ISPTOOLBOX_SESSION_INFO !== undefined && window.ISPTOOLBOX_SESSION_INFO.units === 'US'){
        return true;
    }
    return false;
}