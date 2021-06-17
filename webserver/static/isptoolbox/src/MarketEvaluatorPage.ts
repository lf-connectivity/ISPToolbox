// Create new mapbox Map
import * as MapboxGL from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { MarketEvaluatorSidebarManager } from './organisms/MarketEvaluatorSidebarManager';

import { LinkMode, OverrideDirect, OverrideSimple, APDrawMode, OverrideDrawPolygon } from './isptoolbox-mapbox-draw/index';
import { ISPToolboxAbstractAppPage } from "./ISPToolboxAbstractAppPage";

export class MarketEvaluatorPage extends ISPToolboxAbstractAppPage {
    map: MapboxGL.Map;
    draw: MapboxDraw;

    constructor() {
        super({
            draw_link: LinkMode(),
            simple_select: OverrideSimple(),
            direct_select: OverrideDirect(),
            draw_ap: APDrawMode(),
            draw_polygon: OverrideDrawPolygon()
        });

        MarketEvaluatorSidebarManager.getInstance().initializePopovers();
    }

    onMapLoad() {
        // stuff might go here later
    }
}