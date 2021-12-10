import mapboxgl, * as MapboxGL from 'mapbox-gl';
import {
    Feature,
    Geometry,
    Point,
    LineString,
    Polygon,
    MultiPolygon,
    GeoJsonProperties
} from 'geojson';
import { BaseWorkspaceFeature } from './BaseWorkspaceFeature';
import { isUnitsUS } from '../utils/MapPreferences';
import { LinkCheckEvents } from './WorkspaceConstants';
import { WorkspaceEvents, WorkspaceFeatureTypes } from './WorkspaceConstants';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { BuildingCoverage, EMPTY_BUILDING_COVERAGE } from './BuildingCoverage';
import { djangoUrl } from '../utils/djangoUrl';
import { WorkspacePointFeature } from './WorkspacePointFeature';
import { WorkspaceLineStringFeature } from './WorkspaceLineStringFeature';
import { WorkspacePolygonFeature } from './WorkspacePolygonFeature';
import { BaseWorkspaceManager } from './BaseWorkspaceManager';

const AP_RESPONSE_FIELDS = [
    'name',
    'height',
    'max_radius',
    'radius',
    'no_check_radius',
    'default_cpe_height',
    'radius_miles',
    'height_ft',
    'default_cpe_height_ft',
    'cloudrf_coverage_geojson_json'
];
const AP_SERIALIZER_FIELDS = [
    'name',
    'height',
    'max_radius',
    'no_check_radius',
    'default_cpe_height'
];

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

const CPE_RESPONSE_FIELDS = ['name', 'height', 'height_ft', 'ap'];
const CPE_SERIALIZER_FIELDS = ['name', 'height', 'ap'];

const AP_CPE_LINK_FIELDS = ['frequency', 'ap', 'cpe'];

const PTP_LINK_FIELDS = ['frequency', 'radio0hgt', 'radio1hgt'];

const COVERAGE_AREA_FIELDS = ['name'];

const LINK_AP_INDEX = 0;
const LINK_CPE_INDEX = 1;

export const ASR_TOWER_COVERAGE_WORKSPACE_ID = 'tower';

export class AccessPoint extends WorkspacePointFeature {
    readonly links: Map<CPE, APToCPELink>; // mapbox ID
    readonly sectors: Map<string, AccessPointSector>;
    coverage: BuildingCoverage;
    awaitingCoverage: boolean;

    constructor(map: mapboxgl.Map, draw: MapboxDraw, featureData: Feature<Geometry, any> | string) {
        super(
            map,
            draw,
            featureData,
            djangoUrl('workspace:ap'),
            AP_RESPONSE_FIELDS,
            AP_SERIALIZER_FIELDS,
            WorkspaceFeatureTypes.AP
        );
        this.links = new Map();
        this.sectors = new Map();
        this.coverage = EMPTY_BUILDING_COVERAGE;
        this.awaitingCoverage = false;
    }

    create(successFollowup?: (resp: any) => void, errorFollowup?: () => void) {
        super.create((resp) => {
            PubSub.publish(WorkspaceEvents.AP_UPDATE, { features: [this.getFeatureData()] });

            if (successFollowup) {
                successFollowup(resp);
            }
        }, errorFollowup);
    }

    update(successFollowup?: (resp: any) => void, errorFollowup?: () => void) {
        super.update((resp: any) => {
            let feature = this.draw.get(this.mapboxId);
            this.coverage = EMPTY_BUILDING_COVERAGE;

            // @ts-ignore
            this.draw.setFeatureProperty(this.mapboxId, 'radius', feature?.properties.max_radius);
            PubSub.publish(WorkspaceEvents.AP_UPDATE, { features: [this.getFeatureData()] });
            this.moveLinks(this.getFeatureGeometryCoordinates() as [number, number]);
            this.updateSectors();

            if (successFollowup) {
                successFollowup(resp);
            }
        }, errorFollowup);
    }

