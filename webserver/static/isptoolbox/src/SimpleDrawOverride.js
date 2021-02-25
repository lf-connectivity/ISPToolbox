import {renderLinkEnds} from './LinkDrawMode.js';

export function OverrideSimple(){
    const simple_select = MapboxDraw.modes.simple_select;
    simple_select.toDisplayFeatures = function(state, geojson, display) {
        console.log({state, geojson, push});
        geojson.properties.active = this.isSelected(geojson.properties.id)
          ? 'true'
          : 'false';
        display(geojson);
        
        renderLinkEnds(geojson, display);

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

        if (
          geojson.properties.active !== 'active' ||
          geojson.geometry.type === 'Point'
        ) {
          return;
        }
    };
    return simple_select;
}