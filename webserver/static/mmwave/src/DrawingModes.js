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
    return link_mode;
};

export function OverrideSimple(){
    const simple_select = MapboxDraw.modes.simple_select;
    simple_select.toDisplayFeatures = function(state, geojson, display) {
        geojson.properties.active = this.isSelected(geojson.properties.id)
          ? 'true'
          : 'false';
        display(geojson);
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
