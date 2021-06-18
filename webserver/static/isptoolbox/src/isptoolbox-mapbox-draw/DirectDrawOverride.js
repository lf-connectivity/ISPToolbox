import { renderLinkEnds } from './LinkDrawMode.js';
import { createSupplementaryPointsForGeojson, createSupplementaryPointsForCircle, createGeoJSONCircle, lineDistance } from './DrawModeUtils.js';
import * as Constants from '@mapbox/mapbox-gl-draw/src/constants';
import moveFeatures from '@mapbox/mapbox-gl-draw/src/lib/move_features';
import constrainFeatureMovement from '@mapbox/mapbox-gl-draw/src/lib/constrain_feature_movement';
import createSupplementaryPoints from '@mapbox/mapbox-gl-draw/src/lib/create_supplementary_points';
import createVertex from '@mapbox/mapbox-gl-draw/src/lib/create_vertex';
import { WorkspaceFeatureTypes } from '../workspace/WorkspaceConstants';

/**
 * Mapbox Draw Doesn't natively support drawing circles or plotting two point line strings
 * 
 * By overwritting some of the draw methods we can get the behavior we need
 */
function isShiftDown(e) {
    if (!e.originalEvent) return false;
    return e.originalEvent.shiftKey === true;
}

export function OverrideDirect(additionalFunctionality = {}) {
    const direct_select = MapboxDraw.modes.direct_select;
    direct_select.toDisplayFeatures = function (state, geojson, push) {
        if (state.featureId === geojson.properties.id) {
            geojson.properties.active = Constants.activeStates.ACTIVE;
            renderLinkEnds(geojson, push);
            push(geojson);
            let supplementaryPoints;
            if (geojson.properties.user_radius) {
                supplementaryPoints = createSupplementaryPointsForCircle(geojson);
            }
            else {
                // no rendering midpoints for lines but for polygons and other things yes
                supplementaryPoints = createSupplementaryPointsForGeojson(geojson, {
                    map: this.map,
                    midpoints: (geojson.geometry.type !== Constants.geojsonTypes.LINE_STRING),
                    selectedPaths: state.selectedCoordPaths
                });
            }

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

    direct_select.onVertex = function (state, e) {
        if (additionalFunctionality.onVertex) {
            additionalFunctionality.onVertex(state, e);
        }

        this.startDragging(state, e);
        const about = e.featureTarget.properties;
        const selectedIndex = state.selectedCoordPaths.indexOf(about.coord_path);
        if (!isShiftDown(e) && selectedIndex === -1) {
            state.selectedCoordPaths = [about.coord_path];
        } else if (isShiftDown(e) && selectedIndex === -1) {
            state.selectedCoordPaths.push(about.coord_path);
        }

        const selectedCoordinates = this.pathsToCoordinates(state.featureId, state.selectedCoordPaths);
        this.setSelectedCoordinates(selectedCoordinates);
    }

    direct_select.dragVertex = function (state, e, delta) {
        if (additionalFunctionality.dragVertex) {
            additionalFunctionality.dragVertex(state, e);
        }
        
        // Only allow editing of vertices that are not from associated AP/CPE links.
        // This would include user draw PtP links.
        if (
            ('feature_type' in state.feature.properties) &&
            state.feature.properties.feature_type === WorkspaceFeatureTypes.AP_CPE_LINK
        ) {
            // Clear vertices and go back to simple select mode
            this.clearSelectedFeatures();
            this.clearSelectedCoordinates();
            // $FlowFixMe
            this.doRender(state.feature.id);
            this.changeMode(Constants.modes.SIMPLE_SELECT);
            return;
          }

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
        // deselect uneditable features, and only move those that are editable.
        // Links are uneditable; users should move APs and CPEs instead.
        const selected = this.getSelected();
        const editableFeatures = this.getSelected().filter(
            feature => {
                return (!('feature_type' in feature.properties)) ||
                       (feature.properties.feature_type !== WorkspaceFeatureTypes.AP_CPE_LINK)
            }
        );
        this.clearSelectedFeatures();
        this.clearSelectedCoordinates();
        selected.forEach(feature => this.doRender(feature.id));

        if (editableFeatures.length > 0) {
            editableFeatures.forEach(feature => this.select(feature.id));
        } else {
            this.changeMode('simple_select');
        }

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


