import { renderLinkEnds } from './LinkDrawMode.js';
import {
    createSupplementaryPointsForCircle,
    createSupplementaryPointsForGeojson,
    isUneditable
} from './DrawModeUtils.js';
import moveFeatures from '@mapbox/mapbox-gl-draw/src/lib/move_features';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { WorkspaceFeatureTypes } from '../workspace/WorkspaceConstants';
import * as _ from 'lodash';

export function OverrideSimple(highlightAssociatedSectors = false) {
    const simple_select = MapboxDraw.modes.simple_select;
    simple_select.toDisplayFeatures = function (state, geojson, display) {
        geojson.properties.active = this.isSelected(geojson.properties.id) ? 'true' : 'false';
        display(geojson);

        renderLinkEnds(geojson, display);

        // Highlight associated sectors that aren't selected, if the flag is on
        if (highlightAssociatedSectors) {
            const highlightSector = function (sources, id, active) {
                let hotIds = sources.hot.map((f) => f.properties.id);
                let coldIds = sources.cold.map((f) => f.properties.id);

                let hotIdIndex = hotIds.indexOf(id);
                if (hotIds.indexOf(id) !== -1) {
                    sources.hot[hotIdIndex].properties.active = active;
                }

                let coldIdIndex = coldIds.indexOf(id);
                if (coldIds.indexOf(id) !== -1) {
                    sources.cold[coldIdIndex].properties.active = active;
                }
            };

            let selectedIds = new Set(this.getSelectedIds());

            // Situation 1: selected/deselected tower
            if (
                geojson.properties.user_sectors &&
                geojson.properties.user_feature_type === WorkspaceFeatureTypes.AP
            ) {
                geojson.properties.user_sectors.forEach((id) => {
                    highlightSector(this._ctx.store.sources, id, geojson.properties.active);
                });
            }

            // Situation 2: added sector
            else if (
                geojson.properties.user_feature_type === WorkspaceFeatureTypes.SECTOR &&
                geojson.properties.user_apMapboxId
            ) {
                if (selectedIds.has(geojson.properties.user_apMapboxId)) {
                    highlightSector(this._ctx.store.sources, geojson.properties.id, 'true');
                }
            }
        }

        this.fireActionable();

        // Turn off tap drag zoom if there are any elements selected
        if (this.getSelectedIds().length > 0) {
            // Horrible hack; no documented way of doing this :)
            this.map.handlers._handlersById.tapDragZoom.disable();
        }
        // Re-enable if nothing is selected
        else {
            this.map.handlers._handlersById.tapDragZoom.enable();
        }

        if (geojson.properties.active !== 'true' || geojson.geometry.type === 'Point') {
            return;
        }

        const supplementaryPoints = createSupplementaryPointsForGeojson(geojson, {
            uneditable: isUneditable(this.getFeature(geojson.properties.id))
        });
        supplementaryPoints.forEach(display);
    };

    // Support long pressing to drag tooltipped items.
    simple_select.onMouseDown = function (state, e) {
        if (!state.dragMoving && e.longPress) {
            e.featureTarget.properties.active == 'true';
            return this.startOnActiveFeature(state, e);
        }
        if (isActiveFeature(e)) return this.startOnActiveFeature(state, e);
        if (this.drawConfig.boxSelect && isShiftMousedown(e)) return this.startBoxSelect(state, e);
    };

    simple_select.dragMove = function (state, e) {
        // Don't drag if lockDragging is on
        if (this._ctx.options.lockDragging) {
            return;
        }

        // only move those that are editable.
        const editableFeatures = this.getSelected().filter((feature) => !isUneditable(feature));
        this.getSelected().forEach((feature) => this.doRender(feature.id));

        // Only move features if we're moused over an editable feature. Sometimes the moused over feature is
        // flaky because we're mousing over a point.
        state.mousedOverFeature = this.featuresAt(e).filter((feat) =>
            this.isSelected(feat.properties.id)
        ).length
            ? this.featuresAt(e).filter((feat) => this.isSelected(feat.properties.id))
            : state.mousedOverFeature || [];

        if (state.mousedOverFeature.some((feat) => feat.properties.user_uneditable === false)) {
            // Dragging when drag move is enabled
            // $FlowFixMe[prop-missing]
            state.dragMoving = true;
            e.originalEvent.stopPropagation();

            const delta = {
                // $FlowFixMe[prop-missing]
                lng: e.lngLat.lng - state.dragMoveLocation.lng,
                // $FlowFixMe[prop-missing]
                lat: e.lngLat.lat - state.dragMoveLocation.lat
            };

            moveFeatures(editableFeatures, delta);

            editableFeatures
                .filter((feature) => feature.properties.radius)
                .map((circle) => circle.properties.center)
                .forEach((center) => {
                    center[0] += delta.lng;
                    center[1] += delta.lat;
                });
            // $FlowFixMe[prop-missing]
            state.dragMoveLocation = e.lngLat;
        }
    };

    return simple_select;
}

function isShiftMousedown(e) {
    if (!e.originalEvent) return false;
    if (!e.originalEvent.shiftKey) return false;
    return e.originalEvent.button === 0;
}

function isActiveFeature(e) {
    if (!e.featureTarget) return false;
    if (!e.featureTarget.properties) return false;
    return (
        e.featureTarget.properties.active === 'true' &&
        e.featureTarget.properties.meta === 'feature'
    );
}
