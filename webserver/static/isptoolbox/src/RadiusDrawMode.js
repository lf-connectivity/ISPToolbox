import {createGeoJSONCircle} from './RadiusModeUtils.js'
export function RadiusMode() {
    let mode = Object.assign({}, MapboxDraw.modes.draw_line_string);

    mode.minRadius = 0.0;
    mode.units = 'km';
    mode.clickAnywhere = function (state, e) {
        if (e.originalEvent.type.includes('touch')) {
            state.line.addCoordinate(
                state.currentVertexPosition,
                e.lngLat.lng, 
                e.lngLat.lat,
            );
        }
        // this ends the drawing after the user creates a second point, triggering this.onStop
        if (state.currentVertexPosition === 1) {
            state.line.addCoordinate(0, e.lngLat.lng, e.lngLat.lat);
            return this.changeMode('simple_select', { featureIds: [state.line.id] });
        }
        this.updateUIClasses({ mouse: 'add' });
        state.line.updateCoordinate(
            state.currentVertexPosition,
            e.lngLat.lng,
            e.lngLat.lat,
        );
        if (state.direction === 'forward') {
            state.currentVertexPosition += 1;
            state.line.updateCoordinate(
                state.currentVertexPosition,
                e.lngLat.lng,
                e.lngLat.lat,
            );
        } else {
            state.line.addCoordinate(0, e.lngLat.lng, e.lngLat.lat);
        }
        return;
    };
    mode.toDisplayFeatures = function (state, geojson, display) {
        addDrawInstructions(state, geojson, display);
    
        const isActiveLine = geojson.properties.id === state.line.id;
        geojson.properties.active = isActiveLine ? 'true' : 'false';
        if (!isActiveLine) {
            return display(geojson);
        }
    
        // Only render the line if it has at least one real coordinate
        if (geojson.geometry.coordinates.length < 2) {
            return;
        }
        geojson.properties.meta = 'feature';
    
        // displays center vertex as a point feature
        display(
            createVertex(
                state.line.id,
                geojson.geometry.coordinates[
                state.direction === 'forward'
                    ? geojson.geometry.coordinates.length - 2
                    : 1
                ],
                `${state.direction === 'forward'
                    ? geojson.geometry.coordinates.length - 2
                    : 1
                }`,
                false,
            ),
        );
    
        // displays the line as it is drawn
        display(geojson);
        const displayMeasurements = getDisplayMeasurements(geojson, mode.minRadius, mode.units);
    
        // create custom feature for the current pointer position
        const currentVertex = {
            type: 'Feature',
            properties: {
                meta: 'currentPosition',
                parent: state.line.id,
                radiusKm: displayMeasurements.km,
            },
            geometry: {
                type: 'Point',
                coordinates: geojson.geometry.coordinates[1],
            },
        };
        display(currentVertex);
    
        // create custom feature for radius circlemarker
        const center = geojson.geometry.coordinates[0];
    
        const radiusInKm = Math.max(lineDistance(geojson, 'K'), mode.minRadius);
        const circleFeature = createGeoJSONCircle(center, radiusInKm, state.line.id);
        circleFeature.properties.meta = 'radius';
        display(circleFeature);
        return;
    };
    // creates the final geojson point feature with a radius property
    // triggers draw.create
    mode.onStop = function (state) {
        doubleClickZoom.enable(this);
    
        this.activateUIButton();
    
        // check to see if we've deleted this feature
        if (state.line && this.getFeature(state.line.id) === undefined) {
            return;
        }
    
        // remove last added coordinate
        state.line.removeCoordinate('0');
        if (state.line.isValid()) {
            const lineGeoJson = state.line.toGeoJSON();
            // reconfigure the geojson line into a geojson point with a radius property
            const pointWithRadius = {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: lineGeoJson.geometry.coordinates[0],
                },
                properties: {
                    radius: lineDistance(lineGeoJson) * 1000,
                    isCircle: true,
                },
                id: state.line.id,
            };
    
            this.map.fire('draw.create', {
                features: [pointWithRadius],
            });
        } else {
            this.deleteFeature([state.line.id], { silent: true });
    
            this.changeMode('simple_select', {}, { silent: true });
        }
    };
    return mode;
}

