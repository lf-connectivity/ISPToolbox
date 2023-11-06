// (c) Meta Platforms, Inc. and affiliates
/**
 * A singleton instance of a mapbox client for draw modes
 */

export class MapboxSDKClient {
    constructor(accessToken) {
        if (MapboxSDKClient._instance) {
            return MapboxSDKClient._instance;
        }
        MapboxSDKClient._instance = this;
        const mapboxClient = require('@mapbox/mapbox-sdk');
        const mapboxGeocodingClient = require('@mapbox/mapbox-sdk/services/geocoding');
        this.baseClient = mapboxClient({ accessToken: accessToken });
        this.geocodingClient = mapboxGeocodingClient(this.baseClient);
    }

    /**
     * Performs a reverse geocode lookup using the Mapbox API with the following coordinates.
     * On success, executes the success callback, if defined, and on failure, executes the
     * error callback, if defined.
     *
     * @param {[number, number]} coordinates Coordinates in [longitude, latitude] form
     * @param {*} successCallback Callback on success
     * @param {*} errorCallback Callback on error
     */
    reverseGeocode(coordinates, successCallback = undefined, errorCallback = undefined) {
        this.geocodingClient
            .reverseGeocode({
                query: coordinates
            })
            .send()
            .then(
                (response) => {
                    if (successCallback) {
                        successCallback(response);
                    }
                },
                (error) => {
                    if (errorCallback) {
                        errorCallback(error);
                    }
                }
            );
    }

    static getInstance() {
        if (MapboxSDKClient._instance) {
            return MapboxSDKClient._instance;
        }
        throw new Error('Mapbox SDK not initialized');
    }
}
