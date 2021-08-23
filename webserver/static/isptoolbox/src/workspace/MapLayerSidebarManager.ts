import * as MapboxGL from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { BaseWorkspaceFeature } from './BaseWorkspaceFeature';
import { generateMapLayerSidebarRow } from '../atoms/MapLayerSidebarRow';
import { WorkspaceFeatureTypes, WorkspaceEvents } from './WorkspaceConstants';
import centroid from '@turf/centroid';
import { BaseWorkspaceManager } from './BaseWorkspaceManager';
import { AccessPoint, CoverageArea } from './WorkspaceFeatures';

export class MapLayerSidebarManager {
    hiddenAccessPointIds: Array<string>;
    hiddenCoverageAreas: { [workspaceId: string]: BaseWorkspaceFeature };
    map: MapboxGL.Map;
    draw: MapboxDraw;
    protected static _instance: MapLayerSidebarManager;

    constructor(map: MapboxGL.Map, draw: MapboxDraw) {
        if (MapLayerSidebarManager._instance) {
            throw Error('Already defined');
        }

        MapLayerSidebarManager._instance = this;
        this.hiddenAccessPointIds = [];
        this.hiddenCoverageAreas = {};
        this.map = map;
        this.draw = draw;
    }

    setUserMapLayers() {
        // add building objects to sidebar
        let mapObjectsSection = document.getElementById('map-objects-section');
        let polygonCounter = 1;

        while (mapObjectsSection?.firstChild) {
            mapObjectsSection.removeChild(mapObjectsSection.firstChild);
        }

        // Towers, then coverage areas
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
                const elem = generateMapLayerSidebarRow(
                    coverage.getFeatureData(),
                    'Area ' + polygonCounter,
                    this.clickHandler,
                    this.toggleHandler
                );
                mapObjectsSection!.appendChild(elem);
                polygonCounter++;
            }
        );
    }

    static getInstance(): MapLayerSidebarManager {
        if (MapLayerSidebarManager._instance) {
            return MapLayerSidebarManager._instance;
        } else {
            throw new Error('No Instance of MapLayerSidebarManager instantiated.');
        }
    }

    private updateCoverageAreaVisibility = (MBFeature: any, WSFeature: any) => {
        if (!MBFeature) {
            const MBFeature = this.hiddenCoverageAreas[WSFeature.mapboxId];
            //@ts-ignore
            this.draw.add(MBFeature);
            delete this.hiddenCoverageAreas[WSFeature.uuid];
        } else {
            this.hiddenCoverageAreas[WSFeature.mapboxId] = MBFeature;
            this.draw.delete(MBFeature.id);
        }
    };

    private updateAPVisibility = (MBFeature: any, WSFeature: any) => {
        let id = String(MBFeature?.id);

        if (this.hiddenAccessPointIds.includes(id)) {
            let i = this.hiddenAccessPointIds.indexOf(id);
            if (i > -1) {
                this.hiddenAccessPointIds.splice(i, 1);
            }
        } else {
            this.hiddenAccessPointIds = [...this.hiddenAccessPointIds, id];
        }

        PubSub.publish(WorkspaceEvents.AP_UPDATE, { features: [WSFeature] });
    };

    private toggleHandler = (e: any, uuid: string) => {
        const WSFeature = BaseWorkspaceManager.getInstance().features[uuid];
        if (WSFeature) {
            var MBFeature = this.draw.get(WSFeature.mapboxId);
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
        const feature = BaseWorkspaceManager.getInstance().features[uuid];
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
            }
            // POSSIBLE TODO - Select tower on fly to?
            this.map.flyTo({
                center: coordinates
            });
        }
    };
}
