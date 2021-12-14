import mapboxgl, * as MapboxGL from 'mapbox-gl';
import { Feature, Geometry, MultiPolygon, GeoJsonProperties } from 'geojson';
import { djangoUrl } from '../utils/djangoUrl';
import { BaseWorkspaceManager } from './BaseWorkspaceManager';
import { BuildingCoverage, EMPTY_BUILDING_COVERAGE } from './BuildingCoverage';
import { WorkspaceFeatureTypes } from './WorkspaceConstants';
import { AccessPoint, APToCPELink, CPE, LINK_AP_INDEX } from './WorkspaceFeatures';
import { WorkspacePolygonFeature } from './WorkspacePolygonFeature';

const SECTOR_RESPONSE_FIELDS = [
    'name',
    'height',
    'radius',
    'default_cpe_height',
    'heading',
    'azimuth',
    'height_ft',
    'radius_miles',
    'default_cpe_height_ft',
    'ap',
    'frequency',
    'cloudrf_coverage_geojson_json',
    'geojson_json'
];

const SECTOR_SERIALIZER_FIELDS = [
    'name',
    'height',
    'radius',
    'default_cpe_height',
    'heading',
    'azimuth',
    'frequency',
    'ap'
];

// TODO: hook up CPEs to AP sectors
export class AccessPointSector extends WorkspacePolygonFeature {
    readonly links: Map<CPE, APToCPELink>; // mapbox ID
    ap: AccessPoint;
    coverage: BuildingCoverage;
    awaitingCoverage: boolean;
    renderCloudRf: boolean;

    constructor(
        map: MapboxGL.Map,
        draw: MapboxDraw,
        featureData: Feature<Geometry, any>,
        renderCloudRf: boolean = false
    ) {
        super(
            map,
            draw,
            featureData,
            djangoUrl('workspace:ap_sector'),
            SECTOR_RESPONSE_FIELDS,
            SECTOR_SERIALIZER_FIELDS,
            WorkspaceFeatureTypes.SECTOR
        );
        this.coverage = EMPTY_BUILDING_COVERAGE;
        this.awaitingCoverage = false;
        this.links = new Map();

        let apUUID = this.getFeatureProperty('ap');
        let ap = BaseWorkspaceManager.getFeatureByUuid(apUUID) as AccessPoint;
        this.ap = ap;
        this.renderCloudRf = renderCloudRf;

        // Case where AP sector is preloaded
        this.setAP();
        this.setGeojson();
    }

    create(successFollowup?: (resp: any) => void) {
        super.create((resp) => {
            // Case where AP sector is created in session
            this.setAP();
            this.setGeojson();
            if (successFollowup) {
                successFollowup(resp);
            }
        });
    }

    update(successFollowup?: (resp: any) => void) {
        super.update((resp: any) => {
            this.setGeojson();
            this.moveLinks(this.ap.getFeatureGeometryCoordinates() as [number, number]);
            if (successFollowup) {
                successFollowup(resp);
            }
        });
    }

    delete(successFollowup?: (resp: any) => void) {
        this.links.forEach((link, cpe) => {
            cpe.sector = undefined;

            // Link is already deleted in backend because of cascading delete
            let deletedLink = link.getFeatureData();
            this.removeFeatureFromMap(link.mapboxId);
            let deletedCPE = cpe.getFeatureData();
            this.removeFeatureFromMap(cpe.mapboxId);

            // Yes, this should probably be moved into its own function, but when
            // I do that it doesn't work as intended. ¯\_(ツ)_/¯
            if (deletedLink) {
                this.map.fire('draw.delete', { features: [deletedLink, deletedCPE] });
            }
        });
        this.links.clear();

        // Remove from AP object
        this.ap.sectors.delete(this.workspaceId);
        super.delete(successFollowup);
    }

    awaitNewCoverage() {
        this.coverage = EMPTY_BUILDING_COVERAGE;
        this.awaitingCoverage = true;
    }

    setCoverage(coverage: Array<any>) {
        this.coverage = new BuildingCoverage(coverage);
        this.awaitingCoverage = false;
    }

    private setGeojson() {
        // Set coverage to cloud RF???
        // TODO: Make CloudRF Coverage a multipolygon
        let geometry: any;
        let new_feat: any;
        if (
            this.renderCloudRf &&
            this.getFeatureProperty('cloudrf_coverage_geojson_json') &&
            this.getFeatureProperty('cloudrf_coverage_geojson_json') !== null
        ) {
            geometry = JSON.parse(this.getFeatureProperty('cloudrf_coverage_geojson_json'));
        } else if (
            this.getFeatureProperty('geojson_json') &&
            this.getFeatureProperty('geojson_json') !== null
        ) {
            geometry = JSON.parse(this.getFeatureProperty('geojson_json'));
        }

        if (geometry) {
            new_feat = {
                type: 'Feature',
                geometry: geometry,
                properties: this.getFeatureData().properties,
                id: this.mapboxId
            } as Feature<MultiPolygon, GeoJsonProperties>;

            this.draw.add(new_feat);
        }
    }

    private setAP() {
        // Case if AP sector is preloaded
        if (this.workspaceId && !this.ap.sectors.has(this.workspaceId)) {
            this.ap.sectors.set(this.workspaceId, this);
        }
    }

    private moveLinks(newCoords: [number, number]) {
        this.links.forEach((link) => {
            link.moveVertex(LINK_AP_INDEX, newCoords);
        });
    }
}
