// (c) Meta Platforms, Inc. and affiliates. Copyright
import mapboxgl, * as MapboxGL from 'mapbox-gl';
import * as _ from 'lodash';
import { LOSWSEvents, WorkspaceFeatureTypes } from './WorkspaceConstants';
import { BaseWorkspaceFeature } from './BaseWorkspaceFeature';
import { AccessPoint, APToCPELink, CPE, PointToPointLink } from './WorkspaceFeatures';
import { MapboxSDKClient } from '../MapboxSDKClient';
import { BuildingCoverageStatus } from './BuildingCoverage';
import { LinkCheckTowerPopup } from '../isptoolbox-mapbox-draw/popups/TowerPopups';
import { getStreetAndAddressInfo, isBeta } from '../LinkCheckUtils';

import { BaseWorkspaceManager } from './BaseWorkspaceManager';
import { AccessPointSector } from './WorkspaceSectorFeature';

const SUPPORTED_FEATURE_TYPES = [
    WorkspaceFeatureTypes.AP_CPE_LINK,
    WorkspaceFeatureTypes.AP,
    WorkspaceFeatureTypes.CPE,
    WorkspaceFeatureTypes.PTP_LINK,
    WorkspaceFeatureTypes.SECTOR
];

export class LOSCheckWorkspaceManager extends BaseWorkspaceManager {
    constructor(map: MapboxGL.Map, draw: MapboxDraw) {
        super(map, draw, SUPPORTED_FEATURE_TYPES);
        PubSub.subscribe(LOSWSEvents.CPE_SECTOR_CREATED_MSG, this.sectorCreateCallback.bind(this));
        BaseWorkspaceManager._instance = this;
    }

    initSaveFeatureHandlers() {
        this.saveFeatureDrawModeHandlers.draw_ap = this.createApFeature.bind(this);

        this.saveFeatureDrawModeHandlers.simple_select = (feature: any) => {
            // It is possible to add either an AP or CPE while in simple_select so determine based on feature properties
            // Adding CPE also adds link from CPE to specified AP (see customer popup)
            if (feature.geometry.type == 'Point' && !feature.properties.radius) {
                if (feature.properties.feature_type === WorkspaceFeatureTypes.SECTOR) {
                    this.saveWorkspaceFeature(new AccessPointSector(this.map, this.draw, feature));
                } else {
                    let workspaceFeature = new CPE(this.map, this.draw, feature);
                    this.saveWorkspaceFeature(workspaceFeature, (resp) => {
                        let cpe = workspaceFeature as CPE;

                        let apUUID = feature.properties.ap || feature.properties.sector;
                        let ap = this.features.get(apUUID) as AccessPoint | AccessPointSector;
                        let link = cpe.linkAP(ap);
                        this.saveWorkspaceFeature(link, (resp) => {
                            this.map.fire('draw.create', { features: [link.getFeatureData()] });
                        });
                    });
                }
            } else if (feature.properties?.feature_type === WorkspaceFeatureTypes.SECTOR) {
                this.saveWorkspaceFeature(new AccessPointSector(this.map, this.draw, feature));
            } else if (feature.properties.radius) {
                this.createApFeature(feature);
            }
        };

        this.saveFeatureDrawModeHandlers.direct_select = (feature: any) => {
            if (feature.properties.radius) {
                this.createApFeature(feature);
            } else if (feature.properties.feature_type === WorkspaceFeatureTypes.SECTOR) {
                this.saveWorkspaceFeature(new AccessPointSector(this.map, this.draw, feature));
            } else if (feature.properties.feature_type === WorkspaceFeatureTypes.CPE) {
                let workspaceFeature = new CPE(this.map, this.draw, feature);
                this.saveWorkspaceFeature(workspaceFeature, (resp) => {
                    let cpe = workspaceFeature as CPE;
                    let apUUID = feature.properties.ap || feature.properties.sector;
                    let ap = this.features.get(apUUID) as AccessPoint | AccessPointSector;
                    let link = cpe.linkAP(ap);
                    this.saveWorkspaceFeature(link, (resp) => {
                        this.map.fire('draw.create', { features: [link.getFeatureData()] });
                    });
                });
            }
        };

        this.saveFeatureDrawModeHandlers.draw_link = (
            feature: GeoJSON.Feature<GeoJSON.LineString>
        ) => {
            if (feature.properties?.feature_type === WorkspaceFeatureTypes.PTP_LINK) {
                const ptp = new PointToPointLink(this.map, this.draw, feature);
                this.saveWorkspaceFeature(ptp, (resp) => {});
            }
        };
    }

