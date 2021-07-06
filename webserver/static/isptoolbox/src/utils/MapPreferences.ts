import * as mapboxgl from "mapbox-gl";
import { getCookie } from "./Cookie";
var _ = require('lodash');


export function setCenterZoomPreferences(map: mapboxgl.Map) {
    const requestChangeMapPreferences = () => {
        const center = map.getCenter();
        const zoom = map.getZoom();
        // @ts-ignore
        const session_id = window.ISPTOOLBOX_SESSION_INFO.networkID;
        if(session_id !== undefined){
            $.ajax({
                url: `/pro/workspace/api/session/${session_id}/`,
                data: { center: `SRID=4326;POINT (${center.lng} ${center.lat})`, zoom: zoom },
                method: "PATCH",
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                }
            });
        }
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

export function getSessionID(): null | string{
    //@ts-ignore
    if(window.ISPTOOLBOX_SESSION_INFO !== undefined && window.ISPTOOLBOX_SESSION_INFO.networkID  !== undefined ){
        //@ts-ignore
        return window.ISPTOOLBOX_SESSION_INFO.networkID
    }
    return null;
}