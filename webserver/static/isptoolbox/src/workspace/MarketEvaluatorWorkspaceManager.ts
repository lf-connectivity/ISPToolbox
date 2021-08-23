import mapboxgl, * as MapboxGL from 'mapbox-gl';
import { MarketEvaluatorTowerPopup } from '../isptoolbox-mapbox-draw/popups/TowerPopups';
import MarketEvaluatorWS, {
    MarketEvalWSEvents,
    MarketEvalWSRequestType,
    ViewshedGeojsonResponse
} from '../MarketEvaluatorWS';
import { BaseWorkspaceFeature } from './BaseWorkspaceFeature';
import {
    BaseWorkspaceManager,
    DEFAULT_AP_HEIGHT,
    DEFAULT_AP_NAME,
    DEFAULT_CPE_HEIGHT,
    DEFAULT_NO_CHECK_RADIUS
} from './BaseWorkspaceManager';
import { WorkspaceEvents, WorkspaceFeatureTypes } from './WorkspaceConstants';
import { AccessPoint, CoverageArea } from './WorkspaceFeatures';

const SUPPORTED_FEATURE_TYPES = [WorkspaceFeatureTypes.COVERAGE_AREA, WorkspaceFeatureTypes.AP];

export class MarketEvaluatorWorkspaceManager extends BaseWorkspaceManager {
    map: MapboxGL.Map;
    draw: MapboxDraw;

    constructor(map: MapboxGL.Map, draw: MapboxDraw) {
        super(map, draw, SUPPORTED_FEATURE_TYPES);
        PubSub.subscribe(MarketEvalWSEvents.CLOUDRF_VIEWSHED_MSG, this.onViewshedMsg.bind(this));
        BaseWorkspaceManager._instance = this;
    }

    initSaveFeatureHandlers() {
        const saveCoverageArea = (feature: any) => {
            let polygon = new CoverageArea(this.map, this.draw, feature);
            this.saveWorkspaceFeature(polygon);
        };

        this.saveFeatureDrawModeHandlers.draw_polygon = saveCoverageArea;

        this.saveFeatureDrawModeHandlers.draw_ap = (feature: any) => {
            if (feature.geometry.type == 'Point') {
                const newCircle = {
                    ...feature,
                    properties: {
                        radius: feature.properties.radius / 1000,
                        max_radius: feature.properties.radius / 1000,
                        center: feature.geometry.coordinates,
                        height: DEFAULT_AP_HEIGHT,
                        default_cpe_height: DEFAULT_CPE_HEIGHT,
                        no_check_radius: DEFAULT_NO_CHECK_RADIUS,
                        name: DEFAULT_AP_NAME
                    },
                    id: feature.id
                };
                let ap = new AccessPoint(this.map, this.draw, newCircle);
                this.saveWorkspaceFeature(ap, (resp) => {
                    const apPopup = MarketEvaluatorTowerPopup.getInstance();
                    apPopup.setAccessPoint(ap);
                    apPopup.show();
                });
            }
        };

        this.saveFeatureDrawModeHandlers.simple_select = saveCoverageArea;
    }

    initUpdateFeatureHandlers() {
        this.updateFeatureAjaxHandlers[WorkspaceFeatureTypes.AP].pre_update = (
            feat: BaseWorkspaceFeature
        ) => {
            let ws = MarketEvaluatorWS.getInstance();

            // Cancel Tower Viewshed request if request matches AP.
            if (
                ws.getCurrentRequest(MarketEvalWSRequestType.VIEWSHED).apUuid === feat.workspaceId
            ) {
                ws.cancelCurrentRequest(MarketEvalWSRequestType.VIEWSHED);
            }
        };
        this.updateFeatureAjaxHandlers[WorkspaceFeatureTypes.AP].post_update = (
            feat: BaseWorkspaceFeature
        ) => {
            let ap = feat as AccessPoint;
            MarketEvaluatorTowerPopup.getInstance().onAPUpdate(ap);
        };
    }

    initDeleteFeatureHandlers() {
        this.deleteFeaturePreAjaxHandlers[WorkspaceFeatureTypes.AP] = (
            feat: BaseWorkspaceFeature
        ) => {
            let popup = MarketEvaluatorTowerPopup.getInstance();
            let ap = feat as AccessPoint;
            let ws = MarketEvaluatorWS.getInstance();

            // Get rid of tower tooltip if the APs match
            if (popup.getAccessPoint() === ap) {
                popup.hide();
            }

            // Cancel Tower Viewshed request if request matches AP.
            if (ws.getCurrentRequest(MarketEvalWSRequestType.VIEWSHED).apUuid === ap.workspaceId) {
                ws.cancelCurrentRequest(MarketEvalWSRequestType.VIEWSHED);
            }
        };
    }

    onViewshedMsg(msg: string, response: ViewshedGeojsonResponse) {
        let ap = this.features[response.ap_uuid] as AccessPoint;
        if (ap) {
            ap.setFeatureProperty('cloudrf_coverage_geojson_json', response.coverage);
            PubSub.publish(WorkspaceEvents.AP_UPDATE, { features: [ap.getFeatureData()] });
        }
    }
}
