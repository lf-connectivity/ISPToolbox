export function LinkMode(){
    const link_mode = MapboxDraw.modes.draw_line_string;
    link_mode.clickAnywhere = function (state, e) {
        if (state.currentVertexPosition === 1) {
            state.line.addCoordinate(state.currentVertexPosition, e.lngLat.lng, e.lngLat.lat);
            return this.changeMode('simple_select', { featureIds: [state.line.id] });
        }
        this.updateUIClasses({ mouse: 'add' });
        state.line.updateCoordinate(state.currentVertexPosition, e.lngLat.lng, e.lngLat.lat);
        if (state.direction === 'forward') {
            state.currentVertexPosition += 1; // eslint-disable-line
            state.line.updateCoordinate(state.currentVertexPosition, e.lngLat.lng, e.lngLat.lat);
        } else {
            state.line.addCoordinate(0, e.lngLat.lng, e.lngLat.lat);
        }
        return null;
    };
    const originalToDisplayFeatures = link_mode.toDisplayFeatures;
    link_mode.toDisplayFeatures = function(state, geojson, display) {
        originalToDisplayFeatures(state, geojson, display);
        renderLinkEnds(geojson, display);
    };
    return link_mode;
};

function renderLinkEnds(geojson, display){
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

export function OverrideSimple(){
    const simple_select = MapboxDraw.modes.simple_select;
    simple_select.toDisplayFeatures = function(state, geojson, display) {
        geojson.properties.active = this.isSelected(geojson.properties.id)
          ? 'true'
          : 'false';
        display(geojson);
        
        renderLinkEnds(geojson, display);

        this.fireActionable();
      
        if (
          geojson.properties.active !== 'active' ||
          geojson.geometry.type === 'Point'
        ) {
          return;
        }
    };
    return simple_select;
}

export function OverrideDirect(){
    const direct_select = MapboxDraw.modes.direct_select;
    const old_toDisplayFeatures = MapboxDraw.modes.direct_select.toDisplayFeatures;
    direct_select.toDisplayFeatures = function(state, geojson, push) {
        renderLinkEnds(geojson, push);
        old_toDisplayFeatures.apply(this, [state, geojson, push]);
    };
}