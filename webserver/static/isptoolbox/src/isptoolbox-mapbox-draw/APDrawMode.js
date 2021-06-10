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
        })
        // If we already have a location for the AP, automatically create it there.
        if (opts.start) {
            point.coordinates = opts.start
            // Timeout used to ensure map is in APDrawMode before exiting to simple select.
            setTimeout(() => {
                console.log("creating new AP")
                this.map.fire('draw.create', {
                    features: [point.toGeoJSON()],
                });
                console.log("Changing mode back to simplle")
                this.changeMode('simple_select', {featureIds: [point.id]});
            }, 50);
        }
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
    }

    mode.toDisplayFeatures = function(state, geojson, display) {
        display(geojson);
    }
    return mode;
}
