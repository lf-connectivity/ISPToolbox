import { BaseWorkspaceFeature } from './BaseWorkspaceFeature';
import { Feature, Point } from 'geojson';

/**
 * Abstract class containing point-specific functions for Workspace objects.
 */
export abstract class WorkspacePointFeature extends BaseWorkspaceFeature {
    /**
     * Moves the selected feature to the specified lat/long coordinates. To be
     * used by other Workspace feature classes for programatically moving objects
     * in response to other things moving, not as an extension for the Mapbox API.
     *
     * @param newCoords New coordinates (lat/long)
     */
    move(newCoords: [number, number]) {
        let feature = this.draw.get(this.mapboxId);

        // @ts-ignore
        feature.geometry.coordinates = newCoords;
        // @ts-ignore
        this.draw.add(feature);
        this.map.fire('draw.update', { features: [feature], action: 'move' });
    }

    getFeatureData(): Feature<Point, any> {
        return super.getFeatureData() as Feature<Point, any>;
    }

    getFeatureGeometry(): Point {
        return super.getFeatureGeometry() as Point;
    }

    getFeatureGeometryCoordinates() {
        return this.getFeatureGeometry().coordinates;
    }
}
