// (c) Meta Platforms, Inc. and affiliates. Copyright
import { BaseWorkspaceFeature } from './BaseWorkspaceFeature';
import { Feature, Polygon } from 'geojson';

/**
 * Abstract class containing polygon-specific functions for Workspace objects.
 */
export abstract class WorkspacePolygonFeature extends BaseWorkspaceFeature {
    getFeatureData(): Feature<Polygon, any> {
        return super.getFeatureData() as Feature<Polygon, any>;
    }

    getFeatureGeometry(): Polygon {
        return super.getFeatureGeometry() as Polygon;
    }
}
