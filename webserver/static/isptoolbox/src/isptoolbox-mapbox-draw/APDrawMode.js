export const DEFAULT_RADIUS = 322;
export function APDrawMode() {
    let mode = Object.assign({}, MapboxDraw.modes.draw_point);

    mode.onSetup = function(opts) {
        const point = this.newFeature({
            type: 'Feature',
            properties: {
                radius: DEFAULT_RADIUS
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

    mode.onClick = function(state, e) {
        state.point.coordinates = [e.lngLat.lng, e.lngLat.lat];
        this.map.fire('draw.create', {
            features: [state.point.toGeoJSON()],
        });
        this.changeMode('simple_select', {featureIds: [state.point.id]});
        $('#draw-coverage-area-btn').removeClass('btn-secondary').addClass('btn-primary');
    }

    mode.toDisplayFeatures = function(state, geojson, display) {
        display(geojson);
    }
    return mode;
}
