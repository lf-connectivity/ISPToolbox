import mapboxgl, * as MapboxGL from "mapbox-gl";
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { Feature, Geometry, Point, LineString, GeoJsonProperties }  from 'geojson';
import { WorkspaceEvents } from './WorkspaceConstants';
import { getCookie } from '../utils/Cookie';

const BASE_WORKSPACE_RESPONSE_FIELDS = ['uuid', 'feature_type', 'last_updated']

/**
 * Abstract class for organizing and defining interactions between UI components
 * to be saved in Workspace and the backend
 */
export abstract class BaseWorkspaceFeature {
    mapboxId: string
    workspaceId: string
    map: MapboxGL.Map
    draw: MapboxDraw
    featureData: Feature<Geometry, any>

    private readonly responseFields: Array<string>
    private readonly serializerFields: Array<string>
    private readonly apiEndpoint: string

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
     * @param featureData Feature data for an object
     */
    constructor(map: MapboxGL.Map,
                draw: MapboxDraw,
                featureData: Feature<Geometry, any>,
                apiEndpoint: string,
                responseFields: Array<string>,
                serializedFields: Array<string>) {
        this.map = map;
        this.draw = draw;
        this.mapboxId = String(this.draw.add(featureData)[0]);
        this.apiEndpoint = apiEndpoint;
        this.responseFields = responseFields.concat(BASE_WORKSPACE_RESPONSE_FIELDS);
        this.serializerFields = serializedFields;
        this.featureData = featureData;
        if ('uuid' in this.featureData.properties) {
            this.workspaceId = this.featureData.properties.uuid;
        }
    }

    /**
     * Sends an AJAX request to persist a newly created object into the backend.
     * This should be called upon after object creation, if a new object is to be
     * persisted to the database. Calls successFollowup, if defined, to do further
     * things after object persistence.
     * 
     * @param successFollowup Function to execute on successfully persisting new
     * object.
     */
    create(successFollowup?: (resp: any) => void) {
        $.ajax({
            url: `${this.apiEndpoint}/`,
            method: 'POST',
            data: this.serialize(),
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Accept': 'application/json'
            } 
        }).done((resp) => {
            this.workspaceId = resp.uuid;
            this.updateFeatureProperties(resp);
            if (successFollowup) {
                successFollowup(resp);
            }
        });
    }

    /**
     * Updates the object in the backend with new information. Calls successFollowup if defined.
     * 
     * @param successFollowup Function to execute on successfully updating object
     * @returns A list of BaseWorkspaceFeature objects other than this one deleted by this function,
     * intended to fire additional Mapbox events.
     */
    update(newFeatureData: any,
           successFollowup?: (resp: any) => void) {
        console.log(this.featureData);
        this.featureData = newFeatureData;
        console.log(this.featureData);
        console.log(this.serialize());
        $.ajax({
            url: `${this.apiEndpoint}/${this.featureData.properties.uuid}/`,
            method: 'PATCH',
            data: this.serialize(),
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Accept': 'application/json'
            } 
        }).done((resp) => {
            console.log(resp);
            this.updateFeatureProperties(resp);
            PubSub.publish(WorkspaceEvents.LOS_MODAL_OPENED);
            if (successFollowup) {
                successFollowup(resp);
            }
        });
    }

    /**
     * Deletes the object in the backend. Calls successFollowup if defined.
     * 
     * @param successFollowup Function to execute on successfully deleting object
     * @returns A list of BaseWorkspaceFeature objects other than this one deleted by this function,
     * intended to fire additional Mapbox events.
     */
    delete(successFollowup?: (resp: any) => void) {
        this.draw.delete(this.mapboxId);
        $.ajax({
            url: `${this.apiEndpoint}/${this.featureData.properties.uuid}/`,
            method: 'DELETE',
            data: this.serialize(),
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Accept': 'application/json'
            } 
        }).done((resp) => {
            PubSub.publish(WorkspaceEvents.LOS_MODAL_OPENED);
            if (successFollowup) {
                successFollowup(resp);
            }
        });
    }

    /**
     * Gets the feature type for this workspace feature.
     * 
     * @returns A string indicating this feature's feature type
     */
    getFeatureType(): string {
        return this.featureData.properties.feature_type;
    }

    protected updateFeatureProperties(response: any) {
        this.responseFields.forEach(field => {
            if (field in response) {
                this.draw.setFeatureProperty(this.mapboxId, field, response[field]);
            }
        });

        // @ts-ignore
        this.featureData = this.draw.get(this.mapboxId);
    }

    protected serialize() {
        const serialization: any = {}
        this.serializerFields.forEach(field => {
            if (field in this.featureData.properties) {
                serialization[field] = this.featureData.properties[field];
            }
        });
        serialization.geojson = JSON.stringify(this.featureData.geometry);
        return serialization;
    }
}

/**
 * Abstract class containing point-specific functions for Workspace objects.
 */
export abstract class WorkspacePointFeature extends BaseWorkspaceFeature {
    featureData: Feature<Point, GeoJsonProperties>

    /**
     * Moves the selected feature to the specified lat/long coordinates. To be
     * used by other Workspace feature classes for programatically moving objects
     * in response to other things moving, not as an extension for the Mapbox API.
     * 
     * Calls successFollowup if defined, presumably for updating other objects.
     * 
     * @param newCoords New coordinates (lat/long)
     * @param successFollowup Function to execute after successfully moving object
     * @returns A list of other BaseWorkspaceFeature objects affected by this move.
     */
    move(newCoords: [number, number],
         successFollowup ?: (resp: any) => void) {
        this.featureData.geometry.coordinates = newCoords;
        this.draw.add(this.featureData);
        this.update(this.featureData, successFollowup);
    }

    /**
     * Compares the point represented by the given feature with the one in this
     * current feature to see if they are the same or not.
     * 
     * @param feature Feature to compare coordinates to. Must be a point feature.
     */
    hasMoved(feature: Feature<Point, any>) {
        return this.featureData.geometry.coordinates === feature.geometry.coordinates;
    }
}

/**
 * Abstract class containing point-specific functions for Workspace objects.
 */
 export abstract class WorkspaceLineStringFeature extends BaseWorkspaceFeature {
    featureData: Feature<LineString, GeoJsonProperties>

    /**
     * Moves the selected vertex to the specified lat/long coordinates. To be
     * used by other Workspace feature classes for programatically moving objects
     * in response to other things moving, not as an extension for the Mapbox API.
     * 
     * Calls successFollowup if defined, presumably for updating other objects.
     * 
     * @param index Index of coordinate in LineString object to update
     * @param newCoords New coordinates (lat/long)
     * @param successFollowup Function to execute after successfully moving object
     * @returns A list of other BaseWorkspaceFeature objects affected by this move.
     */
    moveVertex(index: number,
               newCoords: [number, number],
               successFollowup ?: (resp: any) => void) {
        if (index >= 0 && index < this.featureData.geometry.coordinates.length) {
            this.featureData.geometry.coordinates[index] = newCoords;
            this.update(this.featureData, (resp) => {
                this.draw.add(this.featureData);
                if (successFollowup) {
                    successFollowup(resp);
                }
            });
        }
    }
}
