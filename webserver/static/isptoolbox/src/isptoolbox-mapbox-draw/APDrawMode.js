// (c) Meta Platforms, Inc. and affiliates. Copyright
import { getMessagePoint, addDrawingInstructions } from "./styles/drawing_instructions";
import MapboxDraw from "@mapbox/mapbox-gl-draw";

function _APDrawMode() {
    let mode = Object.assign({}, MapboxDraw.modes.draw_point);

    mode.onSetup = function (opts) {
        const point = this.newFeature({
            type: 'Feature',
            properties: {
            },
            geometry: {
                type: 'Point',
                coordinates: []
            }
        });
        this.addFeature(point);
        this.clearSelectedFeatures();
        this.updateUIClasses({ mouse: 'add' });
        this.activateUIButton('point');
        this.setActionableState({
            trash: true
        });
        return {
            point
        }
    }

    mode.onClick = function (state, e) {
        state.point.coordinates = [e.lngLat.lng, e.lngLat.lat];
        this.map.fire('draw.create', {
            features: [state.point.toGeoJSON()],
        });
        this.changeMode('simple_select', { featureIds: [state.point.id] });
    }

    mode.onMouseMove = function (state, e) {
        state.point.updateCoordinate(e.lngLat.lng, e.lngLat.lat);
    };

    mode.toDisplayFeatures = function (state, geojson, display) {
        // Never render the point we're drawing
        const isActivePoint = geojson.properties.id === state.point.id;
        geojson.properties.active = (isActivePoint) ? 'true' : 'false';
        if (!isActivePoint) return display(geojson);
    }

    return mode;
}

export function APDrawMode() {
    return addDrawingInstructions(_APDrawMode(), getMessagePoint);
}
