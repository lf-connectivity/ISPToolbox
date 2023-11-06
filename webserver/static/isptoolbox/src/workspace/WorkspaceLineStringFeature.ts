// (c) Meta Platforms, Inc. and affiliates. Copyright
import { Feature, LineString } from 'geojson';
import { BaseWorkspaceFeature } from './BaseWorkspaceFeature';

/**
 * Abstract class containing point-specific functions for Workspace objects.
 */
export abstract class WorkspaceLineStringFeature extends BaseWorkspaceFeature {
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
    moveVertex(index: number, newCoords: [number, number]) {
        let feature = this.getFeatureData();
        if (index >= 0 && index < feature.geometry.coordinates.length) {
            let newFeature = { ...feature };
            newFeature.geometry.coordinates[index] = newCoords;
            this.draw.add(newFeature);
            this.map.fire('draw.update', {features: [newFeature]});
        }
    }

    getFeatureData(): Feature<LineString, any> {
        return super.getFeatureData() as Feature<LineString, any>;
    }

    getFeatureGeometry(): LineString {
        return super.getFeatureGeometry() as LineString;
    }

    getFeatureGeometryCoordinates() {
        return this.getFeatureGeometry().coordinates;
    }
}
