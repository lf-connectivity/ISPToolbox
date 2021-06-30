import mapboxgl, * as MapboxGL from "mapbox-gl";
import { Feature, Geometry, Point, LineString, Polygon }  from 'geojson';
import { BaseWorkspaceFeature, WorkspaceLineStringFeature, WorkspacePointFeature, WorkspacePolygonFeature } from './BaseWorkspaceFeature';
import { isUnitsUS } from '../utils/MapPreferences';
import { LinkCheckEvents } from '../LinkCheckPage';
import { WorkspaceEvents, WorkspaceFeatureTypes } from './WorkspaceConstants'
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { BuildingCoverage, EMPTY_BUILDING_COVERAGE } from "./BuildingCoverage";

const AP_API_ENDPOINT = '/pro/workspace/api/ap-los';
const AP_RESPONSE_FIELDS = ['name', 'height', 'max_radius', 'no_check_radius',
    'default_cpe_height', 'max_radius_miles', 'height_ft', 'default_cpe_height_ft'];
const AP_SERIALIZER_FIELDS = ['name', 'height', 'max_radius', 'no_check_radius',
    'default_cpe_height'];


const CPE_ENDPOINT = '/pro/workspace/api/cpe';
const CPE_RESPONSE_FIELDS = ['name', 'height', 'height_ft'];
const CPE_SERIALIZER_FIELDS = ['name', 'height'];

const AP_CPE_LINK_ENDPOINT = '/pro/workspace/api/ap-cpe-link';
const AP_CPE_LINK_FIELDS = ['frequency', 'ap', 'cpe'];

const POLYGON_COVERAGE_AREA_ENDPOINT = '/pro/workspace/api/polygon-coverage-area';
const POLYGON_COVERAGE_AREA_FIELDS: string[] = [];

const LINK_AP_INDEX = 0;
const LINK_CPE_INDEX = 1;

export class AccessPoint extends WorkspacePointFeature {
    readonly links: Map<CPE, APToCPELink> // mapbox ID
    coverage: BuildingCoverage;
    awaitingCoverage: boolean;

    constructor(map: mapboxgl.Map,
                draw: MapboxDraw,
                featureData: Feature<Geometry, any> | string) {
        super(map, draw, featureData, AP_API_ENDPOINT, AP_RESPONSE_FIELDS, AP_SERIALIZER_FIELDS, WorkspaceFeatureTypes.AP);
        this.links = new Map();
        this.coverage = EMPTY_BUILDING_COVERAGE
        this.awaitingCoverage = false;
    }

    create(successFollowup?: (resp: any) => void) {
        super.create((resp) => {
            PubSub.publish(WorkspaceEvents.AP_UPDATE, {features: [this.getFeatureData()]});
            
            if (successFollowup) {
                successFollowup(resp);
            }
        });
    }

    update(successFollowup?: (resp: any) => void) {
        super.update((resp: any) => {
            let feature = this.draw.get(this.mapboxId);
            this.coverage = EMPTY_BUILDING_COVERAGE;

            // @ts-ignore
            this.draw.setFeatureProperty(this.mapboxId, 'radius', feature?.properties.max_radius);
            this.moveLinks(this.getFeatureGeometryCoordinates() as [number, number]);
            PubSub.publish(WorkspaceEvents.AP_UPDATE, {features: [this.getFeatureData()]});

            if (successFollowup) {
                successFollowup(resp);
            }
        });
    }

    delete(successFollowup ?: (resp: any) => void) {
        super.delete((resp) => {
            this.links.forEach((link, cpe) => {
                cpe.ap = undefined;

                // Link is already deleted in backend because of cascading delete
                let deletedLink = link.getFeatureData();
                this.removeFeatureFromMap(link.mapboxId);
                let deletedCPE = cpe.getFeatureData();
                this.removeFeatureFromMap(cpe.mapboxId);
                this.map.fire('draw.delete', {features: [deletedLink, deletedCPE]});
            });
            this.links.clear();

            if (successFollowup) {
                successFollowup(resp);
            }
        });
    }

    move(newCoords: [number, number]) {
        super.move(newCoords);
        this.moveLinks(newCoords);
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
    linkCPE(cpe: CPE) : APToCPELink {
        if (this.links.has(cpe)) {
            // @ts-ignore
            return this.links.get(cpe);
        }
        const newLinkFeature: Feature<LineString, any> = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    this.getFeatureGeometryCoordinates(),
                    cpe.getFeatureGeometryCoordinates()
                ]
            },
            "properties": {
            }
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
}


export class CPE extends WorkspacePointFeature {
    ap?: AccessPoint

    constructor(map: MapboxGL.Map,
                draw: MapboxDraw,
                featureData: Feature<Geometry, any>) {
        super(map, draw, featureData, CPE_ENDPOINT, CPE_RESPONSE_FIELDS, CPE_SERIALIZER_FIELDS, WorkspaceFeatureTypes.CPE);
    }

    /**
     * Links the CPE with the given AP and creates an APToCPELink object to represent the link.
     * @param cpe AP to link to this CPE.
     * @returns The AP to CPE link object created, or undefined if link already exists.
     */
    linkAP(ap: AccessPoint): APToCPELink {
        return ap.linkCPE(this);
    }

