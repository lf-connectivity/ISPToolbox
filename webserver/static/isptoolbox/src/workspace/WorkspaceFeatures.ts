import mapboxgl, * as MapboxGL from "mapbox-gl";
import { Feature, Geometry, Point, LineString, GeoJsonProperties, Position }  from 'geojson';
import { BaseWorkspaceFeature, WorkspaceLineStringFeature, WorkspacePointFeature } from './BaseWorkspaceFeature';
import { isUnitsUS } from '../utils/MapPreferences';
import { LinkCheckEvents } from '../LinkCheckPage';
import { WorkspaceEvents } from './WorkspaceConstants'
import MapboxDraw from '@mapbox/mapbox-gl-draw';

const AP_API_ENDPOINT = '/pro/workspace/api/ap-los';
const AP_RESPONSE_FIELDS = ['name', 'height', 'max_radius', 'no_check_radius',
    'default_cpe_height', 'max_radius_miles', 'height_ft'];
const AP_SERIALIZER_FIELDS = ['name', 'height', 'max_radius', 'no_check_radius',
    'default_cpe_height'];


const CPE_ENDPOINT = '/pro/workspace/api/cpe';
const CPE_RESPONSE_FIELDS = ['name', 'height', 'height_ft'];
const CPE_SERIALIZER_FIELDS = ['name', 'height'];

const AP_CPE_LINK_ENDPOINT = '/pro/workspace/api/ap-cpe-link';
const AP_CPE_LINK_FIELDS = ['frequency', 'ap', 'cpe'];

const LINK_AP_INDEX = 0;
const LINK_CPE_INDEX = 1;

export class AccessPoint extends WorkspacePointFeature {
    readonly links: Map<CPE, APToCPELink> // mapbox ID
    coverage: Array<any>;
    awaitingCoverage: boolean;

    constructor(map: mapboxgl.Map,
                draw: MapboxDraw,
                featureData: Feature<Geometry, any>) {
        super(map, draw, featureData, AP_API_ENDPOINT, AP_RESPONSE_FIELDS, AP_SERIALIZER_FIELDS);
        this.links = new Map();
        this.coverage = [];
        this.awaitingCoverage = false;
    }

    create(successFollowup?: (resp: any) => void) {
        super.create((resp) => {
            PubSub.publish(WorkspaceEvents.AP_UPDATE, {features: [this.featureData]});
            
            if (successFollowup) {
                successFollowup(resp);
            }
        });
    }

    update(newFeatureData: Feature<Point, any>, successFollowup?: (resp: any) => void) {
        super.update(newFeatureData, (resp: any) => {
            PubSub.publish(WorkspaceEvents.AP_RENDER, {features: [this.featureData]});
            PubSub.publish(WorkspaceEvents.AP_UPDATE, {features: [this.featureData]});

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
                this.draw.delete(link.mapboxId);
                this.map.fire('draw.delete', {features: [link.featureData]});
            });
            this.links.clear();

            if (successFollowup) {
                successFollowup(resp);
            }
        });
    }


    move(newCoords: [number, number],
        successFollowup ?: (resp: any) => void) {
       super.move(newCoords, successFollowup);

       this.links.forEach((link) => {
           link.moveVertex(LINK_AP_INDEX, newCoords);
       });
   }

    awaitNewCoverage() {
        this.coverage = [];
        this.awaitingCoverage = true;
    }

    setCoverage(coverage: Array<any>) {
        this.coverage = coverage;
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
                "coordinates": [this.featureData.geometry.coordinates,  cpe.featureData.geometry.coordinates]
            },
            "properties": {
            }
        };

        cpe.ap = this;
        const newLink = new APToCPELink(this.map, this.draw, newLinkFeature, this, cpe);
        this.links.set(cpe, newLink);
        return newLink;
    }
}


export class CPE extends WorkspacePointFeature {
    ap?: AccessPoint

    constructor(map: MapboxGL.Map,
                draw: MapboxDraw,
                featureData: Feature<Geometry, any>) {
        super(map, draw, featureData, CPE_ENDPOINT, CPE_RESPONSE_FIELDS, CPE_SERIALIZER_FIELDS);
    }

    /**
     * Links the CPE with the given AP and creates an APToCPELink object to represent the link.
     * @param cpe AP to link to this CPE.
     * @returns The AP to CPE link object created, or undefined if link already exists.
     */
    linkAP(ap: AccessPoint): APToCPELink {
        return ap.linkCPE(this);
    }

    update(newFeatureData: Feature<Point, any>, successFollowup?: (resp: any) => void) {
        super.update(newFeatureData, (resp: any) => {
            PubSub.publish(WorkspaceEvents.AP_SELECTED, {features: [this.featureData]});

            if (successFollowup) {
                successFollowup(resp);
            }
        });
    }

    move(newCoords: [number, number],
         successFollowup ?: (resp: any) => void) {
        super.move(newCoords, (resp) => {
            if (this.ap) {
                let link = this.ap.links.get(this);
                link?.moveVertex(LINK_CPE_INDEX, newCoords, (resp) => {
                    this.map.fire('draw.update', {features: [link?.featureData], action: 'move'});
                });
            }

            if (successFollowup) {
                successFollowup(resp);
            }
       });
   }

   delete(successFollowup ?: (resp: any) => void) {
        super.delete((resp) => {
            if (this.ap) {
                let link = this.ap.links.get(this) as APToCPELink;
                this.ap.links.delete(this);
                this.draw.delete(link.mapboxId);
                this.map.fire('draw.delete', {features: [link.featureData]});
                this.ap = undefined;
            }

            if (successFollowup) {
                successFollowup(resp);
            }
        });
    }
}

export class APToCPELink extends WorkspaceLineStringFeature {
    ap: AccessPoint
    cpe: CPE

    constructor(map: MapboxGL.Map,
                draw: MapboxDraw,
                featureData: Feature<LineString, any>,
                ap: AccessPoint,
                cpe: CPE) {
        super(map, draw, featureData, AP_CPE_LINK_ENDPOINT, AP_CPE_LINK_FIELDS, AP_CPE_LINK_FIELDS);
        this.ap = ap;
        this.cpe = cpe;
        this.draw.setFeatureProperty(this.mapboxId, 'ap', this.ap.workspaceId);
        this.draw.setFeatureProperty(this.mapboxId, 'cpe', this.cpe.workspaceId);
        this.featureData = this.draw.get(this.mapboxId) as Feature<LineString, any>;
    }

    create(successFollowup ?: (resp: any) => void) {
        super.create((resp) => {
            // Set inputs for AP and CPE
            const apData = {
                radio: 0,
                latitude: this.ap.featureData.geometry.coordinates[1],
                longitude: this.ap.featureData.geometry.coordinates[0],
                height: isUnitsUS() ? this.ap.featureData.properties?.height_ft : this.ap.featureData.properties?.height,
                name: this.ap.featureData.properties?.name
            };
            PubSub.publish(LinkCheckEvents.SET_INPUTS, apData);

            const cpeData = {
                radio: 1,
                latitude: this.cpe.featureData.geometry.coordinates[1],
                longitude: this.cpe.featureData.geometry.coordinates[0],
                height: isUnitsUS() ? this.cpe.featureData.properties?.height_ft : this.cpe.featureData.properties?.height,
                name: this.cpe.featureData.properties?.name
            };
            PubSub.publish(LinkCheckEvents.SET_INPUTS, cpeData);

            if (successFollowup) {
                successFollowup(resp);
            }
        });
    }
}
