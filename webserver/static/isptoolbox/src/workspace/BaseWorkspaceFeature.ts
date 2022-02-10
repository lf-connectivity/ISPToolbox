import * as MapboxGL from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { Feature, Geometry } from 'geojson';
import { WorkspaceFeatureTypes } from './WorkspaceConstants';
import { getCookie } from '../utils/Cookie';
import { getSessionID } from '../utils/MapPreferences';
import { renderAjaxOperationFailed } from '../utils/ConnectionIssues';
import {CRUDEvent} from '../utils/IIspToolboxAjaxPlugin';

const BASE_WORKSPACE_SERIALIZED_FIELDS = ['uneditable'];
const BASE_WORKSPACE_RESPONSE_FIELDS = ['uuid', 'feature_type', 'last_updated', 'uneditable'];

/**
 * Abstract class for organizing and defining interactions between UI components
 * to be saved in Workspace and the backend
 */
export abstract class BaseWorkspaceFeature {
    mapboxId: string;
    workspaceId: string;
    map: MapboxGL.Map;
    draw: MapboxDraw;

    readonly featureType: WorkspaceFeatureTypes;
    private readonly responseFields: Array<string>;
    private readonly serializerFields: Array<string>;
    private readonly apiEndpoint: string;

    /**
     * Base constructor for a workspace feature. Sets parameters that will be
     * useful for UI interactions in the future
     *
     * @param map: Mapbox map object
     * @param draw Mapbox draw object
     * @param apiEndpoint The REST API endpoint for creating/updating/deleting objects.
     *  This should be defined as a constant in the subclass's constructor
     * @param responseFields Fields to be saved to feature properties from the create/update responses.
     * @param serializedFields Fields to be serialized by the serialiser. This should
     *  be defined as a constant in the subclass's constructor
     * @param featureData Feature data for an object, or a mapbox id
     */
    constructor(
        map: MapboxGL.Map,
        draw: MapboxDraw,
        featureData: Feature<Geometry, any> | string,
        apiEndpoint: string,
        responseFields: Array<string>,
        serializedFields: Array<string>,
        featureType: WorkspaceFeatureTypes
    ) {
        this.map = map;
        this.draw = draw;
        if (typeof featureData == 'number') {
            this.mapboxId = featureData;
        } else {
            // @ts-ignore
            this.mapboxId = String(this.draw.add(featureData)[0]);
        }
        this.setFeatureProperty('feature_type', featureType);
        this.apiEndpoint = apiEndpoint;
        this.responseFields = responseFields.concat(BASE_WORKSPACE_RESPONSE_FIELDS);
        this.serializerFields = [...BASE_WORKSPACE_SERIALIZED_FIELDS, ...serializedFields];
        this.featureType = featureType;

        let feature = this.draw.get(this.mapboxId);
        // @ts-ignore
        if ('uuid' in feature.properties) {
            this.workspaceId = feature?.properties.uuid;
        }
    }

