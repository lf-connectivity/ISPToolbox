import mapboxgl, * as MapboxGL from "mapbox-gl";
import { Feature, Geometry, Point, LineString, GeoJsonProperties, Polygon }  from 'geojson';
import { getStreetAndAddressInfo } from "../LinkCheckUtils";
import { MapboxSDKClient } from "../MapboxSDKClient";
import { getInitialFeatures } from "../utils/MapDefaults";
import { BaseWorkspaceFeature } from "./BaseWorkspaceFeature";
import { WorkspaceFeatureTypes } from "./WorkspaceConstants";
import { AccessPoint, CPE, APToCPELink, CoverageArea } from "./WorkspaceFeatures";

type UpdateDeleteFeatureProcessor = (workspaceFeature: BaseWorkspaceFeature) => void;

function doNothingProcessor(): UpdateDeleteFeatureProcessor {
    return (workspaceFeature: BaseWorkspaceFeature) => {};
}

export abstract class BaseWorkspaceManager {
    map: MapboxGL.Map;
    draw: MapboxDraw;
    supportedFeatureTypes: Array<WorkspaceFeatureTypes>;
    readonly features: { [workspaceId: string] : BaseWorkspaceFeature}; // Map from workspace UUID to feature

    // Event handlers for specific workspace feature types
    protected readonly saveFeatureDrawModeHandlers: {[mode: string]: (feature: any) => void};

    protected readonly updateFeatureAjaxHandlers: {
        [featureType in WorkspaceFeatureTypes]: {
            pre_update: UpdateDeleteFeatureProcessor,
            post_update: UpdateDeleteFeatureProcessor
        }
    };

    // Haven't seen a need for post-ajax handlers for delete feature just yet :)
    protected readonly deleteFeaturePreAjaxHandlers: {[featureType in WorkspaceFeatureTypes]: UpdateDeleteFeatureProcessor};

