import * as MapboxGL from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { BaseWorkspaceFeature } from './BaseWorkspaceFeature';
import { generateMapLayerSidebarRow } from '../atoms/MapLayerSidebarRow';
import { WorkspaceFeatureTypes, WorkspaceEvents } from './WorkspaceConstants';
import centroid from '@turf/centroid';

export class MapLayerSidebarManager {
    hiddenAccessPointIds: Array<string>;
    hiddenCoverageAreas: { [workspaceId: string]: BaseWorkspaceFeature };
    map: MapboxGL.Map;
    draw: MapboxDraw;
    initialFeatures: Array<any>;
    features: { [workspaceId: string]: BaseWorkspaceFeature };

    constructor(map: MapboxGL.Map, draw: MapboxDraw) {
        this.hiddenAccessPointIds = [];
        this.hiddenCoverageAreas = {};
        this.map = map;
        this.draw = draw;
        this.features = {};
        this.initialFeatures = [];
    }

    setInitialFeatures(
        initialFeatures: Array<any>,
        features: { [workspaceId: string]: BaseWorkspaceFeature }
    ) {
        this.initialFeatures = initialFeatures;
        this.features = features;
    }

    createUserMapLayers() {
        // add building objects to sidebar
        let mapObjectsSection = document.getElementById('map-objects-section');
        let polygonCounter = 1;

        this.initialFeatures.forEach((feature: any) => {
            let objectLabel;
            if (feature.geometry.type === 'Point') {
                objectLabel = feature.properties.name;
            } else {
                objectLabel = 'Area ' + polygonCounter;
                polygonCounter++;
            }

            const elem = generateMapLayerSidebarRow(
                feature,
                objectLabel,
                this.clickHandler,
                this.toggleHandler
            );
            mapObjectsSection!.appendChild(elem);
        });
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
        const WSFeature = this.features[uuid];
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

    private clickHandler = (uuid: String) => {
        const feature = this.initialFeatures.find(
            (feature: any) => feature.properties.uuid === uuid
        );
        if (feature) {
            let coordinates = feature.geometry.coordinates;
            if (feature.geometry.type === 'Polygon') {
                let polygonCentroid = centroid(feature.geometry);
                coordinates = polygonCentroid.geometry.coordinates;
            }
            // POSSIBLE TODO - Select tower on fly to?
            this.map.flyTo({
                center: coordinates
            });
        }
    };
}
