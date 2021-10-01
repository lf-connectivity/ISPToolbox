import { addDrawingInstructions, getMessageLink } from "./styles/drawing_instructions";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
function _LinkMode() {
    const link_mode = MapboxDraw.modes.draw_line_string;

    /*
    Shamelessly stolen from Draw Line String code on mapbox draw, but with simplified
    functionality for our purposes. Start indicates the start point, and user fills in
    second point.
    */
    link_mode.onSetup = function (opts) {
        opts = opts || {};
        const start = opts.start;

        let line, currentVertexPosition;
        let direction = 'forward';
        if (start) {
            if (!Array.isArray(start) || start.length < 2) {
                throw new Error('`start` must be an array of numbers of length at least 2.');
            }

            line = this.newFeature({
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: [start]
                }
            });
            currentVertexPosition = 1;
        } else {
            line = this.newFeature({
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: []
                }
            });
            currentVertexPosition = 0;
        }
        this.addFeature(line);

        this.clearSelectedFeatures();
        this.map.doubleClickZoom.disable();
        this.updateUIClasses({ mouse: 'add' });
        this.activateUIButton('line_string');
        this.setActionableState({
            trash: true
        });

        return {
            line,
            currentVertexPosition,
            direction
        };
    };


    link_mode.clickAnywhere = function (state, e) {
        if (e.originalEvent.type.includes('touch')) {
            state.line.updateCoordinate(
                state.currentVertexPosition,
                e.lngLat.lng,
                e.lngLat.lat,
            );
        }

        if (state.currentVertexPosition === 1) {
            state.line.addCoordinate(state.currentVertexPosition, e.lngLat.lng, e.lngLat.lat);
            return this.changeMode('simple_select', { featureIds: [state.line.id] });
        }
        this.updateUIClasses({ mouse: 'add' });
        state.line.updateCoordinate(state.currentVertexPosition, e.lngLat.lng, e.lngLat.lat);
        if (state.direction === 'forward') {
            state.currentVertexPosition++;
            state.line.updateCoordinate(state.currentVertexPosition, e.lngLat.lng, e.lngLat.lat);
        } else {
            state.line.addCoordinate(0, e.lngLat.lng, e.lngLat.lat);
        }
    };

    const originalToDisplayFeatures = link_mode.toDisplayFeatures;
    link_mode.toDisplayFeatures = function (state, geojson, display) {
        originalToDisplayFeatures(state, geojson, display);
        renderLinkEnds(geojson, display);
    };
    return link_mode;
};

export function renderLinkEnds(geojson, display) {
    if (geojson.properties.radius === undefined) {
        if (geojson.geometry.coordinates.length > 0) {
            const radio0 = {
                type: 'Feature',
                properties: {
                    meta: 'radio_point',
                    parent: geojson.properties.id,
                    name: 'radio_0',
                    color: '#E29842'
                },
                geometry: {
                    type: 'Point',
                    coordinates: geojson.geometry.coordinates[0],
                },
            };
            display(radio0);
        }
        if (geojson.geometry.coordinates.length > 1) {
            const radio1 = {
                type: 'Feature',
                properties: {
                    meta: 'radio_point',
                    parent: geojson.properties.id,
                    name: 'radio_1',
                    color: '#42B72A'
                },
                geometry: {
                    type: 'Point',
                    coordinates: geojson.geometry.coordinates[1],
                },
            };
            display(radio1);
        }
    }
}

export function LinkMode() {
    return addDrawingInstructions(_LinkMode(), getMessageLink);
}