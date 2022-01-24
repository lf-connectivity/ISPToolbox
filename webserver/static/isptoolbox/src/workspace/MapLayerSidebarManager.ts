import * as MapboxGL from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { WorkspaceFeatureTypes } from './WorkspaceConstants';
import centroid from '@turf/centroid';
import { BaseWorkspaceManager } from './BaseWorkspaceManager';
import { AccessPoint, CoverageArea } from './WorkspaceFeatures';
import CollapsibleComponent from '../atoms/CollapsibleComponent';
import { BaseWorkspaceFeature } from './BaseWorkspaceFeature';
import { BaseTowerPopup } from '../isptoolbox-mapbox-draw/popups/TowerPopups';
import { IMapboxDrawPlugin, initializeMapboxDrawInterface } from '../utils/IMapboxDrawPlugin';
import { generateMapLayerSidebarRow } from '../atoms/MapLayerSidebarRow';

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
        event.features.forEach(f => {
            const row = generateMapLayerSidebarRow(f);
            if (row) {
                if (f.properties?.feature_type === WorkspaceFeatureTypes.SECTOR) {
                    $(row).insertAfter($(`.market_overlay--section .object-toggle-row[data-target=${f.properties.ap}]`));
                } else {
                    $(`.market_overlay--section`).prepend(row);
                }
                // Add Click Callback Handlers
                $(`.market_overlay--section .object-toggle-row[data-target=${f.properties?.uuid}] .label`).on('click', (e) => {
                    const uuid = e.currentTarget.getAttribute('data-target');
                    if (typeof uuid === 'string') {
                        this.clickHandler(uuid);
                    }
                });
                // Add Toggle Callback Handlers
                $(`.market_overlay--section .object-toggle-row[data-target=${f.properties?.uuid}] .toggle-switch input`).on('click', (e) => {
                    const uuid = e.currentTarget.getAttribute('data-target');
                    if (typeof uuid === 'string') {
                        this.toggleHandler(uuid);
                    }
                })
            }
        })
        this.renderInstructions();
    }

    drawUpdateCallback(event: {
        features: Array<GeoJSON.Feature>;
        action: 'move' | 'change_coordinates' | 'read';
    }) {
        event.features.forEach((f)=>{
            // Check if row exists
            const create_row = $(`.market_overlay--section .object-toggle-row[data-target=${f.properties?.uuid}]`).length === 0;
            if(create_row)
            {
                this.drawCreateCallback({features: [f]});
            } else {
                $(`.market_overlay--section .object-toggle-row[data-target=${f.properties?.uuid}] .label`).text(f.properties?.name);
            }
        });
    }

    drawDeleteCallback(event: { features: Array<GeoJSON.Feature> }) {
        event.features.forEach(f => {
            const uuid = f.properties?.uuid;
            if (uuid) {
                $(`.market_overlay--section .object-toggle-row[data-target=${uuid}]`).remove();
            }
        })
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
        })
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

    private updateFeatureVisibility(uuid: string): void {
        const feat = this.draw.getAll().features.find(f => f.properties?.uuid === uuid);
        if (feat) {
            if (feat.properties?.hidden === undefined) {
                this.draw.setFeatureProperty(feat?.id as string, 'hidden', 'true');
                const new_feat = this.draw.get(feat?.id as string);
                if (new_feat) {
                    this.draw.add(new_feat);
                }
            } else {
                this.draw.setFeatureProperty(feat?.id as string, 'hidden', undefined);
                const new_feat = this.draw.get(feat?.id as string);
                if (new_feat) {
                    this.draw.add(new_feat);
                }
            }
        }
    }

    private getCheckedStatus(WSFeature: BaseWorkspaceFeature) {
        return $(`#switch-user-layer-${WSFeature.workspaceId}`).prop('checked');
    }

    private toggleHandler = (uuid: string) => {
        this.updateFeatureVisibility(uuid);
    };

    private clickHandler = (uuid: string) => {
        const feature = BaseWorkspaceManager.getFeatureByUuid(uuid);
        const popup = BaseTowerPopup.getInstance();
        popup.hide();

        if (feature) {
            let coordinates;
            if (feature.getFeatureType() === WorkspaceFeatureTypes.COVERAGE_AREA ||
            feature.getFeatureType() === WorkspaceFeatureTypes.SECTOR) {
                let coverageArea = feature as CoverageArea;

                // @ts-ignore
                let polygonCentroid = centroid(coverageArea.getFeatureGeometry());
                coordinates = polygonCentroid.geometry.coordinates as [number, number];
            } else {
                let ap = feature as AccessPoint;
                coordinates = ap.getFeatureGeometryCoordinates() as [number, number];

                // Show tooltip if AP is visible
                if (this.getCheckedStatus(ap)) {
                    popup.setAccessPoint(ap);
                    popup.show();
                }
            }

            this.map.flyTo({
                center: coordinates
            });
        }
    };
}

