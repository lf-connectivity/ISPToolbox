// Create new mapbox Map
import * as MapboxGL from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import MarketEvaluatorWS from "./MarketEvaluatorWS";
//@ts-ignore
import styles from "@mapbox/mapbox-gl-draw/src/lib/theme";

import { OverrideDirect, OverrideSimple, APDrawMode, OverrideDrawPolygon } from './isptoolbox-mapbox-draw/index';
import { ISPToolboxAbstractAppPage } from "./ISPToolboxAbstractAppPage";
import { MarketEvaluatorWorkspaceManager } from "./workspace/MarketEvaluatorWorkspaceManager";
import { MarketEvaluatorTowerPopup } from "./isptoolbox-mapbox-draw/popups/TowerPopups";

export class MarketEvaluatorPage extends ISPToolboxAbstractAppPage {
    map: MapboxGL.Map;
    draw: MapboxDraw;
    marketEvalWS: MarketEvaluatorWS;

    constructor() {
        super({
            simple_select: OverrideSimple(),
            direct_select: OverrideDirect(),
            draw_ap: APDrawMode(),
            draw_polygon: OverrideDrawPolygon()
        });

        this.marketEvalWS = new MarketEvaluatorWS([]);
        MarketEvaluatorSidebarManager.getInstance().initializePopovers();
    }

    onMapLoad() {
        // stuff might go here later
        new MarketEvaluatorWorkspaceManager(this.map, this.draw);

        // Tooltips
        new MarketEvaluatorTowerPopup(this.map, this.draw);
    }
}