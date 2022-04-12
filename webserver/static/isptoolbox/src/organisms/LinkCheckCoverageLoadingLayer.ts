import { Feature, Geometry, Point } from 'geojson';
import mapboxgl from 'mapbox-gl';
import { isBeta } from '../LinkCheckUtils';
import { BaseWorkspaceManager } from '../workspace/BaseWorkspaceManager';
import {
    AccessPointCoverageResponse,
    AccessPointCoverageResponseStatus,
    LOSWSEvents,
    ViewshedProgressResponse,
    WorkspaceFeatureTypes
} from '../workspace/WorkspaceConstants';
import { AccessPointSector } from '../workspace/WorkspaceSectorFeature';
import { BUILDING_OUTLINE_LAYER } from './RadiusAndBuildingCoverageRenderer';

const SIZE = 100;
const loadingSpinner = {
    width: SIZE,
    height: SIZE,
    data: new Uint8Array(SIZE * SIZE * 4),

    // When the layer is added to the map,
    // get the rendering context for the map canvas.
    onAdd: function (map: mapboxgl.Map) {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        this.context = canvas.getContext('2d');

        this.map = map;
    },

    render: function () {
        const duration = 1500;
        const t = (performance.now() % duration) / duration;
        const theta = 2 * Math.PI * t;

        const radius = (SIZE / 2) * 0.6;
        const context = this.context;

        // Gradient from one corner of the circle to opposite corner of circle
        // white to transparent
        let gradient = context.createLinearGradient(
            this.width / 2 + radius * Math.cos(theta),
            this.height / 2 + radius * Math.sin(theta),
            this.width / 2 + radius * Math.cos(Math.PI + theta),
            this.height / 2 + radius * Math.sin(Math.PI + theta)
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0');
        gradient.addColorStop(1, 'rgba(245, 244, 244, 1');

        // Loading screen arc
        context.clearRect(0, 0, this.width, this.height);
        context.beginPath();
        context.arc(this.width / 2, this.height / 2, radius, 0, Math.PI * 2);
        context.strokeStyle = gradient;
        context.lineWidth = 11;
        context.stroke();

        // Update this image's data with data from the canvas.
        this.data = context.getImageData(0, 0, this.width, this.height).data;

        // Continuously repaint the map, resulting
        // in the smooth animation of the dot.
        this.map.triggerRepaint();

        // Return `true` to let the map know that the image was updated.
        return true;
    }
};

const COVERAGE_LOADING_SOURCE = 'coverage-loading-source';
const COVERAGE_LOADING_LAYER = 'coverage-loading-layer';
const IMAGE_NAME = 'loading-spinner';

export class LinkCheckCoverageLoadingLayer {
    map: mapboxgl.Map;
    private static _instance: LinkCheckCoverageLoadingLayer;

    private sectorsLoading: Set<string>;

    constructor(map: mapboxgl.Map) {
        if (LinkCheckCoverageLoadingLayer._instance) {
            throw new Error('Already have LinkCheckCoverageLoadingLayer instantiated');
        }

        this.map = map;
        this.map.addImage(IMAGE_NAME, loadingSpinner, { pixelRatio: 2 });
        this.sectorsLoading = new Set();

        this.map.addSource(COVERAGE_LOADING_SOURCE, {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });

        this.map.addLayer(
            {
                id: COVERAGE_LOADING_LAYER,
                type: 'symbol',
                source: COVERAGE_LOADING_SOURCE,
                layout: {
                    'icon-image': IMAGE_NAME,
                    'icon-ignore-placement': true,
                    'icon-allow-overlap': true
                }
            },
            BUILDING_OUTLINE_LAYER
        );

        PubSub.subscribe(LOSWSEvents.VIEWSHED_PROGRESS_MSG, this.onCoverageStartLoad.bind(this));
        PubSub.subscribe(LOSWSEvents.AP_MSG, this.onCoverageFinishLoad.bind(this));

        LinkCheckCoverageLoadingLayer._instance = this;
    }

    private updateCoverageLayer() {
        let towerFeatures: Array<Feature<Geometry, any>> = [];
        this.sectorsLoading.forEach((uuid: string) => {
            let feature = BaseWorkspaceManager.getFeatureByUuid(uuid) as AccessPointSector;
            towerFeatures.push((feature as AccessPointSector).ap.getFeatureData());
        });

        const loadingSource = this.map.getSource(COVERAGE_LOADING_SOURCE);
        if (loadingSource.type === 'geojson') {
            const fc: GeoJSON.FeatureCollection = {
                type: 'FeatureCollection',
                features: towerFeatures
            };
            loadingSource.setData(fc);
        }
    }

    private onCoverageStartLoad(msg: string, data: ViewshedProgressResponse) {
        if (isBeta()) {
            // Only consider sector loading, not tower loading
            if (!this.sectorsLoading.has(data.uuid)) {
                let feature = BaseWorkspaceManager.getFeatureByUuid(data.uuid);
                if (feature.getFeatureType() === WorkspaceFeatureTypes.SECTOR) {
                    this.sectorsLoading.add(data.uuid);
                    this.updateCoverageLayer();
                }
            }
        }
    }

    private onCoverageFinishLoad(msg: string, data: AccessPointCoverageResponse) {
        if (isBeta()) {
            if (
                data.status === AccessPointCoverageResponseStatus.COMPLETED &&
                this.sectorsLoading.delete(data.uuid)
            ) {
                this.updateCoverageLayer();
            }
        }
    }

    static getInstance() {
        return LinkCheckCoverageLoadingLayer._instance;
    }
}
