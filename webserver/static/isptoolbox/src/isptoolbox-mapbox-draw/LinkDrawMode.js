export function LinkMode(){
    const link_mode = MapboxDraw.modes.draw_line_string;
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
    link_mode.toDisplayFeatures = function(state, geojson, display) {
        originalToDisplayFeatures(state, geojson, display);
        renderLinkEnds(geojson, display);
    };
    return link_mode;
};

export function renderLinkEnds(geojson, display){
    if(geojson.properties.radius === undefined){
        if(geojson.geometry.coordinates.length > 0) {
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
        if(geojson.geometry.coordinates.length > 1) {
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