    delete(successFollowup?: (resp: any) => void, errorFollowup?: () => void) {
        this.links.forEach((link, cpe) => {
            cpe.ap = undefined;

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

        this.sectors.forEach((sector) => {
            let deletedSector = sector.getFeatureData();
            this.removeFeatureFromMap(sector.mapboxId);

            if (deletedSector) {
                this.map.fire('draw.delete', { features: [deletedSector] });
            }
        });
        super.delete(successFollowup);
    }

    move(newCoords: [number, number]) {
        super.move(newCoords);
        this.moveLinks(newCoords);
        this.updateSectors();
    }

    awaitNewCoverage() {
        this.coverage = EMPTY_BUILDING_COVERAGE;
        this.awaitingCoverage = true;
    }

    setCoverage(coverage: Array<any>) {
        this.coverage = new BuildingCoverage(coverage);
        this.awaitingCoverage = false;
    }

    /**
     * Links the AP with the given CPE and creates an APToCPELink object to represent the link.
     * @param cpe CPE to link to this AP.
     * @returns The AP to CPE link object created, or undefined if link already exists.
     */
    linkCPE(cpe: CPE): APToCPELink {
        if (this.links.has(cpe)) {
            // @ts-ignore
            return this.links.get(cpe);
        }
        const newLinkFeature: Feature<LineString, any> = {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    this.getFeatureGeometryCoordinates(),
                    cpe.getFeatureGeometryCoordinates()
                ]
            },
            properties: {}
        };

        cpe.ap = this;
        const newLink = new APToCPELink(this.map, this.draw, newLinkFeature, this, cpe);
        this.links.set(cpe, newLink);
        return newLink;
    }

    private moveLinks(newCoords: [number, number]) {
        this.links.forEach((link) => {
            link.moveVertex(LINK_AP_INDEX, newCoords);
        });
    }

    private updateSectors() {
        this.sectors.forEach((sector) => {
            sector.update();
        });
    }
}

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

export class CPE extends WorkspacePointFeature {
    ap?: AccessPoint;
    sector?: AccessPointSector;

    constructor(map: MapboxGL.Map, draw: MapboxDraw, featureData: Feature<Geometry, any>) {
        super(
            map,
            draw,
            featureData,
            djangoUrl('workspace:cpe'),
            CPE_RESPONSE_FIELDS,
            CPE_SERIALIZER_FIELDS,
            WorkspaceFeatureTypes.CPE
        );
    }

    /**
     * Links the CPE with the given AP and creates an APToCPELink object to represent the link.
     * @param cpe AP to link to this CPE.
     * @returns The AP to CPE link object created, or undefined if link already exists.
     */
    linkAP(ap: AccessPoint): APToCPELink {
        this.setFeatureProperty('ap', ap.workspaceId);
        let retval = ap.linkCPE(this);
        this.map.fire('draw.update', { features: [this.getFeatureData()] });
        return retval;
    }

    update(successFollowup?: (resp: any) => void, errorFollowup?: () => void) {
        this.moveLink(this.getFeatureGeometryCoordinates() as [number, number]);
        super.update((resp: any) => {
            if (successFollowup) {
                successFollowup(resp);
            }
        }, errorFollowup);
    }

    move(newCoords: [number, number]) {
        super.move(newCoords);
        this.moveLink(newCoords);
    }

    delete(successFollowup?: (resp: any) => void, errorFollowup?: () => void) {
        super.delete((resp) => {
            if (this.ap) {
                let link = this.ap.links.get(this) as APToCPELink;
                this.ap.links.delete(this);
                let removedLink = link.getFeatureData();
                this.removeFeatureFromMap(link.mapboxId);
                if (removedLink) {
                    this.map.fire('draw.delete', { features: [removedLink] });
                }
                this.ap = undefined;
            }
            if (successFollowup) {
                successFollowup(resp);
            }
        }, errorFollowup);
    }

    private moveLink(newCoords: [number, number]) {
        if (this.ap) {
            let link = this.ap.links.get(this);
            link?.moveVertex(LINK_CPE_INDEX, newCoords);
        }
    }
}

export class APToCPELink extends WorkspaceLineStringFeature {
    ap: AccessPoint;
    cpe: CPE;

    constructor(
        map: MapboxGL.Map,
        draw: MapboxDraw,
        featureData: Feature<LineString, any> | string,
        ap: AccessPoint,
        cpe: CPE
    ) {
        super(
            map,
            draw,
            featureData,
            djangoUrl('workspace:ap-cpe-link'),
            AP_CPE_LINK_FIELDS,
            AP_CPE_LINK_FIELDS,
            WorkspaceFeatureTypes.AP_CPE_LINK
        );
        this.ap = ap;
        this.cpe = cpe;
        this.setFeatureProperty('ap', this.ap.workspaceId);
        this.setFeatureProperty('cpe', this.cpe.workspaceId);
        this.setFeatureProperty('uneditable', true);
    }

