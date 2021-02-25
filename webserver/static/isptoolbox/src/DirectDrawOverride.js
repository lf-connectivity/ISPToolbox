import {renderLinkEnds} from './LinkDrawMode.js';

export function OverrideDirect(){
    const direct_select = MapboxDraw.modes.direct_select;
    const old_toDisplayFeatures = MapboxDraw.modes.direct_select.toDisplayFeatures;
    direct_select.toDisplayFeatures = function(state, geojson, push) {
        renderLinkEnds(geojson, push);
        old_toDisplayFeatures.apply(this, [state, geojson, push]);
    };
}