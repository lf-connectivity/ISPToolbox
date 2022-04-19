import * as MapboxGL from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { getStreetAndAddressInfo } from '../LinkCheckUtils';
import { MapboxSDKClient } from '../MapboxSDKClient';
import { getInitialFeatures } from '../utils/MapDefaults';
import { BaseWorkspaceFeature } from './BaseWorkspaceFeature';
import { WorkspaceFeatureTypes } from './WorkspaceConstants';
import {
    AccessPoint,
    CPE,
    APToCPELink,
    CoverageArea,
    PointToPointLink,
    isAP
} from './WorkspaceFeatures';
import { IMapboxDrawPlugin, initializeMapboxDrawInterface } from '../utils/IMapboxDrawPlugin';
import { AccessPointSector } from './WorkspaceSectorFeature';
import { CRUDEvent } from '../utils/IIspToolboxAjaxPlugin';

type UpdateDeleteFeatureProcessor = (workspaceFeature: BaseWorkspaceFeature) => void | boolean;

function doNothingProcessor(): UpdateDeleteFeatureProcessor {
    return (workspaceFeature: BaseWorkspaceFeature) => {};
}

enum CRUDOperation {
    CREATE = 1,
    READ,
    UPDATE,
    DELETE
}

export abstract class BaseWorkspaceManager implements IMapboxDrawPlugin {
    map: MapboxGL.Map;
    draw: MapboxDraw;
    previousState: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
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
        initializeMapboxDrawInterface(this, map);
        BaseWorkspaceManager._instance = this;

