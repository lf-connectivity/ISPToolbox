import * as MapboxGL from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { generateMapLayerSidebarRow } from '../atoms/MapLayerSidebarRow';
import { WorkspaceFeatureTypes, WorkspaceEvents, WorkspaceTools } from './WorkspaceConstants';
import centroid from '@turf/centroid';
import { BaseWorkspaceManager } from './BaseWorkspaceManager';
import { AccessPoint, CoverageArea } from './WorkspaceFeatures';
import CollapsibleComponent from '../atoms/CollapsibleComponent';
import { BaseWorkspaceFeature } from './BaseWorkspaceFeature';
import { BaseTowerPopup } from '../isptoolbox-mapbox-draw/popups/TowerPopups';

export class MapLayerSidebarManager extends CollapsibleComponent {
    hiddenAccessPointIds: Array<string>;
    hiddenCoverageAreas: { [workspaceId: string]: any };
    polygonCounter: { [name: string]: number };
    workspaceIdToPolygonCounter: { [workspaceId: string]: number };
    map: MapboxGL.Map;
    draw: MapboxDraw;
    protected static _instance: MapLayerSidebarManager;

    constructor(map: MapboxGL.Map, draw: MapboxDraw) {
        super();
        if (MapLayerSidebarManager._instance) {
            throw Error('Already defined');
        }

        MapLayerSidebarManager._instance = this;
        this.polygonCounter = {};
        this.hiddenAccessPointIds = [];
        this.hiddenCoverageAreas = {};
        this.workspaceIdToPolygonCounter = {};
        this.map = map;
        this.draw = draw;

        const loadMapCallback = () => {
            this.map.getStyle().layers?.every((layer: any) => {
                if (layer.id.includes('gl-draw')) {
                    $(`#map-layers-btn`).on('click', (event) => {
                        const $sidebar = $('#map-layer-sidebar');
                        if ($sidebar.hasClass('show')) {
                            this.hide();
                        } else {
                            this.show();
                        }
                    });
                    this.map.off('idle', loadMapCallback);
                    return false;
                }
                return true;
            });
        };
        this.map.on('idle', loadMapCallback);
    }

    setUserMapLayers() {
        // add building objects to sidebar
        let mapObjectsSection = document.getElementById('map-objects-section');
        while (mapObjectsSection?.firstChild) {
            mapObjectsSection.removeChild(mapObjectsSection.firstChild);
        }

        // Towers, then coverage areas.

        // Sort towers by name
        let towers = BaseWorkspaceManager.getFeatures(WorkspaceFeatureTypes.AP);
        towers.sort((first: BaseWorkspaceFeature, second: BaseWorkspaceFeature) => {
            let firstName = first.getFeatureProperty('name');
            let secondName = second.getFeatureProperty('name');

            if (firstName > secondName) {
                return 1;
            } else if (firstName == secondName) {
                return 0;
            } else {
                return -1;
            }
        });
        BaseWorkspaceManager.getFeatures(WorkspaceFeatureTypes.AP).forEach((ap: AccessPoint) => {
            const elem = generateMapLayerSidebarRow(
                ap.getFeatureData(),
                ap.getFeatureProperty('name'),
                this.clickHandler,
                this.toggleHandler
            );
            mapObjectsSection!.appendChild(elem);
        });

        BaseWorkspaceManager.getFeatures(WorkspaceFeatureTypes.COVERAGE_AREA).forEach(
            (coverage: CoverageArea) => {
                let polygonNumber;
                let name = coverage.getFeatureProperty('name') || 'Area';

                if (coverage.workspaceId in this.workspaceIdToPolygonCounter) {
                    polygonNumber = this.workspaceIdToPolygonCounter[coverage.workspaceId];
                } else {
                    if (!(name in this.polygonCounter)) {
                        polygonNumber = 1;
                        this.polygonCounter[name] = 1;
                    } else {
                        polygonNumber = this.polygonCounter[name];
                    }
                    this.workspaceIdToPolygonCounter[coverage.workspaceId] = polygonNumber;
                    this.polygonCounter[name]++;
                }
                const elem = generateMapLayerSidebarRow(
                    coverage.getFeatureData(),
                    `${name} ${polygonNumber}`,
                    this.clickHandler,
                    this.toggleHandler
                );
                mapObjectsSection!.appendChild(elem);
            }
        );

        mapObjectsSection = document.getElementById('map-objects-section');
        $('#zerostate').addClass('invisible'); // on default don't show anyhing
        $('#zerostate').css('max-height', '0px'); // on default don't show anyhing
        $('#map-objects-section').addClass('mt-n4');
        if (mapObjectsSection?.firstChild === null) {
            $('#zerostate').addClass('visible'); //if no items in layers, show the error message
            $('#zerostate').removeClass('invisible');
        }
    }

    setFeatureVisibility(WSId: string, show: boolean) {
        const WSFeature = BaseWorkspaceManager.getFeatureByUuid(WSId);
        if (WSFeature) {
            const MBFeature = this.draw.get(WSFeature.mapboxId);
            const MBId = (MBFeature ? MBFeature.id : undefined) as string | undefined;

            switch (WSFeature.featureType) {
                case WorkspaceFeatureTypes.COVERAGE_AREA:
                    this.toggleCoverageAreaVisibility(MBId, WSFeature, show);
                    break;
                case WorkspaceFeatureTypes.AP:
                    this.toggleAPVisibility(MBId as string, show);
                    break;
                default:
                    return;
            }
            this.setCheckedStatus(WSFeature, show);
        }
    }

