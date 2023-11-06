// (c) Meta Platforms, Inc. and affiliates. Copyright
// modify mapbox draw mode to render instructions to help user accomplish their task
export function addDrawingInstructions(drawing_mode: any, getMessage: (state: any) => string) {
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
