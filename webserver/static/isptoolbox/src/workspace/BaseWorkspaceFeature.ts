import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { Feature, Geometry, Point, LineString, GeoJsonProperties, Position }  from 'geojson';
import { AccessPointEvents } from '../AccessPointTool';
import { getCookie } from '../utils/Cookie';

const BASE_WORKSPACE_SERIALIZED_FIELDS = ['uuid', 'feature_type', 'last_updated']

/**
 * Abstract class for organizing and defining interactions between UI components
 * to be saved in Workspace and the backend
 */
export abstract class BaseWorkspaceFeature {
    readonly mapboxId: string
    readonly workspaceId: string
    draw: MapboxDraw
    featureData: Feature<Geometry, any>

    private readonly serializedFields: Array<string>
    private readonly apiEndpoint: string

    /**
     * Base constructor for a workspace feature. Sets parameters that will be
     * useful for UI interactions in the future, as well as sends an AJAX create
     * object request to the backend to save the object. Also executes a success
     * callback if that is defined.
     * 
     * @param draw Mapbox draw object
     * @param apiEndpoint The REST API endpoint for creating/updating/deleting objects.
     *  This should be defined as a constant in the subclass's constructor
     * @param serializedFields Fields to be serialized by the serialiser. This should
     *  be defined as a constant in the subclass's constructor
     * @param featureData Feature data for an object
     * @param successCallback Function to execute on successfully saving object
     */
    constructor(draw: MapboxDraw,
                featureData: Feature<Geometry, any>,
                apiEndpoint: string,
                serializedFields: Array<string>,
                successCallback?: (resp: any) => void) {
        this.draw = draw;
        this.mapboxId = String(featureData.id);
        this.apiEndpoint = apiEndpoint;
        this.serializedFields = serializedFields.concat(BASE_WORKSPACE_SERIALIZED_FIELDS);
        this.featureData = featureData;

        // Send request to backend
        $.ajax({
            url: `${this.apiEndpoint}/`,
            method: 'POST',
            data: this.serialize(),
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Accept': 'application/json'
            } 
        }).done((resp) => {
            // @ts-ignore
            this.workspaceId = resp.uuid;
            this.serializedFields.forEach(field => {
                if (field in resp) {
                    this.draw.setFeatureProperty(this.mapboxId, field, resp[field]);
                }
            });
            if (successCallback) {
                successCallback(resp)
            }
        });
    }

    /**
     * Updates the object in the backend. Calls successFollowup if defined, which
     * may or may not update additional objects.
     * 
     * @param successFollowup Function to execute on successfully updating object
     * that returns a list of BaseWorkspaceFeature objects that are deleted.
     * @returns A list of BaseWorkspaceFeature objects other than this one deleted by this function,
     * intended to fire additional Mapbox events.
     */
    update(successFollowup?: (resp: any) => Array<BaseWorkspaceFeature>) {
        const otherItems: Array<BaseWorkspaceFeature> = [];
        $.ajax({
            url: `${this.apiEndpoint}/${this.featureData.properties.uuid}/`,
            method: 'PATCH',
            data: this.serialize(),
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Accept': 'application/json'
            } 
        }).done((resp) => {
            PubSub.publish(AccessPointEvents.MODAL_OPENED);
            if (successFollowup) {
                successFollowup(resp).forEach((item) =>
                    otherItems.push(item)
                );
            }
        });
        return otherItems;
    }

    /**
     * Deletes the object in the backend. Calls successFollowup if defined, which
     * may or may not delete additional objects.
     * 
     * @param successFollowup Function to execute on successfully deleting object
     * @returns A list of BaseWorkspaceFeature objects other than this one deleted by this function,
     * intended to fire additional Mapbox events.
     */
    delete(successFollowup?: (resp: any) => Array<BaseWorkspaceFeature>) : Array<BaseWorkspaceFeature> {
        const otherItems: Array<BaseWorkspaceFeature> = [];
        $.ajax({
            url: `${this.apiEndpoint}/${this.featureData.properties.uuid}/`,
            method: 'PATCH',
            data: this.serialize(),
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Accept': 'application/json'
            } 
        }).done((resp) => {
            PubSub.publish(AccessPointEvents.MODAL_OPENED);
            if (successFollowup) {
                successFollowup(resp).forEach((item) =>
                    otherItems.push(item)
                );
            }
        });
        return otherItems;
    }

    protected serialize() {
        const serialization: any = {}
        this.serializedFields.forEach(field => {
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
    protected move(newCoords: [number, number],
                   successFollowup ?: (resp: any) => Array<BaseWorkspaceFeature>): Array<BaseWorkspaceFeature> {
        this.featureData.geometry.coordinates = newCoords
        this.draw.add(this.featureData)
        return this.update(successFollowup)
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
    protected moveVertex(index: number,
                         newCoords: [number, number],
                         successFollowup ?: (resp: any) => Array<BaseWorkspaceFeature>): Array<BaseWorkspaceFeature> {
        if (index >= 0 && index < this.featureData.geometry.coordinates.length) {
            this.featureData.geometry.coordinates[index] = newCoords;
            this.draw.add(this.featureData)
            return this.update(successFollowup);
        }
        return [];
    }
}
