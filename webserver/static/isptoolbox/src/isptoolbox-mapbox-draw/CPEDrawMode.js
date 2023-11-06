// (c) Meta Platforms, Inc. and affiliates. Copyright
import MapboxDraw from "@mapbox/mapbox-gl-draw";

export function CPEDrawMode() {
    let mode = Object.assign({}, MapboxDraw.modes.draw_point);
    return mode;
}
