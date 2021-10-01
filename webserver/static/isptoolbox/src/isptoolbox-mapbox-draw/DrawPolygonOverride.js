import { getMessagePolygon, addDrawingInstructions } from "./styles/drawing_instructions";
import MapboxDraw from "@mapbox/mapbox-gl-draw";

function _OverrideDrawPolygon() {
    const draw_polygon = MapboxDraw.modes.draw_polygon;

    /**
     * This function adds helpful contextual instructions to guide user through drawing a polygon
     */
    function addDrawInstructions(state, geojson, display) {
        try {
            const msg = getMessage(state);
            if (
                geojson.geometry.coordinates &&
                geojson.geometry.coordinates.length &&
                state.polygon != null &&
                state.polygon.id != null
            ) {
                const center =
                    // $FlowFixMe
                    geojson.geometry.coordinates[0][state.currentVertexPosition];
                if (center) {
                    const point = {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: center,
                        },
                        properties: {
                            active: Constants.activeStates.ACTIVE,
                            parent: state.polygon.id,
                            draw_guide: msg,
                        },
                    };
                    display(point);
                }
            }
        } catch {
            const _a = 1 + 1; // lol
        }
    }

    function getMessage(state) {
        if (typeof state.currentVertexPosition === 'number') {
            if (state.currentVertexPosition === 0) {
                return 'Click to start drawing';
            } else if (state.currentVertexPosition < 3) {
                return 'Click to continue drawing';
            } else {
                return 'Click on a visible point to close shape';
            }
        } else {
            return '';
        }
    }

    const original_to_display_features = draw_polygon.toDisplayFeatures.bind(
        null
    );

    draw_polygon.toDisplayFeatures = function (state, geojson, display) {
        original_to_display_features(state, geojson, display);
        addDrawInstructions(state, geojson, display);
    };

    return draw_polygon;
}

export function OverrideDrawPolygon() {
    return addDrawingInstructions(_OverrideDrawPolygon(), getMessagePolygon);
}