    initDeleteFeatureHandlers() {
        this.deleteFeaturePreAjaxHandlers[WorkspaceFeatureTypes.AP] = (
            workspaceFeature: BaseWorkspaceFeature
        ) => {
            let popup = LinkCheckTowerPopup.getInstance();
            let ap = workspaceFeature as AccessPoint;

            // Get rid of tower tooltip if the APs match
            if (popup.getAccessPoint() === ap) {
                popup.hide();
            }
        };

        this.deleteFeaturePreAjaxHandlers[WorkspaceFeatureTypes.AP_CPE_LINK] = (
            workspaceFeature: BaseWorkspaceFeature
        ) => {
            let link = workspaceFeature as APToCPELink;
            if (!this.draw.get(link.tower.mapboxId) || !this.draw.get(link.cpe.mapboxId)) {
                this.features.delete(workspaceFeature.workspaceId);
                return false;
            } else {
                return true;
            }
        };
    }

    initUpdateFeatureHandlers() {
        this.updateFeatureAjaxHandlers[WorkspaceFeatureTypes.AP].post_update = (
            workspaceFeature: BaseWorkspaceFeature
        ) => {
            let ap = workspaceFeature as AccessPoint;
            Object.keys(BuildingCoverageStatus).forEach((status: string) => {
                ap.setFeatureProperty(status, null);
            });
            if(!isBeta())
            {
                LinkCheckTowerPopup.getInstance().onAPUpdate(ap);
                LinkCheckTowerPopup.getInstance().show();
            }
        };

        this.updateFeatureAjaxHandlers[WorkspaceFeatureTypes.CPE].post_update = (
            workspaceFeature: BaseWorkspaceFeature
        ) => {
            // I hate this hack
            let cpe = workspaceFeature as CPE;
            $(`#radio_name-1`).text(cpe.getFeatureProperty('name'));
        };
    }

    private sectorCreateCallback(
        event: string,
        data: { added_features: Array<any>; deleted_features: Array<any> }
    ) {
        // removed the deleted features
        data.deleted_features.forEach((feature: any) => {
            let workspaceFeature = this.features.get(feature.properties.uuid);
            if (workspaceFeature != null) {
                this.draw.delete(workspaceFeature.mapboxId);
                this.features.delete(feature.properties.uuid);
            }
        });

        this.addFeatures(data.added_features);
    }

    private createApFeature(feature: any) {
        const mapboxClient = MapboxSDKClient.getInstance();

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
                const apPopup = LinkCheckTowerPopup.getInstance();
                apPopup.setAccessPoint(ap);
                apPopup.show();
                if (feature.properties.ptpLinksToRemove) {
                    feature.properties.ptpLinksToRemove.forEach((id: string) => {
                        let featToDelete = this.draw.get(id);
                        this.draw.delete(id);
                        this.map.fire('draw.delete', { features: [featToDelete] });
                    });
                }

                if (feature.properties.cpeLngLats) {
                    feature.properties.cpeLngLats.forEach((lngLat: [number, number]) => {
                        mapboxClient.reverseGeocode(lngLat, (mapboxResponse: any) => {
                            let result = mapboxResponse.body.features;
                            let street = getStreetAndAddressInfo(result[0].place_name);
                            let newCPE = {
                                type: 'Feature',
                                geometry: {
                                    type: 'Point',
                                    coordinates: lngLat
                                },
                                properties: {
                                    name: street.street,
                                    ap: ap.workspaceId,
                                    feature_type: WorkspaceFeatureTypes.CPE
                                }
                            };
                            this.map.fire('draw.create', { features: [newCPE] });
                        });
                    });
                }
            });
        }
    }
}