    /**
     * Sends an AJAX request to persist a newly created object into the backend.
     * This should be called upon after object creation, if a new object is to be
     * persisted to the database. Calls successFollowup, if defined, to do further
     * things after object persistence.
     *
     * @param successFollowup Function to execute on successfully persisting new
     * @param errorFollowup Function to execute on failure of ajax request
     * object.
     */
    create(successFollowup?: (resp: any) => void, errorFollowup?: () => void) {
        $.ajax({
            url: `${this.apiEndpoint}`,
            method: 'POST',
            data: this.serialize(),
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                Accept: 'application/json'
            }
        })
            .done((resp) => {
                this.workspaceId = resp.uuid;
                this.updateFeatureProperties(resp);
                const feat = this.draw.get(this.mapboxId);
                if(feat)
                {
                    BaseWorkspaceFeature.fire(CRUDEvent.CREATE, {features: [feat]})
                }
                this.map.fire('draw.update', {features: [feat], action: 'read'});
                if (successFollowup) {
                    successFollowup(resp);
                }
            })
            .fail((error) => {
                renderAjaxOperationFailed();
                this.draw.delete(this.mapboxId);
                if (errorFollowup) {
                    errorFollowup();
                }
            });
    }

    /**
     * Sends an AJAX request to read an object then update the state of the
     * object in the frontend. This should be called after updating the data in
     * a form. Calls successFollowup, if defined.
     *
     * @param successFollowup Function to execute on successfully retrieving object.
     * @param errorFollowup Function to execute on failure of ajax request.
     */
    read(successFollowup?: (resp: any) => void, errorFollowup?: () => void) {
        $.ajax({
            url: `${this.apiEndpoint}${this.workspaceId}/`,
            method: 'GET',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                Accept: 'application/json'
            }
        })
            .done((resp) => {
                this.updateFeatureProperties(resp);
                const feat = this.getFeatureData();
                if(feat) {
                    BaseWorkspaceFeature.fire(CRUDEvent.READ, {features: [feat]});
                }
                if (successFollowup) {
                    successFollowup(resp);
                }
            })
            .fail((error) => {
                renderAjaxOperationFailed();
                if (errorFollowup) {
                    errorFollowup();
                }
            });
    }

    /**
     * Updates the object in the backend with new information. Calls successFollowup if defined.
     *
     * @param successFollowup Function to execute on successfully updating object
     * @param errorFollowup Function to execute on failure of ajax request
     */
    update(successFollowup?: (resp: any) => void, errorFollowup?: () => void) {
        $.ajax({
            url: `${this.apiEndpoint}${this.workspaceId}/`,
            method: 'PATCH',
            data: this.serialize(),
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                Accept: 'application/json'
            }
        })
            .done((resp) => {
                this.updateFeatureProperties(resp);
                const feat = this.getFeatureData();
                if(feat) {
                    BaseWorkspaceFeature.fire(CRUDEvent.UPDATE, {features: [feat]});
                }
                if (successFollowup) {
                    successFollowup(resp);
                }
            })
            .fail((error) => {
                renderAjaxOperationFailed();
                if (errorFollowup) {
                    errorFollowup();
                }
            });
    }

    /**
     * Deletes the object in the backend. Calls successFollowup if defined.
     *
     * @param successFollowup Function to execute on successfully deleting object
     * @param errorFollowup Function to execute on failure of ajax request
     */
    delete(successFollowup?: (resp: any) => void, errorFollowup?: () => void) {
        $.ajax({
            url: `${this.apiEndpoint}${this.workspaceId}/`,
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                Accept: 'application/json'
            }
        })
            .done((resp) => {
                const feat = this.getFeatureData();
                if(feat)
                {
                    BaseWorkspaceFeature.fire(CRUDEvent.DELETE, {features: [feat]});
                }
                this.removeFeatureFromMap(this.mapboxId);
                if (successFollowup) {
                    successFollowup(resp);
                }
            })
            .fail((error) => {
                renderAjaxOperationFailed();
                if (errorFollowup) {
                    errorFollowup();
                }
            });
    }

    /**
     * Gets the feature type for this workspace feature.
     *
     * @returns A string indicating this feature's feature type
     */
    getFeatureType(): string {
        return this.featureType;
    }

    getFeatureData(): Feature<Geometry, any> | undefined {
        return this.draw.get(this.mapboxId);
    }

    getFeatureGeometry(): Geometry | undefined {
        return this.getFeatureData()?.geometry;
    }

    /**
     * Sets the feature property of the feature underlying this workspace object.
     * @param key Key
     * @param value Value
     */
    setFeatureProperty(key: string, value: any) {
        this.draw.setFeatureProperty(this.mapboxId, key, value);
    }

    getFeatureProperty(key: string) {
        return this.getFeatureData()?.properties[key];
    }

    protected removeFeatureFromMap(mapboxId: string) {
        this.draw.delete(mapboxId);
    }

    protected updateFeatureProperties(response: any) {
        this.responseFields.forEach((field) => {
            if (field in response) {
                this.setFeatureProperty(field, response[field]);
            }
        });
    }

    protected serialize() {
        const serialization: any = {};
        let feature = this.draw.get(this.mapboxId);
        this.serializerFields.forEach((field) => {
            // @ts-ignore
            if (field in feature.properties) {
                // @ts-ignore
                serialization[field] = feature.properties[field];
            }
        });
        serialization.geojson = JSON.stringify(this.featureData.geometry);
        serialization.map_session = getSessionID();
        return serialization;
    }


    /**
     * Observer Interface for CRUD Completion Events
     */
    private static listeners :
    {
        [CRUDEvent.CREATE]: Array<(e: {features: Array<GeoJSON.Feature>}) => void>
        [CRUDEvent.READ]: Array<(e: {features: Array<GeoJSON.Feature>}) => void>
        [CRUDEvent.UPDATE]: Array<(e: {features: Array<GeoJSON.Feature>}) => void>
        [CRUDEvent.DELETE]: Array<(e: {features: Array<GeoJSON.Feature>}) => void>
    } =
    {
        [CRUDEvent.CREATE]: [],
        [CRUDEvent.READ]: [],
        [CRUDEvent.UPDATE]: [],
        [CRUDEvent.DELETE] :[]
    };

    public static fire(event: CRUDEvent, e: {features: Array<GeoJSON.Feature>}) {
        PubSub.publishSync(event, e);
    }
}
