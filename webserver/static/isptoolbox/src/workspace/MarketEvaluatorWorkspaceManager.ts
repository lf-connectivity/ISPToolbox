import mapboxgl, * as MapboxGL from "mapbox-gl";
import { BaseWorkspaceFeature } from "./BaseWorkspaceFeature";
import { BaseWorkspaceManager } from "./BaseWorkspaceManager";
import { WorkspaceFeatureTypes } from "./WorkspaceConstants";
import { CoverageArea } from "./WorkspaceFeatures";

const SUPPORTED_FEATURE_TYPES = [WorkspaceFeatureTypes.COVERAGE_AREA];

export class MarketEvaluatorWorkspaceManager extends BaseWorkspaceManager {
    map: MapboxGL.Map;
    draw: MapboxDraw;
    private static _instance: MarketEvaluatorWorkspaceManager;

    constructor(map: MapboxGL.Map, draw: MapboxDraw) {
        super(map, draw, SUPPORTED_FEATURE_TYPES);
        if (!MarketEvaluatorWorkspaceManager._instance) {
            MarketEvaluatorWorkspaceManager._instance = this;
        }
    }

    initSaveFeatureHandlers() {
        this.saveFeatureDrawModeHandlers.draw_polygon = (feature: any) => {
            let polygon = new CoverageArea(this.map, this.draw, feature);
            this.saveWorkspaceFeature(polygon);
        }
    }

    initUpdateFeatureHandlers() {
        // stuff might go here later
    }

    initDeleteFeatureHandlers() {
        // stuff might go here later
    }

    static getInstance(): MarketEvaluatorWorkspaceManager {
        if (MarketEvaluatorWorkspaceManager._instance) {
            return MarketEvaluatorWorkspaceManager._instance;
        } 
        else {
            throw new Error('No Instance of MarketEvaluatorWorkspaceManager instantiated.');
        }
    }
}