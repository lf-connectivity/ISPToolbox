import {renderLinkEnds} from './LinkDrawMode.js';
import {createSupplementaryPointsForCircle} from './RadiusModeUtils.js';

export function OverrideDirect(){
    const direct_select = MapboxDraw.modes.direct_select;
    const old_toDisplayFeatures = MapboxDraw.modes.direct_select.toDisplayFeatures;
    direct_select.toDisplayFeatures = function(state, geojson, push) {
        renderLinkEnds(geojson, push);
        console.log(geojson);
        if(geojson.properties.user_radius !== undefined){
            push(geojson);
            console.log(geojson);
            const supplementary_points = createSupplementaryPointsForCircle(geojson);
            supplementary_points.forEach((pt) => {
                push(pt);
            })
        } else {
            old_toDisplayFeatures.apply(this, [state, geojson, push]);
        }
    };
}