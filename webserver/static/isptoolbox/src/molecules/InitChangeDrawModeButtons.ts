import MapboxDraw from "@mapbox/mapbox-gl-draw";
import mapboxgl from "mapbox-gl";

function addEventHandler(map: mapboxgl.Map, draw: MapboxDraw, id: string, mode: string) {
    $(`#${id}`).click(
        () => {
            //@ts-ignore
            draw.changeMode(mode);
            map.fire('draw.modechange', {mode: mode});
        }
    );
}

export function initButtons(map: mapboxgl.Map, draw: MapboxDraw) {
    let addEventHandlerMapDraw = addEventHandler.bind(null, map, draw);

    addEventHandlerMapDraw('add-link-btn', 'draw_link');
    addEventHandlerMapDraw('add-ap-btn', 'draw_ap');
    addEventHandlerMapDraw('add-cpe-btn', 'draw_cpe');
    addEventHandlerMapDraw('draw-coverage-area-btn', 'draw_polygon');
}