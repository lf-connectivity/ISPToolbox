import * as mapboxgl from 'mapbox-gl';
import { getCookie } from './Cookie';
var _ = require('lodash');

export function setCenterZoomPreferences(map: mapboxgl.Map) {
    const requestChangeMapPreferences = () => {
        const center = map.getCenter();
        const zoom = map.getZoom();
        // @ts-ignore
        const session_id = window.ISPTOOLBOX_SESSION_INFO.networkID;
        if (session_id !== undefined) {
            console.log(`Center: (${center.lng}, ${center.lat})\tZoom: ${zoom}`);
            $.ajax({
                url: `/pro/workspace/api/session/${session_id}/`,
                data: { center: `SRID=4326;POINT (${center.lng} ${center.lat})`, zoom: zoom },
                method: 'PATCH',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                }
            });
        }
    };
    map.on('moveend', _.debounce(requestChangeMapPreferences, 1000));
    map.on('click', (e) => {
        console.log(`Clicked on ${e.lngLat.lng}, ${e.lngLat.lat}`);
    });
}

export function isUnitsUS() {
    if (
        // @ts-ignore
        window.ISPTOOLBOX_SESSION_INFO !== undefined &&
        // @ts-ignore
        window.ISPTOOLBOX_SESSION_INFO.units === 'US'
    ) {
        return true;
    }
    return false;
}

export function getSessionID(): null | string {
    if (
        //@ts-ignore
        window.ISPTOOLBOX_SESSION_INFO !== undefined &&
        //@ts-ignore
        window.ISPTOOLBOX_SESSION_INFO.networkID !== undefined
    ) {
        //@ts-ignore
        return window.ISPTOOLBOX_SESSION_INFO.networkID;
    }
    return null;
}

export function getInitialLockDragging(): boolean {
    if (
        // @ts-ignore
        window.ISPTOOLBOX_SESSION_INFO !== undefined &&
        // @ts-ignore
        window.ISPTOOLBOX_SESSION_INFO.networkID !== undefined
    ) {
        //@ts-ignore
        return window.ISPTOOLBOX_SESSION_INFO.lockDragging;
    }
    return false;
}