    create(successFollowup?: (resp: any) => void, errorFollowup?: () => void) {
        super.create((resp) => {
            // Set inputs for AP and CPE
            const apData = {
                radio: 0,
                latitude: this.ap.getFeatureGeometryCoordinates()[1],
                longitude: this.ap.getFeatureGeometryCoordinates()[0],
                height: isUnitsUS()
                    ? this.ap.getFeatureProperty('height_ft')
                    : this.ap.getFeatureProperty('height'),
                name: this.ap.getFeatureProperty('name')
            };
            PubSub.publish(LinkCheckEvents.SET_INPUTS, apData);

            const cpeData = {
                radio: 1,
                latitude: this.cpe.getFeatureGeometryCoordinates()[1],
                longitude: this.cpe.getFeatureGeometryCoordinates()[0],
                height: isUnitsUS()
                    ? this.cpe.getFeatureProperty('height_ft')
                    : this.cpe.getFeatureProperty('height'),
                name: this.cpe.getFeatureProperty('name')
            };
            PubSub.publish(LinkCheckEvents.SET_INPUTS, cpeData);

            if (successFollowup) {
                successFollowup(resp);
            }
        }, errorFollowup);
    }

    // Delete the CPE when deleting a link
    delete(successFollowup?: (resp: any) => void, errorFollowup?: () => void) {
        super.delete(() => {
            this.cpe.ap = undefined;
            this.ap.links.delete(this.cpe);
            let cpeData = this.cpe.getFeatureData();
            this.removeFeatureFromMap(this.cpe.mapboxId);
            this.map.fire('draw.delete', { features: [cpeData] });

            if (successFollowup) {
                successFollowup({});
            }
        }, errorFollowup);
    }

    switchAP(newAP: AccessPoint) {
        if (newAP !== this.ap) {
            // Delete old AP data
            this.ap.links.delete(this.cpe);

            // Set new AP
            this.ap = newAP;
            this.ap.links.set(this.cpe, this);
            this.cpe.ap = newAP;
            this.cpe.setFeatureProperty('ap', newAP.workspaceId);
            this.setFeatureProperty('ap', newAP.workspaceId);
            this.map.fire('draw.update', { features: [this.getFeatureData()], action: 'move' });
            this.moveVertex(
                LINK_AP_INDEX,
                newAP.getFeatureGeometryCoordinates() as [number, number]
            );
        }
    }
}

export class PointToPointLink extends WorkspaceLineStringFeature {
    constructor(
        map: MapboxGL.Map,
        draw: MapboxDraw,
        featureData: Feature<LineString, any> | string
    ) {
        super(
            map,
            draw,
            featureData,
            djangoUrl('workspace:ptp-link'),
            PTP_LINK_FIELDS,
            PTP_LINK_FIELDS,
            WorkspaceFeatureTypes.PTP_LINK
        );
    }
}

export class CoverageArea extends BaseWorkspaceFeature {
    coverage: BuildingCoverage;
    awaitingCoverage: boolean;

    constructor(map: MapboxGL.Map, draw: MapboxDraw, featureData: Feature<Geometry, any>) {
        super(
            map,
            draw,
            featureData,
            djangoUrl('workspace:coverage-area'),
            COVERAGE_AREA_FIELDS,
            COVERAGE_AREA_FIELDS,
            WorkspaceFeatureTypes.COVERAGE_AREA
        );
        this.coverage = EMPTY_BUILDING_COVERAGE;
        this.awaitingCoverage = false;
    }

    update(successFollowup?: (resp: any) => void, errorFollowup?: () => void) {
        super.update((resp: any) => {
            PubSub.publish(WorkspaceEvents.AP_UPDATE, { features: [this.getFeatureData()] });

            if (successFollowup) {
                successFollowup(resp);
            }
        }, errorFollowup);
    }

    awaitNewCoverage() {
        this.coverage = EMPTY_BUILDING_COVERAGE;
        this.awaitingCoverage = true;
    }

    setCoverage(coverage: Array<any>) {
        this.coverage = new BuildingCoverage(coverage);
        this.awaitingCoverage = false;
    }
}

// Do not save ASR tower coverage area coverage
export class ASRTowerCoverageArea extends CoverageArea {
    create(successFollowup?: (resp: any) => void) {
        this.workspaceId = ASR_TOWER_COVERAGE_WORKSPACE_ID;

        this.setFeatureProperty('uuid', ASR_TOWER_COVERAGE_WORKSPACE_ID);
        this.setFeatureProperty('feature_type', WorkspaceFeatureTypes.COVERAGE_AREA);

        if (successFollowup) {
            successFollowup(undefined);
        }
    }

    update(successFollowup?: (resp: any) => void) {
        PubSub.publish(WorkspaceEvents.AP_UPDATE, { features: [this.getFeatureData()] });

        if (successFollowup) {
            successFollowup(undefined);
        }
    }

    delete(successFollowup?: (resp: any) => void) {
        if (successFollowup) {
            successFollowup(undefined);
        }
    }
}
