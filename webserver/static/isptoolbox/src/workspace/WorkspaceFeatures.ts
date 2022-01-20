import mapboxgl, * as MapboxGL from 'mapbox-gl';
import { Feature, Geometry, LineString, Point } from 'geojson';
import { BaseWorkspaceFeature } from './BaseWorkspaceFeature';
import { isUnitsUS } from '../utils/MapPreferences';
import { LinkCheckEvents } from './WorkspaceConstants';
import { WorkspaceEvents, WorkspaceFeatureTypes } from './WorkspaceConstants';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { BuildingCoverage, EMPTY_BUILDING_COVERAGE } from './BuildingCoverage';
import { djangoUrl } from '../utils/djangoUrl';
import { WorkspacePointFeature } from './WorkspacePointFeature';
import { WorkspaceLineStringFeature } from './WorkspaceLineStringFeature';
import { AccessPointSector } from './WorkspaceSectorFeature';

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
    'cloudrf_coverage_geojson_json',
    'lng',
    'lat'
];
const AP_SERIALIZER_FIELDS = [
    'name',
    'height',
    'max_radius',
    'no_check_radius',
    'default_cpe_height'
];

const CPE_RESPONSE_FIELDS = ['name', 'height', 'height_ft', 'ap', 'sector'];
const CPE_SERIALIZER_FIELDS = ['name', 'height', 'ap', 'sector'];

const AP_CPE_LINK_FIELDS = ['frequency', 'ap', 'cpe', 'sector'];

const PTP_LINK_FIELDS = ['frequency', 'radio0hgt', 'radio1hgt'];

const COVERAGE_AREA_FIELDS = ['name'];

export const LINK_AP_INDEX = 0;
export const LINK_CPE_INDEX = 1;

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

    read(successFollowup?: (resp: any) => void, errorFollowup?: () => void) {
        super.read((resp) => {
            this.setCoordinates();
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

    private setCoordinates() {
        if (
            this.getFeatureProperty('lng') &&
            this.getFeatureProperty('lng') !== null &&
            this.getFeatureProperty('lat') &&
            this.getFeatureProperty('lat') !== null
        ) {
            let lng = this.getFeatureProperty('lng');
            let lat = this.getFeatureProperty('lat');
            this.move([lng, lat]);
        }
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
    linkAP(ap: AccessPoint | AccessPointSector): APToCPELink {
        if (isAP(ap)) {
            this.setFeatureProperty('ap', ap.workspaceId);
        } else {
            this.setFeatureProperty('sector', ap.workspaceId);
        }
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
                this.deleteLinkFromTower(this.ap);
                this.ap = undefined;
            }
            if (this.sector) {
                this.deleteLinkFromTower(this.sector);
                this.sector = undefined;
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

        if (this.sector) {
            let link = this.sector.links.get(this);
            link?.moveVertex(LINK_CPE_INDEX, newCoords);
        }
    }

    private deleteLinkFromTower(ap: AccessPoint | AccessPointSector) {
        let link = ap.links.get(this) as APToCPELink;
        ap.links.delete(this);
        let removedLink = link.getFeatureData();
        this.removeFeatureFromMap(link.mapboxId);
        if (removedLink) {
            this.map.fire('draw.delete', { features: [removedLink] });
        }
    }
}

export class APToCPELink extends WorkspaceLineStringFeature {
    tower: AccessPoint | AccessPointSector;
    cpe: CPE;

    constructor(
        map: MapboxGL.Map,
        draw: MapboxDraw,
        featureData: Feature<LineString, any> | string,
        towerThing: AccessPoint | AccessPointSector,
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

        this.tower = towerThing;
        this.cpe = cpe;
        this.setFeatureProperty('cpe', this.cpe.workspaceId);
        this.setFeatureProperty('uneditable', true);

        if (isAP(this.tower)) {
            this.setFeatureProperty('ap', this.tower.workspaceId);
        } else {
            this.setFeatureProperty('sector', this.tower.workspaceId);
        }
    }

    create(successFollowup?: (resp: any) => void, errorFollowup?: () => void) {
        super.create((resp) => {
            // Set inputs for AP and CPE
            const towerData = {
                radio: 0,
                latitude: isAP(this.tower)
                    ? this.tower.getFeatureGeometryCoordinates()[1]
                    : this.tower.ap.getFeatureGeometryCoordinates()[1],
                longitude: isAP(this.tower)
                    ? this.tower.getFeatureGeometryCoordinates()[0]
                    : this.tower.ap.getFeatureGeometryCoordinates()[0],
                height: isUnitsUS()
                    ? this.tower.getFeatureProperty('height_ft')
                    : this.tower.getFeatureProperty('height'),
                name: this.tower.getFeatureProperty('name')
            } as { [key: string]: any };
            if (!isAP(this.tower)) {
                towerData.frequency = this.tower.getFeatureProperty('frequency');
            }
            PubSub.publish(LinkCheckEvents.SET_INPUTS, towerData);

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
            this.tower.links.delete(this.cpe);
            let cpeData = this.cpe.getFeatureData();
            this.removeFeatureFromMap(this.cpe.mapboxId);
            this.map.fire('draw.delete', { features: [cpeData] });

            if (successFollowup) {
                successFollowup({});
            }
        }, errorFollowup);
    }

    switchAP(newTower: AccessPoint | AccessPointSector) {
        if (newTower !== this.tower) {
            // Delete old AP data
            this.tower.links.delete(this.cpe);

            // Set new AP
            this.tower = newTower;
            this.tower.links.set(this.cpe, this);
            if (isAP(newTower)) {
                this.cpe.ap = newTower;
                this.cpe.setFeatureProperty('ap', newTower.workspaceId);
                this.setFeatureProperty('ap', newTower.workspaceId);
            } else {
                this.cpe.sector = newTower;
                this.cpe.setFeatureProperty('sector', newTower.workspaceId);
                this.setFeatureProperty('sector', newTower.workspaceId);
                this.setFeatureProperty('frequency', newTower.getFeatureProperty('frequency'));
            }

            this.map.fire('draw.update', { features: [this.getFeatureData()], action: 'move' });
            this.moveVertex(
                LINK_AP_INDEX,
                isAP(newTower)
                    ? (newTower.getFeatureGeometryCoordinates() as [number, number])
                    : (newTower.ap.getFeatureGeometryCoordinates() as [number, number])
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

export function isAP(ap: AccessPoint | AccessPointSector): ap is AccessPoint {
    return ap.getFeatureType() === WorkspaceFeatureTypes.AP;
}