        this.map = map;
        this.draw = draw;


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
            deleteHandlers[val] = doNothingProcessor();
        });
        this.deleteFeaturePreAjaxHandlers = deleteHandlers;
        this.initDeleteFeatureHandlers();

        let initialFeatures =
            getInitialFeatures() !== null ? getInitialFeatures().features : undefined;

        // Add initial features
        if (initialFeatures) {
            this.addFeatures(initialFeatures);
        }
        this.previousState = this.draw.getAll();
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
            
            this.acceptNewState();
            if (successFollowup) {
                successFollowup(resp);
            }
        });
    }

    protected isSupportedFeatureType(featureType: string | WorkspaceFeatureTypes) {
        // @ts-ignore
        return this.supportedFeatureTypes.indexOf(featureType) > -1;
    }

    drawCreateCallback(event: { features: Array<GeoJSON.Feature> }) {
        const mode = String(this.draw.getMode());

        // Ignore features already saved in this.features
        const unsavedFeatures = event.features.filter((feature: any) => {
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
    drawDeleteCallback(event: { features: Array<GeoJSON.Feature> }) {
        const deleteFeaturesOfType = (featureType: WorkspaceFeatureTypes) => {
            if (this.isSupportedFeatureType(featureType)) {
                this.filterByType(event.features, featureType).forEach((feature: any) => {
                    let workspaceFeature = this.features.get(
                        feature.properties.uuid
                    ) as BaseWorkspaceFeature;
                    
                    // Delete pre-ajax call stuff
                    let retval = this.deleteFeaturePreAjaxHandlers[featureType](workspaceFeature);
                    if (retval !== false) {
                        workspaceFeature.delete(
                            (resp) => {
                                this.features.delete(feature.properties.uuid);
                                this.acceptNewState();
                                BaseWorkspaceFeature.fire(CRUDEvent.DELETE, {features: [feature]})
                            },
                            () => {
                                this.revertOperation(event.features, CRUDOperation.DELETE);
                            }
                        );
                    }
                });
            }
        };

        // Delete links before everything else, to prevent random 404s.
        deleteFeaturesOfType(WorkspaceFeatureTypes.AP_CPE_LINK);
        deleteFeaturesOfType(WorkspaceFeatureTypes.SECTOR);
        deleteFeaturesOfType(WorkspaceFeatureTypes.AP);
        deleteFeaturesOfType(WorkspaceFeatureTypes.CPE);
        deleteFeaturesOfType(WorkspaceFeatureTypes.COVERAGE_AREA);
    }

    drawUpdateCallback(event: {
        features: Array<GeoJSON.Feature>;
        action: 'move' | 'change_coordinates' | 'read';
    }) {
        if(event.action === 'read'){return;}
        // We don't need to do updates by type in a certain order, so a switch
        // statement will do.
        event.features.forEach((feature: any) => {
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
                            // ?????
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
                                        cpe.update(
                                            () => {
                                                this.acceptNewState();
                                                this.updateFeatureAjaxHandlers[
                                                    WorkspaceFeatureTypes.CPE
                                                ].post_update(workspaceFeature);
                                            },
                                            () => {
                                                this.revertOperation(
                                                    event.features,
                                                    CRUDOperation.UPDATE
                                                );
                                            }
                                        );
                                    }
                                },
                                (error: any) => {
                                    renderAjaxOperationFailed();
                                    this.revertOperation(event.features, CRUDOperation.UPDATE);
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
                                workspaceFeature.update(
                                    () => {
                                        // @ts-ignore
                                        this.updateFeatureAjaxHandlers[
                                            feature.properties.feature_type
                                        ].post_update(workspaceFeature);
                                        this.acceptNewState();
                                    },
                                    () => {
                                        this.revertOperation(event.features, CRUDOperation.UPDATE);
                                    }
                                );
                            }
                        }
                        break;
                }
            }
        });
    }

    acceptNewState() {
        this.previousState = this.draw.getAll();
    }

    revertOperation(features: Array<GeoJSON.Feature>, operation: CRUDOperation) {
        features.forEach((revert_f) => {
            const feat = this.previousState.features.find((f) => f.id === revert_f.id);
            switch (operation) {
                case CRUDOperation.CREATE:
                    if (revert_f?.id) this.draw.delete(String(revert_f?.id));
                    break;
                case CRUDOperation.READ:
                    break;
                case CRUDOperation.UPDATE:
                    if (feat) this.draw.add(feat);
                    break;
                case CRUDOperation.DELETE:
                    if (feat) this.draw.add(feat);
                    break;
            }
        });
    }

    protected addFeatures(features: any) {
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
                this.filterByType(features, featureType).forEach((feature: any) => {
                    if (preprocessFeature) {
                        preprocessFeature(feature);
                    }
                    let workspaceFeature = new featureClass(this.map, this.draw, feature);
                    this.features.set(workspaceFeature.workspaceId, workspaceFeature);
                });
            }
        };

        // APs, CPEs, and Coverage areas before PtP links and coverage areas
        addType(WorkspaceFeatureTypes.AP, AccessPoint, (feature: any) => {
            feature.properties.radius = feature.properties.max_radius;
            feature.properties.center = feature.geometry.coordinates;
        });
        addType(WorkspaceFeatureTypes.PTP_LINK, PointToPointLink);
        addType(WorkspaceFeatureTypes.CPE, CPE);
        addType(WorkspaceFeatureTypes.COVERAGE_AREA, CoverageArea);
        addType(WorkspaceFeatureTypes.SECTOR, AccessPointSector);

        if (this.supportedFeatureTypes.includes(WorkspaceFeatureTypes.AP_CPE_LINK)) {
            this.filterByType(features, WorkspaceFeatureTypes.AP_CPE_LINK).forEach(
                (feature: any) => {
                    let apWorkspaceId = feature.properties.ap || feature.properties.sector;
                    let cpeWorkspaceId = feature.properties.cpe;
                    let ap = this.features.get(apWorkspaceId) as AccessPoint | AccessPointSector;
                    let cpe = this.features.get(cpeWorkspaceId) as CPE;
                    let workspaceFeature = new APToCPELink(this.map, this.draw, feature, ap, cpe);
                    ap.links.set(cpe, workspaceFeature);
                    if (isAP(ap)) {
                        cpe.ap = ap;
                    } else {
                        cpe.sector = ap;
                    }
                    this.features.set(workspaceFeature.workspaceId, workspaceFeature);
                }
            );
        }
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

    static refresh_by_uuid(uuid: string){
        const feat = this.getFeatureByUuid(uuid);
        if(feat)
            feat.read();
    }

    static delete_by_uuid(uuid: string){
        const feat = this.getFeatureByUuid(uuid);
        if(feat)
            feat.delete();
    }

    static create_by_uuid(uuid: string){
        console.log(uuid);
    }
}