    /**
     * Initializes a WorkspaceManager base object
     * @param map Map
     * @param draw Mapbox Draw
     * @param initialFeatures Initial features from DB
     * @param supportedFeatureTypes List of feature types to import
     */
    constructor(map: MapboxGL.Map, draw: MapboxDraw, supportedFeatureTypes: Array<WorkspaceFeatureTypes>) {
        this.map = map;
        this.draw = draw;

        this.features = {};
        this.supportedFeatureTypes = supportedFeatureTypes;

        this.saveFeatureDrawModeHandlers = {};
        this.initSaveFeatureHandlers();

        // Default update handlers are are just do nothings.
        let updateHandlers: any = {};
        Object.values(WorkspaceFeatureTypes).forEach((val: string) => {
            updateHandlers[val] = {
                pre_update: doNothingProcessor(),
                post_update: doNothingProcessor()
            }
        });
        this.updateFeatureAjaxHandlers = updateHandlers;
        this.initUpdateFeatureHandlers();

        // Default delete handlers are are just do nothings.
        let deleteHandlers: any = {};
        Object.values(WorkspaceFeatureTypes).forEach((val: string) => {
            deleteHandlers[val] = doNothingProcessor()
        });
        this.deleteFeaturePreAjaxHandlers = deleteHandlers;
        this.initDeleteFeatureHandlers();

        let initialFeatures = getInitialFeatures().features;
        console.log(getInitialFeatures());

        const addType = (featureType: WorkspaceFeatureTypes,
                         featureClass: new (map: MapboxGL.Map, draw: MapboxDraw, feature: any) => BaseWorkspaceFeature,
                         preprocessFeature ?: (feature: any) => void) => {
            if (this.isSupportedFeatureType(featureType)) {
                this.filterByType(initialFeatures, featureType).forEach((feature: any) => {
                    if (preprocessFeature) {
                        preprocessFeature(feature);
                    }
                    let workspaceFeature = new featureClass(this.map, this.draw, feature);
                    this.features[workspaceFeature.workspaceId] = workspaceFeature;
                });
            }
        }

        // Add initial features
        if (initialFeatures) {
            // APs, CPEs, and Coverage areas before PtP links
            addType(WorkspaceFeatureTypes.AP, AccessPoint, (feature: any) => {
                feature.properties.radius = feature.properties.max_radius;
                feature.properties.center = feature.geometry.coordinates;
            });

            addType(WorkspaceFeatureTypes.CPE, CPE);
            addType(WorkspaceFeatureTypes.COVERAGE_AREA, CoverageArea);

            if (WorkspaceFeatureTypes.AP_CPE_LINK in supportedFeatureTypes) {
                this.filterByType(initialFeatures, WorkspaceFeatureTypes.AP_CPE_LINK).forEach((feature: any) => {
                    let apWorkspaceId = feature.properties.ap;
                    let cpeWorkspaceId = feature.properties.cpe;
                    let ap = this.features[apWorkspaceId] as AccessPoint;
                    let cpe = this.features[cpeWorkspaceId] as CPE;
                    let workspaceFeature = new APToCPELink(this.map, this.draw, feature, ap, cpe);
                    ap.links.set(cpe, workspaceFeature);
                    cpe.ap = ap;
                    this.features[workspaceFeature.workspaceId] = workspaceFeature;
                });
            }
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
            return (feat.properties && feat.properties.feature_type && feat.properties.uuid) ?
                feat.properties.feature_type === feat_type : false;
        });
    }

    protected saveWorkspaceFeature(workspaceFeature: BaseWorkspaceFeature, successFollowup ?: (resp: any) => void) {
        workspaceFeature.create((resp: any) => {
            this.features[workspaceFeature.workspaceId] = workspaceFeature;
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
            return (!feature.properties.uuid || !(feature.properties.uuid in this.features));
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
                    let workspaceFeature = this.features[feature.properties.uuid];
    
                    // Delete pre-ajax call stuff
                    this.deleteFeaturePreAjaxHandlers[featureType](workspaceFeature);
    
                    workspaceFeature.delete((resp) => {
                        delete this.features[feature.properties.uuid];
                    });
                });
            }
        }

        // Delete links before everything else, to prevent random 404s.
        deleteFeaturesOfType(WorkspaceFeatureTypes.AP_CPE_LINK);
        deleteFeaturesOfType(WorkspaceFeatureTypes.AP);
        deleteFeaturesOfType(WorkspaceFeatureTypes.CPE);
        deleteFeaturesOfType(WorkspaceFeatureTypes.COVERAGE_AREA);
    }

    protected updateFeatures({ features, action }: { features: Array<any>, action: 'move' | 'change_coordinates' }) {
        // We don't need to do updates by type in a certain order, so a switch
        // statement will do.
        features.forEach((feature: any) => {
            if (feature.properties.uuid) {
                let workspaceFeature = this.features[feature.properties.uuid];
                switch(feature.properties.feature_type) {
                    // Need to process CPEs differently
                    case WorkspaceFeatureTypes.CPE:
                        if (this.isSupportedFeatureType(WorkspaceFeatureTypes.CPE)) {
                            // Need to do this otherwise name change won't work.
                            let cpe = this.features[feature.properties.uuid] as CPE;
                            let mapboxClient = MapboxSDKClient.getInstance();
                            mapboxClient.reverseGeocode(feature.geometry.coordinates, (response: any) => {
                                let result = response.body.features;
                                feature.properties.name = getStreetAndAddressInfo(result[0].place_name).street;

                                this.updateFeatureAjaxHandlers[WorkspaceFeatureTypes.CPE].pre_update(workspaceFeature);
                                cpe.update(() => {
                                    this.updateFeatureAjaxHandlers[WorkspaceFeatureTypes.CPE].post_update(workspaceFeature);
                                });
                            });
                        }
                        break;
                    
                    default:
                        if (this.isSupportedFeatureType(feature.properties.feature_type)) {
                            // @ts-ignore
                            this.updateFeatureAjaxHandlers[feature.properties.feature_type].pre_update(workspaceFeature);
                            workspaceFeature.update(() => {
                                // @ts-ignore
                                this.updateFeatureAjaxHandlers[feature.properties.feature_type].post_update(workspaceFeature);
                            })
                        }
                        break;
                }
            }
        });
    }
}