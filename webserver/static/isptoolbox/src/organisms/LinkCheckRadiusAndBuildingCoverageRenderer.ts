import mapboxgl from 'mapbox-gl';
import * as _ from 'lodash';
import * as StyleConstants from '../isptoolbox-mapbox-draw/styles/StyleConstants';
import {
    WorkspaceEvents,
    WorkspaceFeatureTypes
} from '../workspace/WorkspaceConstants';
import { AccessPoint, CPE } from '../workspace/WorkspaceFeatures';
import LOSCheckWS from '../LOSCheckWS';
import { AccessPointCoverageResponse, LOSWSEvents } from '../workspace/WorkspaceConstants';
import { LOSCheckWorkspaceManager } from '../workspace/LOSCheckWorkspaceManager';
import {
    LinkCheckTowerPopup,
} from '../isptoolbox-mapbox-draw/popups/TowerPopups';
import { MapboxSDKClient } from '../MapboxSDKClient';
import { LinkCheckBasePopup } from '../isptoolbox-mapbox-draw/popups/LinkCheckBasePopup';
import {
    LinkCheckCPEClickCustomerConnectPopup,
    LinkCheckCustomerConnectPopup
} from '../isptoolbox-mapbox-draw/popups/LinkCheckCustomerConnectPopup';
import { getCookie } from '../utils/Cookie';
import { BaseWorkspaceManager } from '../workspace/BaseWorkspaceManager';
import { ViewshedTool } from './ViewshedTool';
import {
    LinkCheckSectorPopup,
} from '../isptoolbox-mapbox-draw/popups/AjaxSectorPopups';
import { BUILDING_DATA_SOURCE, BUILDING_LAYER, BUILDING_OUTLINE_LAYER, RadiusAndBuildingCoverageRenderer } from './APCoverageRenderer';
import { AjaxLinkCheckCPEPopup, AjaxLinkCheckLocationPopup } from '../isptoolbox-mapbox-draw/popups/AjaxCPEPopups';
import { isBeta } from '../LinkCheckUtils';


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
                })
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
    }

    sendCoverageRequest({ features }: { features: Array<any> }) {
        features.forEach((f: GeoJSON.Feature) => {
            if (f.properties && f.properties.feature_type === WorkspaceFeatureTypes.AP) {
                this.ws.sendAPRequest(f.properties.uuid);
            }
        });
    }

    AP_updateCallback(msg: string, { features }: { features: Array<any> }) {
        let viewshedTool = ViewshedTool.getInstance();
        let feature = this.draw.get(viewshedTool.viewshed_feature_id as string);
        if (feature) {
            viewshedTool.setVisibleLayer(this.shouldRenderFeature(feature));
        }
        super.AP_updateCallback(msg, { features: features });
    }

    accessPointStatusCallback(msg: string, message: AccessPointCoverageResponse) {
        $.ajax({
            url: `/pro/workspace/api/ap-los/coverage/${message.uuid}/`,
            success: (resp) => {
                this.updateCoverageFromAjaxResponse(resp, message.uuid);
            },
            method: 'GET',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        $.ajax({
            url: `/pro/workspace/api/ap-los/coverage/stats/${message.uuid}/`,
            success: (resp) => {
                const features = this.draw.getAll().features.filter((f: GeoJSON.Feature) => {
                    return f.properties?.uuid === message.uuid;
                });

                // Set last updated time
                // TODO: non-US formats when we expand internationally with isUnitsUS false
                const now = Intl.DateTimeFormat('en-US', {
                    year: '2-digit',
                    month: '2-digit',
                    day: '2-digit'
                }).format(Date.now());

                // Set serviceable, unserviceable, and unknown
                features.forEach((feat: GeoJSON.Feature) => {
                    for (const [key, value] of Object.entries(resp)) {
                        this.draw.setFeatureProperty(feat.id as string, key, value);
                    }
                    this.draw.setFeatureProperty(feat.id as string, 'last_updated', now);
                });
                this.apPopup.onAPUpdate(
                    BaseWorkspaceManager.getFeatureByUuid(message.uuid) as AccessPoint
                );
            },
            method: 'GET',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
    }

    updateCoverageFromAjaxResponse(resp: any, uuid: string) {
        const ap = BaseWorkspaceManager.getFeatureByUuid(uuid) as AccessPoint;
        ap.setCoverage(resp.features);
        this.renderBuildings();
        PubSub.publish(WorkspaceEvents.AP_COVERAGE_UPDATED, { uuid: uuid });
    }
}