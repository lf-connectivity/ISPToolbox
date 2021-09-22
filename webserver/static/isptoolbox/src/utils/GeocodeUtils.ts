// Direct draw override const

import { LinkCheckBasePopup } from '../isptoolbox-mapbox-draw/popups/LinkCheckBasePopup';
import { LinkCheckVertexClickCustomerConnectPopup } from '../isptoolbox-mapbox-draw/popups/LinkCheckCustomerConnectPopup';
import { MapboxSDKClient } from '../MapboxSDKClient';

/**
 * Returns a function that reverse geocodes the given lngLat
 * and displays a popup at that location with the result
 * of the reverse geocode. Also queries for ptp links (non workspace)
 * that share a vertex, to convert those ptp links to tower/customer
 *
 * @param state mapbox state
 * @param e event e
 * @returns A function that calls reverseGeocode and displays the popup at the given coordinates.
 */
export function createPopupFromVertexEvent(state: any, e: any) {
    return () => {
        // Find which vertex the user has clicked. Works differently for drag and click vertex.
        let selectedCoord: number;
        if (e.featureTarget) {
            selectedCoord = e.featureTarget.properties.coord_path;
        } else {
            // Selected coordinate is the last item in selectedCoordPaths
            selectedCoord = Number(state.selectedCoordPaths[state.selectedCoordPaths.length - 1]);
        }
        let vertexLngLat = state.feature.coordinates[selectedCoord];
        let mapboxClient = MapboxSDKClient.getInstance();
        mapboxClient.reverseGeocode(vertexLngLat, (response: any) => {
            let popup = LinkCheckBasePopup.createPopupFromReverseGeocodeResponse(
                LinkCheckVertexClickCustomerConnectPopup,
                vertexLngLat,
                response
            );
            popup.setSelectedFeatureId(state.feature.id);
            popup.setSelectedVertex(selectedCoord);
            popup.show();
        });
    };
}
