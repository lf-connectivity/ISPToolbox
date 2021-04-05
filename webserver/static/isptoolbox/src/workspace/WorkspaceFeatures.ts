import { Feature, Geometry, Point, LineString, GeoJsonProperties, Position }  from 'geojson';
import { BaseWorkspaceFeature, WorkspaceLineStringFeature, WorkspacePointFeature } from './BaseWorkspaceFeature';
import { isUnitsUS } from '../utils/MapPreferences';
import { LinkCheckEvents } from '../LinkCheckPage';
import { WorkspaceEvents } from './WorkspaceEvents'
import MapboxDraw from '@mapbox/mapbox-gl-draw';

const AP_API_ENDPOINT = '/pro/workspace/api/ap-los';
const AP_FIELDS = ['name', 'height', 'max_radius', 'no_check_radius',
    'default_cpe_height', 'max_radius_miles', 'height_ft'];

const CPE_ENDPOINT = '/pro/workspace/api/cpe';
const CPE_FIELDS = ['name', 'height', 'height_ft'];

const AP_CPE_LINK_ENDPOINT = '/pro/workspace/api/ap-cpe-link';
const AP_CPE_LINK_FIELDS = ['frequency', 'ap', 'cpe'];

export class AccessPoint extends WorkspacePointFeature {
    private readonly links: Map<CPE, APToCPELink> // mapbox ID

    constructor(draw: MapboxDraw,
                featureData: Feature<Geometry, any>) {
        super(draw, featureData, AP_API_ENDPOINT, AP_FIELDS, (resp) => {
            const data = {
                radio: 0,
                latitude: this.featureData.geometry.coordinates[1],
                longitude: this.featureData.geometry.coordinates[0],
                height: isUnitsUS() ? this.featureData.properties?.height_ft : this.featureData.properties?.height,
                name: this.featureData.properties?.name
            };
            PubSub.publish(LinkCheckEvents.SET_INPUTS, data);
            PubSub.publish(WorkspaceEvents.AP_SELECTED, {features: [this.featureData]})
        });

        this.links = new Map();
    }

    /**
     * Links the AP with the given CPE and creates an APToCPELink object to represent the link.
     * @param cpe CPE to link to this AP.
     * @returns The AP to CPE link object created, or undefined if link already exists.
     */
    linkCPE(cpe: CPE) : APToCPELink | undefined {
        if (!this.links.has(cpe)) {
            const newLinkFeature: Feature<LineString, any> = {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [this.featureData.geometry.coordinates,  cpe.featureData.geometry.coordinates]
                },
                "properties": {
                    ap: this.workspaceId,
                    cpe: cpe.workspaceId
                }
            };
    
            // @ts-ignore
            this.draw.add(new_link);
            cpe.ap = this;
            const newLink = new APToCPELink(this.draw, newLinkFeature, this, cpe);
            return newLink;
        }
        return undefined;
    }
}

export class CPE extends WorkspacePointFeature {
    ap?: AccessPoint

    constructor(draw: MapboxDraw,
                featureData: Feature<Geometry, any>) {
        super(draw, featureData, CPE_ENDPOINT, CPE_FIELDS, (resp) => {
            // const cpeData = {
            //     radio: 1,
            //     latitude: this.featureData.geometry.coordinates[1],
            //     longitude: this.featureData.geometry.coordinates[0],
            //     height: isUnitsUS() ? this.featureData.properties?.height_ft : this.featureData.properties?.height,
            //     name: this.featureData.properties?.name
            // };
            // PubSub.publish(LinkCheckEvents.SET_INPUTS, cpeData);
        });
    }

    /**
     * Links the CPE with the given AP and creates an APToCPELink object to represent the link.
     * @param cpe AP to link to this CPE.
     * @returns The AP to CPE link object created, or undefined if link already exists.
     */
    linkAP(ap: AccessPoint): APToCPELink | undefined {
        return ap.linkCPE(this);
    }
}

export class APToCPELink extends WorkspaceLineStringFeature {
    ap: AccessPoint
    cpe: CPE

    constructor(draw: MapboxDraw,
                featureData: Feature<Geometry, any>,
                ap: AccessPoint,
                cpe: CPE) {
        super(draw, featureData, AP_CPE_LINK_ENDPOINT, AP_CPE_LINK_FIELDS, (resp) => {
            // Set inputs for AP and CPE
            const apData = {
                radio: 0,
                latitude: ap.featureData.geometry.coordinates[1],
                longitude: ap.featureData.geometry.coordinates[0],
                height: isUnitsUS() ? ap.featureData.properties?.height_ft : ap.featureData.properties?.height,
                name: ap.featureData.properties?.name
            };
            PubSub.publish(LinkCheckEvents.SET_INPUTS, apData);

            const cpeData = {
                radio: 1,
                latitude: cpe.featureData.geometry.coordinates[1],
                longitude: cpe.featureData.geometry.coordinates[0],
                height: isUnitsUS() ? cpe.featureData.properties?.height_ft : cpe.featureData.properties?.height,
                name: cpe.featureData.properties?.name
            };
            PubSub.publish(LinkCheckEvents.SET_INPUTS, cpeData);
        });

        this.ap = ap;
        this.cpe = cpe;
    }
}