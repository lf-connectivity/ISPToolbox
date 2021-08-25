import * as MapboxGL from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { getStreetAndAddressInfo } from '../LinkCheckUtils';
import { MapboxSDKClient } from '../MapboxSDKClient';
import { TowerPaginationModal } from '../organisms/TowerPaginationModal';
import { SessionModal } from '../organisms/SessionModal';
import { getInitialFeatures } from '../utils/MapDefaults';
import { BaseWorkspaceFeature } from './BaseWorkspaceFeature';
import { WorkspaceEvents, WorkspaceFeatureTypes } from './WorkspaceConstants';
import { AccessPoint, CPE, APToCPELink, CoverageArea } from './WorkspaceFeatures';
import { MapLayerSidebarManager } from './MapLayerSidebarManager';
import { feature } from '@turf/turf';

type UpdateDeleteFeatureProcessor = (workspaceFeature: BaseWorkspaceFeature) => void | boolean;

function doNothingProcessor(): UpdateDeleteFeatureProcessor {
    return (workspaceFeature: BaseWorkspaceFeature) => {};
}

export const DEFAULT_AP_HEIGHT = 30.48;
export const DEFAULT_CPE_HEIGHT = 1.0;
export const DEFAULT_NO_CHECK_RADIUS = 0.01;
export const DEFAULT_AP_NAME = 'Unnamed AP';
export const DEFAULT_CPE_NAME = 'Unnamed CPE';

export abstract class BaseWorkspaceManager {
    map: MapboxGL.Map;
    draw: MapboxDraw;
    supportedFeatureTypes: Array<WorkspaceFeatureTypes>;
    readonly features: Map<string, BaseWorkspaceFeature>; // Map from workspace UUID to feature
    protected static _instance: BaseWorkspaceManager;

    // Event handlers for specific workspace feature types
    protected readonly saveFeatureDrawModeHandlers: { [mode: string]: (feature: any) => void };

    protected readonly updateFeatureAjaxHandlers: {
        [featureType in WorkspaceFeatureTypes]: {
            pre_update: UpdateDeleteFeatureProcessor;
            post_update: UpdateDeleteFeatureProcessor;
        };
    };

    protected readonly deleteFeaturePreAjaxHandlers: {
        [featureType in WorkspaceFeatureTypes]: UpdateDeleteFeatureProcessor;
    };

    private towerModal: TowerPaginationModal;
    private sessionModal: SessionModal;

    /**
     * Initializes a WorkspaceManager base object
     * @param map Map
     * @param draw Mapbox Draw
     * @param initialFeatures Initial features from DB
     * @param supportedFeatureTypes List of feature types to import
     */
    constructor(
        map: MapboxGL.Map,
        draw: MapboxDraw,
        supportedFeatureTypes: Array<WorkspaceFeatureTypes>
    ) {
        if (BaseWorkspaceManager._instance) {
            throw Error('BaseWorkspaceManager initialized twice.');
        }
        BaseWorkspaceManager._instance = this;

        this.map = map;
        this.draw = draw;

        this.towerModal = new TowerPaginationModal(this.map, this.draw);
        this.sessionModal = new SessionModal();

        this.features = new Map();
        this.supportedFeatureTypes = supportedFeatureTypes;

        this.saveFeatureDrawModeHandlers = {};
        this.initSaveFeatureHandlers();

        // Default update handlers are are just do nothings.
        let updateHandlers: any = {};
        Object.values(WorkspaceFeatureTypes).forEach((val: string) => {
            updateHandlers[val] = {
                pre_update: doNothingProcessor(),
                post_update: doNothingProcessor()
            };
        });
        this.updateFeatureAjaxHandlers = updateHandlers;
        this.initUpdateFeatureHandlers();

        // Default delete handlers are are just do nothings.
        let deleteHandlers: any = {};
        Object.values(WorkspaceFeatureTypes).forEach((val: string) => {
            deleteHandlers[val] = {
                pre_delete: doNothingProcessor(),
                post_delete: doNothingProcessor()
            };
        });
        this.deleteFeaturePreAjaxHandlers = deleteHandlers;
        this.initDeleteFeatureHandlers();

        let initialFeatures =
            getInitialFeatures() !== null ? getInitialFeatures().features : undefined;

        const addType = (
            featureType: WorkspaceFeatureTypes,
            featureClass: new (
                map: MapboxGL.Map,
                draw: MapboxDraw,
                feature: any
            ) => BaseWorkspaceFeature,
            preprocessFeature?: (feature: any) => void
        ) => {
            if (this.isSupportedFeatureType(featureType)) {
                this.filterByType(initialFeatures, featureType).forEach((feature: any) => {
                    if (preprocessFeature) {
                        preprocessFeature(feature);
                    }
                    let workspaceFeature = new featureClass(this.map, this.draw, feature);
                    this.features.set(workspaceFeature.workspaceId, workspaceFeature);
                });
            }
        };

        // Add initial features
        if (initialFeatures) {
            // APs, CPEs, and Coverage areas before PtP links
            addType(WorkspaceFeatureTypes.AP, AccessPoint, (feature: any) => {
                feature.properties.radius = feature.properties.max_radius;
                feature.properties.center = feature.geometry.coordinates;
            });

            addType(WorkspaceFeatureTypes.CPE, CPE);
            addType(WorkspaceFeatureTypes.COVERAGE_AREA, CoverageArea);

            if (supportedFeatureTypes.includes(WorkspaceFeatureTypes.AP_CPE_LINK)) {
                this.filterByType(initialFeatures, WorkspaceFeatureTypes.AP_CPE_LINK).forEach(
                    (feature: any) => {
                        let apWorkspaceId = feature.properties.ap;
                        let cpeWorkspaceId = feature.properties.cpe;
                        let ap = this.features.get(apWorkspaceId) as AccessPoint;
                        let cpe = this.features.get(cpeWorkspaceId) as CPE;
                        let workspaceFeature = new APToCPELink(
                            this.map,
                            this.draw,
                            feature,
                            ap,
                            cpe
                        );
                        ap.links.set(cpe, workspaceFeature);
                        cpe.ap = ap;
                        this.features.set(workspaceFeature.workspaceId, workspaceFeature);
                    }
                );
            }

            // Should probably be replaced with a pubsub event signal
            MapLayerSidebarManager.getInstance().setUserMapLayers();
        }

        // Instantiate CRUD
        this.map.on('draw.create', this.saveFeatures.bind(this));
        this.map.on('draw.delete', this.deleteFeatures.bind(this));
        this.map.on('draw.update', this.updateFeatures.bind(this));
    }

