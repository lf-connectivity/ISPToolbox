import * as MapboxGL from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { WorkspaceFeatureTypes } from './WorkspaceConstants';
import centroid from '@turf/centroid';
import { BaseWorkspaceManager } from './BaseWorkspaceManager';
import { AccessPoint, CoverageArea } from './WorkspaceFeatures';
import CollapsibleComponent from '../atoms/CollapsibleComponent';
import { BaseWorkspaceFeature } from './BaseWorkspaceFeature';
import { IMapboxDrawPlugin, initializeMapboxDrawInterface } from '../utils/IMapboxDrawPlugin';
import { generateMapLayerSidebarRow } from '../atoms/MapLayerSidebarRow';
import { AccessPointSector } from './WorkspaceSectorFeature';
import { AjaxTowerPopup } from '../isptoolbox-mapbox-draw/popups/AjaxTowerPopup';
import { BaseAjaxSectorPopup } from '../isptoolbox-mapbox-draw/popups/AjaxSectorPopups';

export class MapLayerSidebarManager extends CollapsibleComponent implements IMapboxDrawPlugin {
    map: MapboxGL.Map;
    draw: MapboxDraw;
    protected static _instance: MapLayerSidebarManager;

    constructor(map: MapboxGL.Map, draw: MapboxDraw) {
        super();
        initializeMapboxDrawInterface(this, map);
        if (MapLayerSidebarManager._instance) {
            throw Error('Already defined');
        }

        MapLayerSidebarManager._instance = this;
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
                    this.drawReadyCallback();
                    this.map.off('idle', loadMapCallback);
                    return false;
                }
                return true;
            });
        };
        this.map.on('idle', loadMapCallback);
    }

    drawCreateCallback(event: { features: Array<GeoJSON.Feature> }) {
        event.features.forEach((f) => {
            const row = generateMapLayerSidebarRow(f);
            if (row) {
                if (f.properties?.feature_type === WorkspaceFeatureTypes.SECTOR) {
                    $(row).insertAfter(
                        $(
                            `.market_overlay--section .object-toggle-row[data-target=${f.properties.ap}]`
                        )
                    );
                } else {
                    $(`.market_overlay--section`).prepend(row);
                }
                // Add Click Callback Handlers
                $(
                    `.market_overlay--section .object-toggle-row[data-target=${f.properties?.uuid}] .label`
                ).on('click', (e) => {
                    const uuid = e.currentTarget.getAttribute('data-target');
                    if (typeof uuid === 'string') {
                        this.clickHandler(uuid);
                    }
                });
                // Add Toggle Callback Handlers
                $(
                    `.market_overlay--section .object-toggle-row[data-target=${f.properties?.uuid}] .toggle-switch input`
                ).on('click', (e) => {
                    const uuid = e.currentTarget.getAttribute('data-target');
                    if (typeof uuid === 'string') {
                        this.toggleHandler(uuid);
                    }
                });
            }
        });
        this.renderInstructions();
    }

    drawUpdateCallback(event: {
        features: Array<GeoJSON.Feature>;
        action: 'move' | 'change_coordinates' | 'read';
    }) {
        event.features.forEach((f) => {
            // Check if row exists
            const create_row =
                $(`.market_overlay--section .object-toggle-row[data-target=${f.properties?.uuid}]`)
                    .length === 0;
            if (create_row) {
                this.drawCreateCallback({ features: [f] });
            } else {
                $(
                    `.market_overlay--section .object-toggle-row[data-target=${f.properties?.uuid}] .label`
                ).text(f.properties?.name);
            }
        });
    }

    drawDeleteCallback(event: { features: Array<GeoJSON.Feature> }) {
        event.features.forEach((f) => {
            const uuid = f.properties?.uuid;
            if (uuid) {
                $(`.market_overlay--section .object-toggle-row[data-target=${uuid}]`).remove();
            }
        });
        this.renderInstructions();
    }

    drawReadyCallback() {
        // Add Click Callback Handlers
        $('.market_overlay--section .object-toggle-row .label').on('click', (e) => {
            const uuid = e.currentTarget.getAttribute('data-target');
            if (typeof uuid === 'string') {
                this.clickHandler(uuid);
            }
        });
        // Add Toggle Callback Handlers
        $('.market_overlay--section .object-toggle-row .toggle-switch input').on('click', (e) => {
            const uuid = e.currentTarget.getAttribute('data-target');
            if (typeof uuid === 'string') {
                this.toggleHandler(uuid);
            }
        });
    }

    renderInstructions() {
        if ($('.market_overlay--section .object-toggle-row').length == 0) {
            $('#zerostate').removeClass('d-none');
        } else {
            $('#zerostate').addClass('d-none');
        }
    }

    protected showComponent() {
        $('#map-layer-sidebar').addClass('show');
        this.map.resize();
    }

    protected hideComponent() {
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

    private setMapboxVisibility(feature: BaseWorkspaceFeature, visible: boolean) {
        if (!visible) {
            feature.setFeatureProperty('hidden', 'true');
        } else {
            feature.setFeatureProperty('hidden', undefined);
        }

        const new_feat = this.draw.get(feature.mapboxId);
        if (new_feat) {
            this.draw.add(new_feat);
            this.map.fire('draw.update', { action: 'read', features: [new_feat] });
        }

        this.setCheckedStatus(feature, visible);
    }

    private getCheckedStatus(feature: BaseWorkspaceFeature) {
        return $(
            `.market_overlay--section .object-toggle-row .toggle-switch input[data-target="${feature.workspaceId}"]`
        ).prop('checked');
    }

    private setCheckedStatus(feature: BaseWorkspaceFeature, visible: boolean) {
        $(
            `.market_overlay--section .object-toggle-row .toggle-switch input[data-target="${feature.workspaceId}"]`
        ).prop('checked', visible);
    }

    setFeatureVisibility(feature: BaseWorkspaceFeature, visible: boolean) {
        switch (feature.getFeatureType()) {
            case WorkspaceFeatureTypes.AP:
                let tower = feature as AccessPoint;
                this.setMapboxVisibility(tower, visible);
                tower.sectors.forEach((sect: AccessPointSector) => {
                    this.setMapboxVisibility(sect, visible);
                });
                break;
            case WorkspaceFeatureTypes.SECTOR:
                let sector = feature as AccessPointSector;
                this.setMapboxVisibility(sector, visible);

                // Two cases for setting visible status for parent tower:
                // 1. All the sectors are hidden but the tower isn't marked as hidden.
                // 2. Tower is marked as hidden but one of the sectors isn't.
                if (visible && !this.getCheckedStatus(sector.ap)) {
                    this.setMapboxVisibility(sector.ap, true);
                } else {
                    let visibleCount = 0;
                    sector.ap.sectors.forEach((sect: AccessPointSector) => {
                        if (this.getCheckedStatus(sect)) {
                            visibleCount += 1;
                        }
                    });
                    if (visibleCount === 0) {
                        this.setMapboxVisibility(sector.ap, false);
                    }
                }
                break;
        }
    }

    private toggleHandler = (uuid: string) => {
        const feature = BaseWorkspaceManager.getFeatureByUuid(uuid);
        const visible = feature.getFeatureProperty('hidden') === undefined;
        this.setFeatureVisibility(feature, !visible);
    };

    private clickHandler = (uuid: string) => {
        const feature = BaseWorkspaceManager.getFeatureByUuid(uuid);
        const towerPopup = AjaxTowerPopup.getInstance();
        const sectorPopup = BaseAjaxSectorPopup.getInstance();
        towerPopup.hide();
        sectorPopup.hide();

        if (feature) {
            let coordinates;
            switch (feature.getFeatureType()) {
                case WorkspaceFeatureTypes.COVERAGE_AREA:
                    let coverageArea = feature as CoverageArea;

                    // @ts-ignore
                    let polygonCentroid = centroid(coverageArea.getFeatureGeometry());
                    coordinates = polygonCentroid.geometry.coordinates as [number, number];
                    break;
                case WorkspaceFeatureTypes.SECTOR:
                    let sector = feature as AccessPointSector;
                    coordinates = sector.ap.getFeatureGeometryCoordinates() as [number, number];
                    if (this.getCheckedStatus(sector)) {
                        sectorPopup.setSector(sector);
                        sectorPopup.show();
                    }
                    break;
                case WorkspaceFeatureTypes.AP:
                    let ap = feature as AccessPoint;
                    coordinates = ap.getFeatureGeometryCoordinates() as [number, number];

                    // Show tooltip if AP is visible
                    if (this.getCheckedStatus(ap)) {
                        towerPopup.setAccessPoint(ap);
                        towerPopup.show();
                    }
                    break;
            }

            this.map.flyTo({
                center: coordinates
            });
        }
    };
}
