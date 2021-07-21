// Create new mapbox Map
import * as MapboxGL from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import MarketEvaluatorWS from "./MarketEvaluatorWS";
import { MarketEvaluatorSidebarManager } from './organisms/MarketEvaluatorSidebarManager';
import MarketEvaluatorOverlayManager from "./MarketEvaluatorOverlayManager";

import { OverrideDirect, OverrideSimple, APDrawMode, OverrideDrawPolygon } from './isptoolbox-mapbox-draw/index';
import { ISPToolboxAbstractAppPage } from "./ISPToolboxAbstractAppPage";
import { MarketEvaluatorWorkspaceManager } from "./workspace/MarketEvaluatorWorkspaceManager";
import { MarketEvaluatorTowerPopup } from "./isptoolbox-mapbox-draw/popups/TowerPopups";
import { MarketEvaluatorRadiusAndBuildingCoverageRenderer } from "./organisms/APCoverageRenderer";


export class MarketEvaluatorPage extends ISPToolboxAbstractAppPage {
    map: MapboxGL.Map;
    draw: MapboxDraw;
    marketEvalWS: MarketEvaluatorWS;
    overlayManager: MarketEvaluatorOverlayManager;

    constructor() {
        super({
            simple_select: OverrideSimple(),
            direct_select: OverrideDirect(),
            draw_ap: APDrawMode(),
            draw_polygon: OverrideDrawPolygon()
        });

        new MarketEvaluatorWS([]);
        MarketEvaluatorSidebarManager.getInstance().initializePopovers();
    }

    onMapLoad() {
        // stuff might go here later
        new MarketEvaluatorOverlayManager(this.map, this.draw);
        new MarketEvaluatorWorkspaceManager(this.map, this.draw);

        // Tooltips
        new MarketEvaluatorTowerPopup(this.map, this.draw);

        new MarketEvaluatorRadiusAndBuildingCoverageRenderer(this.map, this.draw);
    }
}