    protected showComponent() {
        //@ts-ignore
        $('#map-layer-sidebar').addClass('show');
        this.map.resize();
    }

    protected hideComponent() {
        //@ts-ignore
        $('#map-layer-sidebar').removeClass('show');
        this.map.resize();
    }

    static getInstance(): MapLayerSidebarManager {
        if (MapLayerSidebarManager._instance) {
            return MapLayerSidebarManager._instance;
        } else {
            throw new Error('No Instance of MapLayerSidebarManager instantiated.');
        }
    }

    private updateCoverageAreaVisibility = (MBFeature: any, WSFeature: any) => {
        let id = MBFeature?.id;

        // getCheckedStatus returns the current checked status, not the future state.
        this.toggleCoverageAreaVisibility(id, WSFeature, !this.getCheckedStatus(WSFeature));
    };

    private updateAPVisibility = (MBFeature: any, WSFeature: any) => {
        let id = String(MBFeature?.id);

        let popup = BaseTowerPopup.getInstance();
        if (popup.getAccessPoint() && popup.getAccessPoint() === WSFeature) {
            popup.hide();
        }

        // getCheckedStatus returns the current checked status, not the future state.
        this.toggleAPVisibility(id, !this.getCheckedStatus(WSFeature));
        PubSub.publish(WorkspaceEvents.AP_UPDATE, { features: [WSFeature] });
    };

    private toggleCoverageAreaVisibility(
        MBId: string | undefined,
        WSFeature: BaseWorkspaceFeature,
        show: boolean
    ) {
        let MBFeature: any | undefined;
        if (show) {
            if (!MBId) {
                MBFeature = this.hiddenCoverageAreas[WSFeature.workspaceId];
                //@ts-ignore
                let mapboxId = this.draw.add(MBFeature)[0];
                WSFeature.mapboxId = mapboxId;
                this.map.fire('draw.create', { features: [MBFeature] });
                delete this.hiddenCoverageAreas[WSFeature.workspaceId];
            }
        } else {
            if (MBId) {
                MBFeature = this.draw.get(MBId);
                if (MBFeature) {
                    MBFeature.properties.hidden = true;
                    this.hiddenCoverageAreas[WSFeature.workspaceId] = MBFeature;
                    this.draw.delete(MBFeature.id);
                    this.map.fire('draw.delete', { features: [MBFeature] });
                }
            }
        }
    }

    private toggleAPVisibility(MBId: string, show: boolean) {
        let i = this.hiddenAccessPointIds.indexOf(MBId);
        if (show) {
            // Remove from hiddenAccessPointIds if there
            if (i > -1) {
                this.hiddenAccessPointIds.splice(i, 1);
            }
        } else {
            // Add to hiddenAccessPointIds if not there
            if (i == -1) {
                this.hiddenAccessPointIds = [...this.hiddenAccessPointIds, MBId];

                // Deselect tower if it is selected
                if (
                    this.draw.getMode() == 'simple_select' &&
                    this.draw.getSelectedIds().includes(MBId)
                ) {
                    let newSelection = this.draw.getSelectedIds().filter((f: string) => f !== MBId);
                    this.setSelection(newSelection);
                }
            }
        }
    }

    private getCheckedStatus(WSFeature: BaseWorkspaceFeature) {
        return $(`#switch-user-layer-${WSFeature.workspaceId}`).prop('checked');
    }

    private setCheckedStatus(WSFeature: BaseWorkspaceFeature, checked: boolean) {
        $(`#switch-user-layer-${WSFeature.workspaceId}`).prop('checked', checked);
    }

    private setSelection(MBIds: Array<string>) {
        if (this.draw.getMode() == 'simple_select') {
            // @ts-ignore
            this.draw.changeMode('draw_ap', {}); //this is a hack that works in both ME and LOS
            this.draw.changeMode('simple_select', { featureIds: MBIds });
        }
    }

    private toggleHandler = (e: any, uuid: string) => {
        const WSFeature = BaseWorkspaceManager.getFeatureByUuid(uuid);
        if (WSFeature) {
            let MBFeature = this.draw.get(WSFeature.mapboxId);
            switch (WSFeature.featureType) {
                case WorkspaceFeatureTypes.COVERAGE_AREA:
                    this.updateCoverageAreaVisibility(MBFeature, WSFeature);
                case WorkspaceFeatureTypes.AP:
                    this.updateAPVisibility(MBFeature, WSFeature);
                default:
                    return;
            }
        }
    };

    private clickHandler = (uuid: string) => {
        const feature = BaseWorkspaceManager.getFeatureByUuid(uuid);
        if (feature) {
            let coordinates;
            if (feature.getFeatureType() == WorkspaceFeatureTypes.COVERAGE_AREA) {
                let coverageArea = feature as CoverageArea;

                // @ts-ignore
                let polygonCentroid = centroid(coverageArea.getFeatureGeometry());
                coordinates = polygonCentroid.geometry.coordinates as [number, number];
            } else {
                let ap = feature as AccessPoint;
                coordinates = ap.getFeatureGeometryCoordinates() as [number, number];

                // Show tooltip if AP is visible
                let popup = BaseTowerPopup.getInstance();
                popup.hide();
                if (this.getCheckedStatus(ap)) {
                    popup.setAccessPoint(ap);
                    popup.show();
                }

                // Change selection to nothing if hidden, AP if shown
                this.setSelection(this.getCheckedStatus(ap) ? [ap.mapboxId] : []);
            }

            this.map.flyTo({
                center: coordinates
            });
        }
    };
}