    /**
     * Initializes save feature handlers. Handlers are keyed on what draw mode
     * the user was in when the feature was created.
     *
     * Functions should be defined as such:
     *
     * ```
     * this.saveFeatureDrawModeHandlers.draw_mode = (feature: any) => void.
     * ```
     */
    protected initSaveFeatureHandlers(): void {}

    /**
     * Initializes update feature handlers. Handlers are keyed on feature type,
     * and are further separated by pre_update and post_update (before/after ajax call).
     *
     * Functions should be defined as such:
     *
     * ```
     * this.updateFeatureAjaxHandlers[WorkspaceFeatureTypes.FEATURE_TYPE].pre_update =
     * (workspaceFeature: BaseWorkspaceFeature) => void
     * ```
     * ```
     * this.updateFeatureAjaxHandlers[WorkspaceFeatureTypes.FEATURE_TYPE].post_update =
     * (workspaceFeature: BaseWorkspaceFeature) => void
     * ```
     */
    protected initUpdateFeatureHandlers(): void {}

    /**
     * Initializes update feature handlers. Handlers are keyed on feature type, and only
     * cover extra things done before deleting an object.
     *
     * Calls should be instantiated as such:
     *
     * ```
     * this.deleteFeaturePreAjaxHandlers[WorkspaceFeatureTypes.FEATURE_TYPE] =
     * (workspaceFeature: BaseWorkspaceFeature) => void
     * ```
     */
    protected initDeleteFeatureHandlers(): void {}

    filterByType(list: Array<any>, feat_type: WorkspaceFeatureTypes) {
        return list.filter((feat: any) => {
            return feat.properties && feat.properties.feature_type && feat.properties.uuid
                ? feat.properties.feature_type === feat_type
                : false;
        });
    }

    protected saveWorkspaceFeature(
        workspaceFeature: BaseWorkspaceFeature,
        successFollowup?: (resp: any) => void
    ) {
        workspaceFeature.create((resp: any) => {
            this.features.set(workspaceFeature.workspaceId, workspaceFeature);

            // Should probably be replaced with a pubsub event signal
            MapLayerSidebarManager.getInstance().setUserMapLayers();

            if (successFollowup) {
                successFollowup(resp);
            }
        });
    }

    protected isSupportedFeatureType(featureType: string | WorkspaceFeatureTypes) {
        // @ts-ignore
        return this.supportedFeatureTypes.indexOf(featureType) > -1;
    }

    protected saveFeatures({ features }: any) {
        const mode = String(this.draw.getMode());

        // Ignore features already saved in this.features
        const unsavedFeatures = features.filter((feature: any) => {
            return !feature.properties.uuid || !(feature.properties.uuid in this.features);
        });

        // Determine what to save based on draw mode.
        unsavedFeatures.forEach((feature: any) => {
            if (mode in this.saveFeatureDrawModeHandlers) {
                this.saveFeatureDrawModeHandlers[mode](feature);
            }
        });
    }