/**
 * This helper function adds helpful contextual instructutions to guide user through drawing a circle
 */
function addDrawInstructions(state, geojson, display) {
    try {
        const msg = getInstructionMessage(state);
        if (
            geojson.geometry.coordinates.length &&
            state.line != null &&
            state.line.id != null
        ) {
            const point = {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: geojson.geometry.coordinates[0],
                },
                properties: {
                    active: Constants.activeStates.ACTIVE,
                    parent: state.line.id,
                    draw_guide: msg,
                },
            };
            display(point);
        }
    } catch {}
}

function getInstructionMessage(state) {
    if (typeof state.currentVertexPosition === 'number') {
        if (state.currentVertexPosition === 0) {
            return 'Click to place center of circle';
        } else {
            return 'Click to finish circle';
        }
    } else {
        return '';
    }
}



export function lineDistance(lineFeature, unit = 'K') {
    const lat1 = lineFeature.geometry.coordinates[0][1];
    const lat2 = lineFeature.geometry.coordinates[1][1];
    const lon1 = lineFeature.geometry.coordinates[0][0];
    const lon2 = lineFeature.geometry.coordinates[1][0];

    if (lat1 == lat2 && lon1 == lon2) {
        return 0;
    } else {
        var radlat1 = (Math.PI * lat1) / 180;
        var radlat2 = (Math.PI * lat2) / 180;
        var theta = lon1 - lon2;
        var radtheta = (Math.PI * theta) / 180;
        var dist =
            Math.sin(radlat1) * Math.sin(radlat2) +
            Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        if (dist > 1) {
            dist = 1;
        }
        dist = Math.acos(dist);
        dist = (dist * 180) / Math.PI;
        dist = dist * 60 * 1.1515;
        if (unit == 'K') {
            dist = dist * 1.609344;
        }
        if (unit == 'N') {
            dist = dist * 0.8684;
        }
        return dist;
    }
}

function createVertex(parentId, coordinates, path, selected) {
    return {
        type: 'Feature',
        properties: {
            meta: 'vertex',
            parent: parentId,
            coord_path: path,
            active: selected ? 'true' : 'false',
        },
        geometry: {
            type: 'Point',
            coordinates,
        },
    };
}


function getDisplayMeasurements(
    lineFeature,
    minRadius,
    units = 'km',
) {
    // create metric and standard display strings for the line
    // NOTE: CUSTOM MINIMUM DISTANCE FOR WISP TARGETING APPLICATION - IF YOU NEED
    // A SMALLER MINIMUM SIZE PLEASE DUPLICATE THIS FILE AND REPLACE THE LINE
    // BELOW
    const drawnLength = Math.max(
        lineDistance(lineFeature, units === 'km' ? 'K' : 'MI'),
        minRadius * (units === 'km' ? 1.0 : 1.0 / 1.609344),
    ); // km

    return {
        km: `${drawnLength.toFixed(1)} ${units}`,
    };
}

const doubleClickZoom = {
    enable: ctx => {
        setTimeout(() => {
            // First check we've got a map and some context.
            if (
                !ctx.map ||
                !ctx.map.doubleClickZoom ||
                !ctx._ctx ||
                !ctx._ctx.store ||
                !ctx._ctx.store.getInitialConfigValue
            ) {
                return;
            }
            // Now check initial state wasn't false (we leave it disabled if so)
            if (!ctx._ctx.store.getInitialConfigValue('doubleClickZoom')) {
                return;
            }
            ctx.map.doubleClickZoom.enable();
        }, 0);
    },
};
