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

export class AccessPoint extends WorkspacePointFeature {
    private readonly links: Map<CPE, APToCPELink> // mapbox ID

    constructor(draw: MapboxDraw,
                featureData: Feature<Geometry, any>) {
        super(draw, featureData, AP_API_ENDPOINT, AP_RESPONSE_FIELDS, AP_SERIALIZER_FIELDS);
        this.links = new Map();
    }

    create(successFollowup?: (resp: any) => void) {
        super.create((resp) => {
            const data = {
                radio: 0,
                latitude: this.featureData.geometry.coordinates[1],
                longitude: this.featureData.geometry.coordinates[0],
                height: isUnitsUS() ? this.featureData.properties?.height_ft : this.featureData.properties?.height,
                name: this.featureData.properties?.name
            };
            PubSub.publish(LinkCheckEvents.SET_INPUTS, data);
            PubSub.publish(WorkspaceEvents.AP_SELECTED, {features: [this.featureData]});
            
            if (successFollowup) {
                successFollowup(resp);
            }
        });
    }

    update(newFeatureData: any, successFollowup?: (resp: any) => void) {
        super.update(newFeatureData, (resp: any) => {
            PubSub.publish(WorkspaceEvents.AP_RENDER, {features: [this.featureData]});
            PubSub.publish(WorkspaceEvents.AP_SELECTED, {features: [this.featureData]});
            if (successFollowup) {
                successFollowup(resp);
            }
        });
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
        const newLink = new APToCPELink(this.draw, newLinkFeature, this, cpe);
        return newLink;
    }
}

export class CPE extends WorkspacePointFeature {
    ap?: AccessPoint

    constructor(draw: MapboxDraw,
                featureData: Feature<Geometry, any>) {
        super(draw, featureData, CPE_ENDPOINT, CPE_RESPONSE_FIELDS, CPE_SERIALIZER_FIELDS);
    }

    /**
     * Links the CPE with the given AP and creates an APToCPELink object to represent the link.
     * @param cpe AP to link to this CPE.
     * @returns The AP to CPE link object created, or undefined if link already exists.
     */
    linkAP(ap: AccessPoint): APToCPELink {
        return ap.linkCPE(this);
    }
}

export class APToCPELink extends WorkspaceLineStringFeature {
    ap: AccessPoint
    cpe: CPE

    constructor(draw: MapboxDraw,
                featureData: Feature<LineString, any>,
                ap: AccessPoint,
                cpe: CPE) {
        super(draw, featureData, AP_CPE_LINK_ENDPOINT, AP_CPE_LINK_FIELDS, AP_CPE_LINK_FIELDS);
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