    /**
     * Callback for when user deletes mapbox draw feature in workspace
     * @param features - Array of geojson features
     */
    protected deleteFeatures({ features }: { features: Array<any> }) {
        const deleteFeaturesOfType = (featureType: WorkspaceFeatureTypes) => {
            if (this.isSupportedFeatureType(featureType)) {
                this.filterByType(features, featureType).forEach((feature: any) => {
                    let workspaceFeature = this.features.get(
                        feature.properties.uuid
                    ) as BaseWorkspaceFeature;

                    // Delete pre-ajax call stuff
                    let retval = this.deleteFeaturePreAjaxHandlers[featureType](workspaceFeature);

                    if (retval !== false) {
                        workspaceFeature.delete((resp) => {
                            this.features.delete(feature.properties.uuid);

                            // Should probably be replaced with a pubsub event signal
                            MapLayerSidebarManager.getInstance().setUserMapLayers();
                        });
                    }
                });
            }
        };

        // Delete links before everything else, to prevent random 404s.
        deleteFeaturesOfType(WorkspaceFeatureTypes.AP_CPE_LINK);
        deleteFeaturesOfType(WorkspaceFeatureTypes.AP);
        deleteFeaturesOfType(WorkspaceFeatureTypes.CPE);
        deleteFeaturesOfType(WorkspaceFeatureTypes.COVERAGE_AREA);
    }

    protected updateFeatures({
        features,
        action
    }: {
        features: Array<any>;
        action: 'move' | 'change_coordinates';
    }) {
        // We don't need to do updates by type in a certain order, so a switch
        // statement will do.
        features.forEach((feature: any) => {
            if (feature.properties.uuid) {
                let workspaceFeature = this.features.get(
                    feature.properties.uuid
                ) as BaseWorkspaceFeature;
                switch (feature.properties.feature_type) {
                    // Need to process CPEs differently
                    case WorkspaceFeatureTypes.CPE:
                        if (this.isSupportedFeatureType(WorkspaceFeatureTypes.CPE)) {
                            // Need to do this otherwise name change won't work.
                            let cpe = this.features.get(feature.properties.uuid) as CPE;
                            let mapboxClient = MapboxSDKClient.getInstance();
                            mapboxClient.reverseGeocode(
                                feature.geometry.coordinates,
                                (response: any) => {
                                    let result = response.body.features;
                                    let streetName = getStreetAndAddressInfo(
                                        result[0].place_name
                                    ).street;

                                    workspaceFeature.setFeatureProperty('name', streetName);

                                    let retval =
                                        this.updateFeatureAjaxHandlers[
                                            WorkspaceFeatureTypes.CPE
                                        ].pre_update(workspaceFeature);

                                    if (retval !== false) {
                                        cpe.update(() => {
                                            // Should probably be replaced with a pubsub event signal
                                            MapLayerSidebarManager.getInstance().setUserMapLayers();

                                            this.updateFeatureAjaxHandlers[
                                                WorkspaceFeatureTypes.CPE
                                            ].post_update(workspaceFeature);
                                        });
                                    }
                                }
                            );
                        }
                        break;

                    default:
                        if (this.isSupportedFeatureType(feature.properties.feature_type)) {
                            let retval =
                                // @ts-ignore
                                this.updateFeatureAjaxHandlers[
                                    feature.properties.feature_type
                                ].pre_update(workspaceFeature);

                            if (retval !== false) {
                                workspaceFeature.update(() => {
                                    // Should probably be replaced with a pubsub event signal
                                    MapLayerSidebarManager.getInstance().setUserMapLayers();

                                    // @ts-ignore
                                    this.updateFeatureAjaxHandlers[
                                        feature.properties.feature_type
                                    ].post_update(workspaceFeature);
                                });
                            }
                        }
                        break;
                }
            }
        });
    }

    static getInstance(): BaseWorkspaceManager {
        if (BaseWorkspaceManager._instance) {
            return BaseWorkspaceManager._instance;
        } else {
            throw new Error('No Instance of BaseWorkspaceManager instantiated.');
        }
    }

    static getFeatures(feature_type?: WorkspaceFeatureTypes) {
        let features = Array.from(BaseWorkspaceManager.getInstance().features.values());
        if (!feature_type) {
            return features;
        } else {
            return features.filter(
                (feature: BaseWorkspaceFeature) => feature.getFeatureType() === feature_type
            );
        }
    }

    static getFeatureByUuid(uuid: string) {
        return BaseWorkspaceManager.getInstance().features.get(uuid) as BaseWorkspaceFeature;
    }
}
