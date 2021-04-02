import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { AccessPointEvents } from "../AccessPointTool";
import { getCookie } from '../utils/Cookie';

/**
 * Abstract class for organizing and defining interactions between UI components
 * to be saved in Workspace and the backend
 */
export abstract class BaseWorkspaceFeature {
    readonly mapboxId: string
    draw: MapboxDraw
    featureData: {
        id: string,
        properties: any,
        geometry: any
    }

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
                featureData: {
                    id: string,
                    properties: any,
                    geometry: any
                },
                apiEndpoint: string,
                serializedFields: Array<string>,
                successCallback?: (resp: any) => void) {
        this.draw = draw;
        this.mapboxId = featureData.id;
        this.apiEndpoint = apiEndpoint;
        this.serializedFields = serializedFields;
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
            this.draw.setFeatureProperty(this.featureData.id, 'uuid', resp.uuid);
            if (successCallback) {
                successCallback(resp)
            }
        });
    }

    /**
     * Updates the object in the backend. Calls successFollowup if defined, which
     * may or may not update additional objects.
     * 
     * Returns a list of BaseWorkspaceFeature objects updated by this function.
     * 
     * @param successFollowup Function to execute on successfully updating object
     * that returns a list of BaseWorkspaceFeature objects that are deleted.
     */
    update(successFollowup?: (resp: any) => Array<BaseWorkspaceFeature>) {
        const updatedItems: Array<BaseWorkspaceFeature> = [];
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
            updatedItems.push(this);
            if (successFollowup) {
                successFollowup(resp).forEach((item) =>
                    updatedItems.push(item)
                );
            }
        });
        return updatedItems;
    }

    /**
     * Deletes the object in the backend. Calls successFollowup if defined, which
     * may or may not delete additional objects.
     * 
     * Returns a list of BaseWorkspaceFeature objects deleted by this function.
     * 
     * @param successFollowup Function to execute on successfully updating object
     */
    delete(successFollowup?: (resp: any) => Array<BaseWorkspaceFeature>) {
        const deletedItems: Array<BaseWorkspaceFeature> = [];
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
            deletedItems.push(this);
            if (successFollowup) {
                successFollowup(resp).forEach((item) =>
                    deletedItems.push(item)
                );
            }
        });
        return deletedItems;
    }

    protected serialize() {
        const serialization: any = {}
        this.serializedFields.forEach(field => {
            serialization[field] = this.featureData.properties[field]
        });
        serialization.geojson = JSON.stringify(this.featureData.geometry);
        return serialization;
    }
}

module.exports = BaseWorkspaceFeature