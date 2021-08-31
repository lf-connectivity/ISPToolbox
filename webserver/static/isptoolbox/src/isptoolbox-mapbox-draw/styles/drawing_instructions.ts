import MapboxDraw from '@mapbox/mapbox-gl-draw';

export const DRAWING_INSTRUCTIONS = {
    id: 'gl-draw-instructions',
    type: 'symbol',
    filter: ['all', ['==', '$type', 'Point'], ['has', 'draw_guide']],
    paint: {
        'text-halo-width': 1,
        'text-halo-color': 'rgba(0,0,0,1)',
        'text-color': 'rgba(194,216,236,1)'
    },
    layout: {
        'text-field': ['get', 'draw_guide'],
        'text-font': ['Arial Unicode MS Bold'],
        'text-justify': 'center',
        'text-offset': [0, 3],
        'text-size': 13,
        'text-letter-spacing': 0.03
    }
};

export function AddDrawingInstructions(drawing_mode: any, getMessage: (state: any) => string) {
    const addDrawInstructions = (state: any, geojson: any, display: any) => {
        try {
            const msg = getMessage(state);
            if (geojson.geometry.coordinates && geojson.geometry.coordinates.length) {
                let center = undefined;
                if (state.polygon !== undefined) {
                    center = geojson.geometry.coordinates[0][state.currentVertexPosition];
                } else if (state.line !== undefined) {
                    center = geojson.geometry.coordinates[state.currentVertexPosition];
                } else if (state.point !== undefined) {
                    center = geojson.geometry.coordinates;
                }
                if (center) {
                    let parent = undefined;
                    if (state.polygon !== undefined) {
                        parent = state.polygon.id;
                    } else if (state.line !== undefined) {
                        parent = state.line.id;
                    } else if (state.point !== undefined) {
                        parent = state.point.id;
                    }
                    if (parent) {
                        const point = {
                            type: 'Feature',
                            geometry: {
                                type: 'Point',
                                coordinates: center
                            },
                            properties: {
                                active: 'true',
                                parent,
                                draw_guide: msg
                            }
                        };
                        display(point);
                    }
                }
            }
        } catch (e) {}
    };
    const original_to_display_features = drawing_mode.toDisplayFeatures;
    drawing_mode.toDisplayFeatures = function (state: any, geojson: any, display: any) {
        original_to_display_features(state, geojson, display);
        addDrawInstructions(state, geojson, display);
    };

    return drawing_mode;
}

export function getMessagePolygon(state: any): string {
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

export function getMessageLink(state: any): string {
    if (typeof state.currentVertexPosition === 'number') {
        if (state.currentVertexPosition === 0) {
            return 'Click to start drawing';
        } else {
            return 'Click to close the line';
        }
    } else {
        return '';
    }
}

export function getMessageCircle(state: any): string {
    if (typeof state.currentVertexPosition === 'number') {
        if (state.currentVertexPosition === 0) {
            return 'Click to place center';
        } else {
            return 'Click to close circle';
        }
    } else {
        return '';
    }
}

export function getMessagePoint(state: any): string {
    return 'Click to place';
}