    update(successFollowup?: (resp: any) => void) {
        super.update((resp: any) => {
            PubSub.publish(WorkspaceEvents.AP_SELECTED, {features: [this.getFeatureData()]});
            this.moveLink(this.getFeatureGeometryCoordinates() as [number, number]);
            if (successFollowup) {
                successFollowup(resp);
            }
        });
    }

    move(newCoords: [number, number]) {
        super.move(newCoords);
        this.moveLink(newCoords);
    }

   delete(successFollowup ?: (resp: any) => void) {
        super.delete((resp) => {
            if (this.ap) {
                let link = this.ap.links.get(this) as APToCPELink;
                this.ap.links.delete(this);
                let removedLink = link.getFeatureData();
                this.removeFeatureFromMap(link.mapboxId);
                if (removedLink) {
                    this.map.fire('draw.delete', {features: [removedLink]});
                }
                this.ap = undefined;
            }

            if (successFollowup) {
                successFollowup(resp);
            }
        });
    }

    private moveLink(newCoords: [number, number]) {
        if (this.ap) {
            let link = this.ap.links.get(this);
            link?.moveVertex(LINK_CPE_INDEX, newCoords);
        }
    }
}


export class APToCPELink extends WorkspaceLineStringFeature {
    ap: AccessPoint
    cpe: CPE

    constructor(map: MapboxGL.Map,
                draw: MapboxDraw,
                featureData: Feature<LineString, any> | string,
                ap: AccessPoint,
                cpe: CPE) {
        super(map, draw, featureData, AP_CPE_LINK_ENDPOINT, AP_CPE_LINK_FIELDS, AP_CPE_LINK_FIELDS, WorkspaceFeatureTypes.AP_CPE_LINK);
        this.ap = ap;
        this.cpe = cpe;
        this.setFeatureProperty('ap', this.ap.workspaceId);
        this.setFeatureProperty('cpe', this.cpe.workspaceId);
    }

    create(successFollowup ?: (resp: any) => void) {
        super.create((resp) => {
            // Set inputs for AP and CPE
            const apData = {
                radio: 0,
                latitude: this.ap.getFeatureGeometryCoordinates()[1],
                longitude: this.ap.getFeatureGeometryCoordinates()[0],
                height: isUnitsUS() ? this.ap.getFeatureProperty('height_ft') : this.ap.getFeatureProperty('height'),
                name: this.ap.getFeatureProperty('name')
            };
            PubSub.publish(LinkCheckEvents.SET_INPUTS, apData);

            const cpeData = {
                radio: 1,
                latitude: this.cpe.getFeatureGeometryCoordinates()[1],
                longitude: this.cpe.getFeatureGeometryCoordinates()[0],
                height: isUnitsUS() ? this.cpe.getFeatureProperty('height_ft') : this.cpe.getFeatureProperty('height'),
                name: this.cpe.getFeatureProperty('name')
            };
            PubSub.publish(LinkCheckEvents.SET_INPUTS, cpeData);

            if (successFollowup) {
                successFollowup(resp);
            }
        });
    }

    // Delete the CPE when deleting a link
    delete(successFollowup ?: (resp: any) => void) {
        super.delete((resp) => {
            this.cpe.ap = undefined;
            this.ap.links.delete(this.cpe);
            let cpeData = this.cpe.getFeatureData();
            this.removeFeatureFromMap(this.cpe.mapboxId);
            if (cpeData) {
                this.map.fire('draw.delete', {features: [cpeData]});
            }

            if (successFollowup) {
                successFollowup(resp);
            }
        });
    }

    switchAP(newAP: AccessPoint) {
        if (newAP !== this.ap) {
            // Delete old AP data
            this.ap.links.delete(this.cpe);

            // Set new AP
            this.ap = newAP;
            this.ap.links.set(this.cpe, this);
            this.cpe.ap = newAP;
            this.setFeatureProperty('ap', newAP.workspaceId);
            this.moveVertex(LINK_AP_INDEX, newAP.getFeatureGeometryCoordinates() as [number, number]);
        }
    }
}


export class CoverageArea extends WorkspacePolygonFeature {
    coverage: BuildingCoverage;
    awaitingCoverage: boolean;

    constructor(map: MapboxGL.Map,
        draw: MapboxDraw,
        featureData: Feature<Polygon, any>) {
        super(map, draw, featureData, POLYGON_COVERAGE_AREA_ENDPOINT, POLYGON_COVERAGE_AREA_FIELDS, POLYGON_COVERAGE_AREA_FIELDS, WorkspaceFeatureTypes.COVERAGE_AREA);
        this.coverage = EMPTY_BUILDING_COVERAGE;
        this.awaitingCoverage = false;
    }

    update(successFollowup?: (resp: any) => void) {
        super.update((resp: any) => {
            PubSub.publish(WorkspaceEvents.AP_UPDATE, {features: [this.getFeatureData()]});

            if (successFollowup) {
                successFollowup(resp);
            }
        });
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
