import mapboxgl from 'mapbox-gl';
import * as _ from 'lodash';
import * as StyleConstants from '../isptoolbox-mapbox-draw/styles/StyleConstants';
import {
    WorkspaceEvents,
    WorkspaceFeatureTypes,
    WS_AP_Events
} from '../workspace/WorkspaceConstants';
import { AccessPoint, CPE } from '../workspace/WorkspaceFeatures';
import LOSCheckWS from '../LOSCheckWS';
import { AccessPointCoverageResponse, LOSWSEvents } from '../workspace/WorkspaceConstants';
import { LOSCheckWorkspaceManager } from '../workspace/LOSCheckWorkspaceManager';
import { LinkCheckTowerPopup } from '../isptoolbox-mapbox-draw/popups/TowerPopups';
import { MapboxSDKClient } from '../MapboxSDKClient';
import { LinkCheckBasePopup } from '../isptoolbox-mapbox-draw/popups/LinkCheckBasePopup';
import {
    LinkCheckCPEClickCustomerConnectPopup,
    LinkCheckCustomerConnectPopup
} from '../isptoolbox-mapbox-draw/popups/LinkCheckCustomerConnectPopup';
import { getCookie } from '../utils/Cookie';
import { BaseWorkspaceManager } from '../workspace/BaseWorkspaceManager';
import { ViewshedTool } from './ViewshedTool';
import { LinkCheckSectorPopup } from '../isptoolbox-mapbox-draw/popups/AjaxSectorPopups';
import {
    BUILDING_DATA_SOURCE,
    BUILDING_LAYER,
    BUILDING_OUTLINE_LAYER,
    RadiusAndBuildingCoverageRenderer
} from './RadiusAndBuildingCoverageRenderer';
import { isBeta } from '../LinkCheckUtils';
import { AjaxLinkCheckLocationPopup } from '../isptoolbox-mapbox-draw/popups/ajax-cpe-flow-popups/AjaxLinkCheckLocationFlowPopups';
import { AjaxLinkCheckCPEPopup } from '../isptoolbox-mapbox-draw/popups/ajax-cpe-flow-popups/AjaxLinkCheckCPEFlowPopups';
import { AccessPointSector } from '../workspace/WorkspaceSectorFeature';
import { clickedOnMapCanvas } from '../utils/MapboxEvents';
import { renderAjaxOperationFailed } from '../utils/ConnectionIssues';
import { djangoUrl } from '../utils/djangoUrl';

export class LinkCheckRadiusAndBuildingCoverageRenderer extends RadiusAndBuildingCoverageRenderer {
    ws: LOSCheckWS;

    constructor(map: mapboxgl.Map, draw: MapboxDraw, ws: LOSCheckWS) {
        super(map, draw, LOSCheckWorkspaceManager, LinkCheckTowerPopup, LinkCheckSectorPopup);
        this.ws = ws;

        // Building Layer click callback
        this.map.on('click', BUILDING_LAYER, (e: any) => {
            // Check if we clicked on a CPE
            const features = this.map.queryRenderedFeatures(e.point);
            if (
                !features.some((feat) => {
                    if (feat.properties) {
                        const type = feat.geometry.type;
                        return (
                            feat.source.includes('mapbox-gl-draw') &&
                            (type === 'Point' || type === 'LineString')
                        );
                    }
                    return feat.source.includes('mapbox-gl-draw');
                }) &&
                clickedOnMapCanvas(e)
            ) {
                let building = this.map.queryRenderedFeatures(e.point, {
                    layers: [BUILDING_LAYER]
                })[0];
                let lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
                if (building.properties?.cpe_location) {
                    const parsed_location = JSON.parse(building.properties.cpe_location);
                    if (parsed_location !== null) {
                        lngLat = parsed_location.coordinates;
                    }
                }

                if (isBeta()) {
                    let popup = AjaxLinkCheckLocationPopup.getInstance();
                    popup.setLngLat(lngLat);
                    popup.show();
                } else {
                    let buildingId = building.properties?.msftid;
                    let mapboxClient = MapboxSDKClient.getInstance();
                    mapboxClient.reverseGeocode(lngLat, (response: any) => {
                        let popup = LinkCheckBasePopup.createPopupFromReverseGeocodeResponse(
                            LinkCheckCustomerConnectPopup,
                            lngLat,
                            response
                        );
                        popup.setBuildingId(buildingId);

                        // Render all APs
                        popup.show();
                    });
                }
            }
        });

        PubSub.subscribe(LOSWSEvents.AP_MSG, this.accessPointStatusCallback.bind(this));

        // Change the cursor to a pointer when the mouse is over the states layer.
        this.map.on('mouseenter', BUILDING_LAYER, () => {
            this.map.getCanvas().style.cursor = 'pointer';
        });

        // Change it back to a pointer when it leaves.
        this.map.on('mouseleave', BUILDING_LAYER, () => {
            this.map.getCanvas().style.cursor = '';
        });

        const onClickCPE = (e: any) => {
            // Show tooltip if only one CPE is selected.
            const selectedCPEs = this.workspaceManager.filterByType(
                this.draw.getSelected().features,
                WorkspaceFeatureTypes.CPE
            );
            let cpePopup = LinkCheckCPEClickCustomerConnectPopup.getInstance();
            if (selectedCPEs.length === 1) {
                let cpe = BaseWorkspaceManager.getFeatureByUuid(
                    selectedCPEs[0].properties.uuid
                ) as CPE;

                if (isBeta()) {
                    let popup = AjaxLinkCheckCPEPopup.getInstance();
                    popup.hide();
                    popup.setCPE(cpe);
                    popup.show();
                } else {
                    let mapboxClient = MapboxSDKClient.getInstance();
                    let lngLat = cpe.getFeatureGeometry()?.coordinates as [number, number];
                    mapboxClient.reverseGeocode(lngLat, (resp: any) => {
                        cpePopup = LinkCheckBasePopup.createPopupFromReverseGeocodeResponse(
                            LinkCheckCPEClickCustomerConnectPopup,
                            lngLat,
                            resp
                        );
                        cpePopup.hide();
                        cpePopup.setCPE(cpe);
                        cpePopup.show();
                    });
                }
            } else if (selectedCPEs.length > 1) {
                cpePopup.hide();
            }
        };

        // Keep trying to load the AP onClick event handler until we can find layers
        // to do this, then stop.
        const loadCPEOnClick = () => {
            this.map.getStyle().layers?.forEach((layer: any) => {
                if (layer.id.includes('gl-draw-point-cpe')) {
                    this.map.on('click', layer.id, onClickCPE);
                    this.map.off('idle', loadCPEOnClick);
                }
            });
        };
        this.map.on('idle', loadCPEOnClick);
    }

