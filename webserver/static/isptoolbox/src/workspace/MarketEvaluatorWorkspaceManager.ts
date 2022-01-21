import mapboxgl, * as MapboxGL from 'mapbox-gl';
import { MarketEvaluatorTowerPopup } from '../isptoolbox-mapbox-draw/popups/TowerPopups';
import MarketEvaluatorMapLayerSidebarManager from '../MarketEvaluatorMapLayerSidebarManager';
import MarketEvaluatorWS, {
    MarketEvalWSEvents,
    MarketEvalWSRequestType,
    ViewshedGeojsonResponse
} from '../MarketEvaluatorWS';
import { BaseWorkspaceFeature } from './BaseWorkspaceFeature';
import { BaseWorkspaceManager } from './BaseWorkspaceManager';
import { WorkspaceEvents, WorkspaceFeatureTypes } from './WorkspaceConstants';
import { AccessPoint, ASRTowerCoverageArea, CoverageArea } from './WorkspaceFeatures';
import { AccessPointSector } from './WorkspaceSectorFeature';

const SUPPORTED_FEATURE_TYPES = [
    WorkspaceFeatureTypes.COVERAGE_AREA,
    WorkspaceFeatureTypes.AP,
    WorkspaceFeatureTypes.SECTOR
];

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
            if (!feature.properties.hidden === true) {
                let polygon;
                if ('asr_status' in feature.properties) {
                    polygon = new ASRTowerCoverageArea(this.map, this.draw, feature);
                } else {
                    if (feature.geometry.type == 'Point') {
                        if (
                            feature.properties &&
                            feature.properties.feature_type === WorkspaceFeatureTypes.SECTOR
                        ) {
                            polygon = new AccessPointSector(this.map, this.draw, feature);
                        } else {
                            polygon = new AccessPoint(this.map, this.draw, feature);
                        }
                    } else {
                        polygon = new CoverageArea(this.map, this.draw, feature);
                    }
                }
                this.saveWorkspaceFeature(polygon);
            }
        };

        this.saveFeatureDrawModeHandlers.draw_polygon = saveCoverageArea;

        this.saveFeatureDrawModeHandlers.draw_ap = (feature: any) => {
            if (feature.geometry.type == 'Point') {
                const newCircle = {
                    ...feature,
                    properties: {
                        center: feature.geometry.coordinates
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

        this.saveFeatureDrawModeHandlers.direct_select = saveCoverageArea;
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

        this.deleteFeaturePreAjaxHandlers[WorkspaceFeatureTypes.COVERAGE_AREA] = (
            feat: BaseWorkspaceFeature
        ) => {
            return !(
                feat.workspaceId in
                MarketEvaluatorMapLayerSidebarManager.getInstance().hiddenCoverageAreas
            );
        };
    }

    onViewshedMsg(msg: string, response: ViewshedGeojsonResponse) {
        if (response.ap_uuid) {
            let sector = this.features.get(response.ap_uuid) as AccessPointSector;
            sector.read();
        }
    }
}
