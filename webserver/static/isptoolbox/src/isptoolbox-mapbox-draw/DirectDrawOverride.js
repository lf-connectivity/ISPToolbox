import { renderLinkEnds } from './LinkDrawMode.js';
import { createSupplementaryPointsForCircle, createGeoJSONCircle, lineDistance } from './RadiusModeUtils.js';
import * as Constants from '@mapbox/mapbox-gl-draw/src/constants';
import moveFeatures from '@mapbox/mapbox-gl-draw/src/lib/move_features';
import constrainFeatureMovement from '@mapbox/mapbox-gl-draw/src/lib/constrain_feature_movement';
import createSupplementaryPoints from '@mapbox/mapbox-gl-draw/src/lib/create_supplementary_points';
import createVertex from '@mapbox/mapbox-gl-draw/src/lib/create_vertex';


/**
 * Mapbox Draw Doesn't natively support drawing circles or plotting two point line strings
 * 
 * By overwritting some of the draw methods we can get the behavior we need
 */
export function OverrideDirect() {
    const direct_select = MapboxDraw.modes.direct_select;
    direct_select.toDisplayFeatures = function (state, geojson, push) {
        if (state.featureId === geojson.properties.id) {
            geojson.properties.active = Constants.activeStates.ACTIVE;
            renderLinkEnds(geojson, push);
            push(geojson);
            const supplementaryPoints = geojson.properties.user_radius ? createSupplementaryPointsForCircle(geojson)
              : createSupplementaryPoints(geojson, {
                map: this.map,
                midpoints: true,
                selectedPaths: state.selectedCoordPaths
              });
            // Add a center point to geojson circle
            if(geojson.properties.user_radius){
                const center_vertex = createVertex(geojson.properties.id, geojson.properties.user_center, "0.4", false);
                push(center_vertex);
            }
            supplementaryPoints.forEach(push);
        } else {
            geojson.properties.active = Constants.activeStates.INACTIVE;
            push(geojson);
        }
        this.fireActionable(state);
    };
    direct_select.dragVertex = function (state, e, delta) {
        if (
            state.feature.properties.radius
        ) {
            if(state.selectedCoordPaths.includes("0.4")){
                moveFeatures(this.getSelected(), delta);
                this.getSelected()
                    .filter(feature => feature.properties.radius)
                    .map(circle => circle.properties.center)
                    .forEach(center => {
                        center[0] += delta.lng;
                        center[1] += delta.lat;
                    });

                state.dragMoveLocation = e.lngLat;
            } else {
                let center = state.feature.properties.center;
                let movedVertex = [e.lngLat.lng, e.lngLat.lat];
                let radius = lineDistance(center, movedVertex, 'K');
                let circleFeature = createGeoJSONCircle(center, radius, '0');
                state.feature.incomingCoords(circleFeature.geometry.coordinates);
                state.feature.properties.radius = radius;
            }
        } else {
            const selectedCoords = state.selectedCoordPaths.map(coord_path =>
                state.feature.getCoordinate(coord_path),
            );
            const selectedCoordPoints = selectedCoords.map(coords => ({
                type: Constants.geojsonTypes.FEATURE,
                properties: {},
                geometry: {
                    type: Constants.geojsonTypes.POINT,
                    coordinates: coords,
                },
            }));

            const constrainedDelta = constrainFeatureMovement(
                selectedCoordPoints,
                delta,
            );
            for (let i = 0; i < selectedCoords.length; i++) {
                const coord = selectedCoords[i];

                state.feature.updateCoordinate(

                    state.selectedCoordPaths[i],
                    coord[0] + constrainedDelta.lng,
                    coord[1] + constrainedDelta.lat,
                );
            }
        }
    };
    direct_select.dragFeature = function (state, e, delta) {
        moveFeatures(this.getSelected(), delta);
        this.getSelected()
            .filter(feature => feature.properties.radius)
            .map(circle => circle.properties.center)
            .forEach(center => {
                center[0] += delta.lng;
                center[1] += delta.lat;
            });

        state.dragMoveLocation = e.lngLat;
    };
    return direct_select;
}