    addBuildingLayer() {
        this.map.addLayer({
            id: BUILDING_OUTLINE_LAYER,
            type: 'line',
            source: BUILDING_DATA_SOURCE,
            layout: {},
            paint: {
                'line-color': [
                    'match',
                    ['get', 'serviceable'],
                    'unserviceable',
                    StyleConstants.UNSERVICEABLE_BUILDINGS_COLOR,
                    'serviceable',
                    StyleConstants.SERVICEABLE_BUILDINGS_COLOR,
                    /* other */ StyleConstants.UNKNOWN_BUILDINGS_COLOR
                ],
                'line-width': 1,
                'line-opacity': 0.9
            }
        });

        this.map.addLayer(
            {
                id: BUILDING_LAYER,
                type: 'fill',
                source: BUILDING_DATA_SOURCE,
                layout: {},
                paint: {
                    'fill-opacity': 0
                }
            },
            BUILDING_OUTLINE_LAYER
        );

        // Wait for mapbox draw to finish loading - once complete place buildings above mapbox draw layers
        // If you can think of a better way to do this - feel free to replace
        const addBuildingLayerHelper = (r: mapboxgl.MapDataEvent) => {
            const style = r.target.getStyle();
            const draw_layers_loaded = style
                .layers?.some(
                    (l) => l.type === 'line' && (l.source as string).includes('mapbox-gl-draw') && l.id === 'gl-draw-line-static.cold'
                );

            if (draw_layers_loaded) {
                this.map.moveLayer(BUILDING_LAYER, 'gl-draw-line-static.cold');
                this.map.moveLayer(BUILDING_OUTLINE_LAYER, BUILDING_LAYER);
                this.map.off('styledata', addBuildingLayerHelper);
            }
        };
        this.map.on('styledata', addBuildingLayerHelper);
    }

    drawSelectionChangeCallback({ features }: { features: Array<GeoJSON.Feature> }): void {
        RadiusAndBuildingCoverageRenderer.prototype.drawSelectionChangeCallback.call(this, {
            features
        });
        if(features.length === 1){
            const feat = features[0];
            if( feat.properties?.feature_type === WorkspaceFeatureTypes.SECTOR){
                this.accessPointStatusCallback('', {
                    type: WS_AP_Events.AP_STATUS,
                    uuid: feat.properties?.uuid
                });
            }
        }
    }

    sendCoverageRequest({ features }: { features: Array<any> }) {
        features.forEach((f: GeoJSON.Feature) => {
            if (f.properties && f.properties.feature_type === WorkspaceFeatureTypes.AP) {
                this.ws.sendAPRequest(f.properties.uuid);
            }
        });
    }

    accessPointStatusCallback(msg: string, message: AccessPointCoverageResponse) {
        // TODO: deprecate AP
        const feat = this.draw.getAll().features.find(f => f.properties?.uuid === message.uuid);
        if(feat?.properties?.feature_type === WorkspaceFeatureTypes.AP && isBeta())
        {
            return;
        }

        $.ajax({
            url: djangoUrl('workspace:coverage-geojson', message.uuid),
            method: 'GET',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        }).done((resp) => {
            this.updateCoverageFromAjaxResponse(resp, message.uuid);
        }).fail((error) => {
            if(error.status !== 404)
            {
                renderAjaxOperationFailed();
            }
        })
        $.ajax({
            url: djangoUrl('workspace:coverage-stats', message.uuid),
            method: 'GET',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        }).done((resp) => {
            const features = this.draw.getAll().features.filter((f: GeoJSON.Feature) => {
                return f.properties?.uuid === message.uuid;
            });

            // Set serviceable, unserviceable, and unknown
            features.forEach((feat: GeoJSON.Feature) => {
                for (const [key, value] of Object.entries(resp)) {
                    this.draw.setFeatureProperty(feat.id as string, key, value);
                }
            });
            // TODO: deprecate
            if (this.apPopup && this.apPopup.onAPUpdate) {
                this.apPopup.onAPUpdate(
                    BaseWorkspaceManager.getFeatureByUuid(message.uuid) as AccessPoint
                );
            }
        }).fail((error) => {
            if(error.status !== 404)
            {
                renderAjaxOperationFailed();
            }
        });
    }

    updateCoverageFromAjaxResponse(resp: GeoJSON.FeatureCollection, uuid: string) {
        const feat = BaseWorkspaceManager.getFeatureByUuid(uuid) as AccessPoint | AccessPointSector;
        feat?.setCoverage(resp.features);
        this.renderBuildings();
        PubSub.publish(WorkspaceEvents.AP_COVERAGE_UPDATED, { uuid: uuid });
    }
}
