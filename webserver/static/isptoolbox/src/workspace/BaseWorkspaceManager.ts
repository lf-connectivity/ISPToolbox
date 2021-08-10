import { divide } from 'lodash';
import * as MapboxGL from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { getStreetAndAddressInfo } from '../LinkCheckUtils';
import { MapboxSDKClient } from '../MapboxSDKClient';
import { getInitialFeatures } from '../utils/MapDefaults';
import { BaseWorkspaceFeature } from './BaseWorkspaceFeature';
import { WorkspaceFeatureTypes } from './WorkspaceConstants';
import { AccessPoint, CPE, APToCPELink, CoverageArea } from './WorkspaceFeatures';

type UpdateDeleteFeatureProcessor = (workspaceFeature: BaseWorkspaceFeature) => void;

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
    readonly features: { [workspaceId: string]: BaseWorkspaceFeature }; // Map from workspace UUID to feature

    // Event handlers for specific workspace feature types
    protected readonly saveFeatureDrawModeHandlers: { [mode: string]: (feature: any) => void };

    protected readonly updateFeatureAjaxHandlers: {
        [featureType in WorkspaceFeatureTypes]: {
            pre_update: UpdateDeleteFeatureProcessor;
            post_update: UpdateDeleteFeatureProcessor;
        };
    };

    // Haven't seen a need for post-ajax handlers for delete feature just yet :)
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

        let initialFeatures = getInitialFeatures().features;

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
                    this.features[workspaceFeature.workspaceId] = workspaceFeature;
                });
            }
        };

        // new MapboxDraw({
        //     userProperties: true,
        //     displayControlsDefault: true,
        // });

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
                this.filterByType(initialFeatures, WorkspaceFeatureTypes.AP_CPE_LINK).forEach(
                    (feature: any) => {
                        let apWorkspaceId = feature.properties.ap;
                        let cpeWorkspaceId = feature.properties.cpe;
                        let ap = this.features[apWorkspaceId] as AccessPoint;
                        let cpe = this.features[cpeWorkspaceId] as CPE;
                        let workspaceFeature = new APToCPELink(
                            this.map,
                            this.draw,
                            feature,
                            ap,
                            cpe
                        );
                        ap.links.set(cpe, workspaceFeature);
                        cpe.ap = ap;
                        this.features[workspaceFeature.workspaceId] = workspaceFeature;
                    }
                );
            }
            // add building objects to sidebar
            const clickHandler = (uuid: String) => {
                const feature = initialFeatures.find(
                    (feature: any) => feature.properties.uuid === uuid
                );
                let coordinates = feature.geometry.coordinates;
                if (feature.geometry.type === 'Polygon') {
                    coordinates = feature.geometry.coordinates[0][0];
                }
                this.map.flyTo({
                    center: coordinates
                });
            };

            const toggleHandler = (e: any, uuid: string) => {
                console.log('running click handler', e.target);
                const feature = this.features[uuid];

                this.draw.setFeatureProperty(feature.mapboxId, 'opacity', '0');
                this.draw.setFeatureProperty(feature.mapboxId, 'opacity', 0);
                var feat = this.draw.get(feature.mapboxId);
                console.log('feat', feat);
                //@ts-ignore
                // draw.add(feat);
                // if (feature) {
                //     this.draw.delete(feature.mapboxId);
                //     this.map.fire('draw.delete', { features: [feature] });
                // } else {
                //     // create new layer on map
                // }
            };

            const objectImgIcons: any = {
                Polygon: `<svg width="14" height="15" viewBox="0 0 14 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.644 0.96875L1.16968 5.08165L7.35908 7.98491L6.40688 14.0333L12.8344 9.43652L11.644 0.96875Z" fill="#5692D1" fill-opacity="0.3" stroke="#5692D1"/>
                </svg>`,
                Point: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clip-path="url(#clip0)">
                <path d="M7.00008 13.7096C10.705 13.7096 13.7084 10.7062 13.7084 7.0013C13.7084 3.29639 10.705 0.292969 7.00008 0.292969C3.29517 0.292969 0.291748 3.29639 0.291748 7.0013C0.291748 10.7062 3.29517 13.7096 7.00008 13.7096Z" fill="#C2D8EC" stroke="#5692D1" stroke-width="0.958333"/>
                <path d="M6.99992 8.16536C7.64425 8.16536 8.16658 7.64303 8.16658 6.9987C8.16658 6.35437 7.64425 5.83203 6.99992 5.83203C6.35559 5.83203 5.83325 6.35437 5.83325 6.9987C5.83325 7.64303 6.35559 8.16536 6.99992 8.16536Z" fill="#5692D1"/>
                </g>
                <defs>
                <clipPath id="clip0">
                <rect width="14" height="14" fill="white"/>
                </clipPath>
                </defs>
                </svg>                
                `
            };

            const createObjectRow = (feature: any, objectLabel: string) => {
                let elem = document.createElement('div');
                elem.classList.add('object-toggle-row');

                let icon = document.createElement('span');
                icon.innerHTML = objectImgIcons[feature.geometry.type];
                elem.appendChild(icon);

                let label = document.createElement('span');
                label.classList.add('label');
                label.innerHTML = objectLabel;
                label.addEventListener('click', () => {
                    clickHandler(feature.properties.uuid);
                });
                elem.appendChild(label);

                // create toggle button
                let toggle = document.createElement('label');
                toggle.classList.add('toggle-switch');

                toggle.innerHTML = `<input type='checkbox' checked />`;
                let slider = document.createElement('div');
                slider.classList.add('slider');
                slider.addEventListener('click', (e) => toggleHandler(e, feature.properties.uuid));
                toggle.appendChild(slider);

                elem.appendChild(toggle);

                return elem;
            };

            let mapObjectsSection = document.getElementById('map-objects-section');

            let polygonCounter = 1;
            initialFeatures.forEach((feature: any) => {
                let objectLabel;
                if (feature.geometry.type === 'Point') {
                    objectLabel = feature.properties.name;
                } else {
                    objectLabel = 'Shape ' + polygonCounter;
                    polygonCounter++;
                }

                const elem = createObjectRow(feature, objectLabel);
                mapObjectsSection!.appendChild(elem);
            });
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
                    let workspaceFeature = this.features[feature.properties.uuid];

                    // Delete pre-ajax call stuff
                    this.deleteFeaturePreAjaxHandlers[featureType](workspaceFeature);

                    workspaceFeature.delete((resp) => {
                        delete this.features[feature.properties.uuid];
                    });
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
                let workspaceFeature = this.features[feature.properties.uuid];
                switch (feature.properties.feature_type) {
                    // Need to process CPEs differently
                    case WorkspaceFeatureTypes.CPE:
                        if (this.isSupportedFeatureType(WorkspaceFeatureTypes.CPE)) {
                            // Need to do this otherwise name change won't work.
                            let cpe = this.features[feature.properties.uuid] as CPE;
                            let mapboxClient = MapboxSDKClient.getInstance();
                            mapboxClient.reverseGeocode(
                                feature.geometry.coordinates,
                                (response: any) => {
                                    let result = response.body.features;
                                    feature.properties.name = getStreetAndAddressInfo(
                                        result[0].place_name
                                    ).street;

                                    this.updateFeatureAjaxHandlers[
                                        WorkspaceFeatureTypes.CPE
                                    ].pre_update(workspaceFeature);
                                    cpe.update(() => {
                                        this.updateFeatureAjaxHandlers[
                                            WorkspaceFeatureTypes.CPE
                                        ].post_update(workspaceFeature);
                                    });
                                }
                            );
                        }
                        break;

                    default:
                        if (this.isSupportedFeatureType(feature.properties.feature_type)) {
                            // @ts-ignore
                            this.updateFeatureAjaxHandlers[
                                feature.properties.feature_type
                            ].pre_update(workspaceFeature);
                            workspaceFeature.update(() => {
                                // @ts-ignore
                                this.updateFeatureAjaxHandlers[
                                    feature.properties.feature_type
                                ].post_update(workspaceFeature);
                            });
                        }
                        break;
                }
            }
        });
    }
}
