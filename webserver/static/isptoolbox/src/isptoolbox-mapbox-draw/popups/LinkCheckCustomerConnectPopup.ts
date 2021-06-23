import mapboxgl, * as MapboxGL from "mapbox-gl";
import { Feature, Geometry, Point, LineString, GeoJsonProperties, Position }  from 'geojson';
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { distance, point } from "@turf/turf";
import { isUnitsUS } from '../../utils/MapPreferences';
import { km2miles } from '../../LinkCalcUtils';
import { LinkCheckBasePopup } from "./LinkCheckBasePopup";
import { AccessPoint, CPE } from '../../workspace/WorkspaceFeatures';
import { WorkspaceEvents, WorkspaceFeatureTypes } from "../../workspace/WorkspaceConstants";
import { BuildingCoverage, BuildingCoverageStatus, updateCoverageStatus } from "../../workspace/BuildingCoverage";
import { LinkCheckLocationSearchTool } from "../../organisms/LinkCheckLocationSearchTool";
import { ACCESS_POINT_BUILDING_LAYER, WorkspaceManager } from "../../workspace/WorkspaceManager";
import { BaseWorkspaceFeature } from "../../workspace/BaseWorkspaceFeature";
import { DEFAULT_RADIUS } from "../APDrawMode";
import pass_svg from '../styles/pass-icon.svg';
import fail_svg from '../styles/fail-icon.svg';

const DRAW_PTP_BUTTON_ID = 'draw-ptp-btn-customer-popup';
const SWITCH_TOWER_LINK_ID = 'cpe-switch-tower-link-customer-popup';
const BACK_TO_MAIN_LINK_ID = 'back-to-main-link-customer-popup';
const VIEW_LOS_BUTTON_ID = 'view-los-btn-customer-popup';
const PLACE_TOWER_LINK_ID = 'place-tower-link-customer-popup';
const STATUS_MESSAGE_DIV_ID = 'status-message-div-customer-popup';
const RADIO_TOWER_CONNECT_DIV_ID = 'radio-tower-connect-div-customer-popup';
const CONNECT_TOWER_INDEX_LINK_BASE_ID = 'connect-tower-link-customer-popup';
const CONNECT_TOWER_INDEX_STATUS_ICON_BASE_ID = 'connect-tower-status-icon-customer-popup';

const EMPTY_BUILDING_ID = -1;

// Five decimal places of precision for lat longs,
const EPSILON = 0.000001

const BACK_SVG = `<svg class="back-icon" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0)">
    <path d="M8.70692 10.2929L4.41392 5.99992L8.70692 1.70692C8.88908 1.51832 8.98987 1.26571 8.98759 1.00352C8.98531 0.741321 8.88015 0.490508 8.69474 0.3051C8.50933 0.119692 8.25852 0.0145232 7.99632 0.0122448C7.73412 0.00996636 7.48152 0.110761 7.29292 0.292919L2.29292 5.29292C2.10545 5.48045 2.00013 5.73475 2.00013 5.99992C2.00013 6.26508 2.10545 6.51939 2.29292 6.70692L7.29292 11.7069C7.38517 11.8024 7.49551 11.8786 7.61751 11.931C7.73952 11.9834 7.87074 12.011 8.00352 12.0122C8.1363 12.0133 8.26798 11.988 8.39087 11.9377C8.51377 11.8875 8.62542 11.8132 8.71931 11.7193C8.81321 11.6254 8.88746 11.5138 8.93774 11.3909C8.98802 11.268 9.01332 11.1363 9.01217 11.0035C9.01101 10.8707 8.98343 10.7395 8.93102 10.6175C8.87861 10.4955 8.80243 10.3852 8.70692 10.2929Z" fill="white"/>
</g>
<defs>
    <clipPath id="clip0">
        <rect width="12" height="12" fill="white" transform="translate(12) rotate(90)"/>
    </clipPath>
</defs>
</svg>`


export class LinkCheckCustomerConnectPopup extends LinkCheckBasePopup {
    protected apDistances: Map<AccessPoint, number>; // AP to distance from customer
    protected accessPoints: Array<AccessPoint>; // Sorted array of valid APs, by distance from customer
    protected apConnectIndex: number;
    protected losStatus: BuildingCoverageStatus;
    protected buildingId: number;
    protected marker: LinkCheckLocationSearchTool;
    protected ptpRowPrompt: string;
    private static _instance: LinkCheckCustomerConnectPopup;

    /*
    ----------------------------------
    GETTERS, SETTERS, AND CONSTRUCTORS
    ----------------------------------
    */
    constructor(map: mapboxgl.Map, draw: MapboxDraw, marker: LinkCheckLocationSearchTool) {
        super(map, draw);
        this.marker = marker;
        this.accessPoints = [];
        this.apDistances = new Map();
        this.buildingId = EMPTY_BUILDING_ID;
        this.losStatus = BuildingCoverageStatus.UNSERVICEABLE;
        this.ptpRowPrompt = 'Draw PtP to:'
        this.apConnectIndex = 0;
        PubSub.subscribe(WorkspaceEvents.AP_COVERAGE_UPDATED, this.onCoverageUpdate.bind(this));
        if (!LinkCheckCustomerConnectPopup._instance) {
            LinkCheckCustomerConnectPopup._instance = this;
        }
    }

    setBuildingId(buildingId: number) {
        this.buildingId = buildingId;
    }

    getAccessPoints(): Array<AccessPoint> {
        return this.accessPoints;
    }

    protected getHTML() {
        return (this.accessPoints.length > 0) ? this.getInCoverageAreaMainPageHTML() : this.getNotInCoverageAreaHTML();
    }

    protected setEventHandlers() {
        (this.accessPoints.length > 0) ? this.setInCoverageAreaMainPageEventHandlers() : this.setNotInCoverageAreaEventHandlers();
    }

    show() {
        if (!this.popup.isOpen()) {
            this.calculateCoverageStatus();
            super.show();
            if (this.accessPoints.length > 0) {
                this.highlightAllAPFeatures();
            }
        }
    }

    static getInstance() {
        if (LinkCheckCustomerConnectPopup._instance) {
            return LinkCheckCustomerConnectPopup._instance;
        }
        else {
            throw new Error('No instance of LinkCheckCustomerConnectPopup instantiated.')
        }
    }

    protected cleanup() {
        this.accessPoints.length = 0;
        this.apDistances.clear();
        this.losStatus = BuildingCoverageStatus.UNSERVICEABLE;
        this.apConnectIndex = 0;
        this.buildingId = EMPTY_BUILDING_ID;
        this.marker.onPopupClose();
    }

    /*
    ----------------------------------------------------------------------
    FUNCTONALITY FOR CONNECTING AP TO CPE FROM BUILDING - IN COVERAGE AREA
    ----------------------------------------------------------------------
    */
    private getStatusHTMLElements(status: BuildingCoverageStatus): {
        icon: string,
        divClass: string,
        message: string
    } {
        switch(status) {
            case BuildingCoverageStatus.SERVICEABLE:
                return {
                    icon: pass_svg,
                    divClass: 'title success',
                    message: 'Clear line of sight'
                };
            case BuildingCoverageStatus.UNSERVICEABLE:
                return {
                    icon: fail_svg,
                    divClass: 'title fail',
                    message: 'No clear line of sight'
                };
            case BuildingCoverageStatus.UNKNOWN:
                return {
                    icon: '',
                    divClass: 'title',
                    message: 'Check line of sight'
                };
        }
    }

    protected getButtonRowHTML() {
        return `
            <div class="button-row">
                <button class='btn btn-primary isptoolbox-btn' id='${VIEW_LOS_BUTTON_ID}'>View Line of Sight</button>
                <a id='${PLACE_TOWER_LINK_ID}' class="link">Place Tower</a>
            </div>
        `;
    }

    protected getInCoverageAreaMainPageHTML() {
        let apName = this.accessPoints[this.apConnectIndex].getFeatureProperty('name');
        let apDist = this.apDistances.get(this.accessPoints[this.apConnectIndex]);
        let statusElements = this.getStatusHTMLElements(this.losStatus);
        return `
            <div class="tooltip--cpe">
                <div id="${STATUS_MESSAGE_DIV_ID}" class="${statusElements.divClass}">
                    <h6>${statusElements.message}                    
                        <img src=${this.losStatus === BuildingCoverageStatus.UNKNOWN ? '' : statusElements.icon} >
                    </h6>
                </div>

                <div class="description">
                    <p class="bold">${this.street}</p>
                    <p class="small">${this.city}</p>
                    <p class="small">${this.displayLatLng()}</p>
                </div>

                <div class="description section">
                    <div class="draw-ptp-row">
                        <p class="small">${this.ptpRowPrompt}</p>
                        ${this.accessPoints.length > 1 ? `<a id='${SWITCH_TOWER_LINK_ID}' class="link">Switch</a>` : ''}
                    </div>
                    <div id="${RADIO_TOWER_CONNECT_DIV_ID}">
                        <p><span class="bold">${apName}</span> - ${apDist?.toFixed(2)} ${isUnitsUS() ? 'mi' : 'km'}</p>
                    </div>
                </div>
                ${this.getButtonRowHTML()}
            </div>
        `;
    }

    protected getSwitchTowerHTML() {
        return `
            <div class="tooltip--switch-towers">
                <div class="title">
                    <h6>
                        <a id='${BACK_TO_MAIN_LINK_ID}'> 
                            ${BACK_SVG}
                        </a> 
                        Towers within Coverage
                     </h6>
                </div>
                <div>
                    <ul>
                        ${this.getAccessPointsSwitchTowerHTML()}
                    </ul>
                </div>
            </div>
        `;
    }

    protected getAccessPointsSwitchTowerHTML() {
        let retval = '';
        this.accessPoints.forEach((ap: AccessPoint, i: number) => {
            let apName = ap.getFeatureData().properties?.name;
            let apDist = this.apDistances.get(ap);
            let apStatus = ap.coverage.getCoverageStatus(this.buildingId);
            let statusIcon = this.getStatusHTMLElements(apStatus).icon;

            retval += `
                <li id='${CONNECT_TOWER_INDEX_LINK_BASE_ID}-${i}'>
                    <div>
                        <p>${apName} - ${apDist?.toFixed(2)} ${isUnitsUS() ? 'mi' : 'km'}</p>
                        <a class="link">View LOS</a>
                    </div>
                    <div id='${CONNECT_TOWER_INDEX_STATUS_ICON_BASE_ID}-${i}'>
                        <img src="${statusIcon}"/>
                    </div>
                </li>
            `
        });
        return retval;
    }

    setInCoverageAreaMainPageEventHandlers() {
        $(`#${SWITCH_TOWER_LINK_ID}`).on('click', () => {
            this.popup.setHTML(this.getSwitchTowerHTML());
            this.setSwitchTowerEventHandlers();
        });

        $(`#${VIEW_LOS_BUTTON_ID}`).on('click', () => {
            this.onViewLOS();
        });

        $(`#${PLACE_TOWER_LINK_ID}`).on('click', () => {
            this.onPlaceTower();
        });
    }

    setSwitchTowerEventHandlers() {
        $(`#${BACK_TO_MAIN_LINK_ID}`).on('click', () => {
            this.popup.setHTML(this.getInCoverageAreaMainPageHTML());
            this.setInCoverageAreaMainPageEventHandlers();
        });

        this.accessPoints.forEach((_: AccessPoint, i: number) => {
            $(`#${CONNECT_TOWER_INDEX_LINK_BASE_ID}-${i}`).on('click', () => {
                this.apConnectIndex = i;
                this.onViewLOS();
            });

            $(`#${CONNECT_TOWER_INDEX_LINK_BASE_ID}-${i}`).on('mouseenter', () => {
                this.highlightAndSelectAP(this.accessPoints[i])
            });

            $(`#${CONNECT_TOWER_INDEX_LINK_BASE_ID}-${i}`).on('mouseleave', () => {
                this.highlightAllAPFeatures();
            });
        });
    }

    /*
    --------------------------------------------------------------
    FUNCTONALITY FOR NO AP COVERAGE AREA - DRAW PTP OR PLACE TOWER
    --------------------------------------------------------------
    */

    protected getNotInCoverageAreaHTML() {
        return `
        <div class="tooltip--location">
            <div class="title"> 
                <h6>${this.street}</h6>
            </div>
            <div class="description">
                <p>${this.city}</p>
                <p>${this.displayLatLng()}</p>
            </div>
            <div class="button-row">
                <button class='btn btn-primary isptoolbox-btn' id='${DRAW_PTP_BUTTON_ID}'>Draw PtP</button>
                <a id='${PLACE_TOWER_LINK_ID}' class="link">Place Tower</a>
            </div>
        </div>
        `
    }

    protected setNotInCoverageAreaEventHandlers() {     
        $(`#${DRAW_PTP_BUTTON_ID}`).on('click', () => {
            this.onDrawPtPLink();
        });

        $(`#${PLACE_TOWER_LINK_ID}`).on('click', () => {
            this.onPlaceTower();
        });
    }

    /*
    -----------------------
    OTHER UTILITY FUNCTIONS
    -----------------------
    */
    protected calculateCoverageStatus() {
        // Set APs.
        let accessPoints = Object.values(WorkspaceManager.getInstance().features).filter((feature: BaseWorkspaceFeature) =>
            feature.getFeatureType() === WorkspaceFeatureTypes.AP
        ) as AccessPoint[];

        // Filter APs by whether or not the lat long is in each AP's radius, or building in coverage area.
        let customerPt = point(this.lnglat);
        accessPoints.forEach((ap: AccessPoint) => {
            let distFromCustomer = distance(customerPt, ap.getFeatureData().geometry);
            if (distFromCustomer <= ap.getFeatureProperty('max_radius') || ap.coverage.includes(this.buildingId)) {
                this.accessPoints.push(ap);
                this.apDistances.set(ap, isUnitsUS() ? km2miles(distFromCustomer) : distFromCustomer);
            }
        });

        // sort by distance to customer
        this.accessPoints.sort((ap1: AccessPoint, ap2: AccessPoint) => {
            // @ts-ignore
            return this.apDistances.get(ap1) - this.apDistances.get(ap2);
        });

        this.calculateAPConnectIndex();
    }

    protected calculateAPConnectIndex() {
        // set apConnect index to first tower with LOS. If there isn't any, mark
        // set to closest tower.
        this.losStatus = BuildingCoverageStatus.UNSERVICEABLE;
        this.accessPoints.every((ap: AccessPoint, i: number) => {
            this.losStatus = updateCoverageStatus(this.losStatus, ap.coverage.getCoverageStatus(this.buildingId));
            if (this.losStatus === BuildingCoverageStatus.SERVICEABLE) {
                this.apConnectIndex = i;
                return false;
            }
            else {
                return true;
            }
        });
    }

    protected onDrawPtPLink() {
        //@ts-ignore
        this.draw.changeMode('draw_link', {start: this.lnglat});
        this.map.fire('draw.modechange', {mode: 'draw_link'});
        this.marker.hide();
        this.hide();
    }

    protected onViewLOS() {
        let ap = this.accessPoints[this.apConnectIndex];
        let newCPE = {
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': this.lnglat
            },
            'properties': {
                'name': this.street,
                'ap': ap.workspaceId,
                'feature_type': WorkspaceFeatureTypes.CPE,
                'height': ap.getFeatureProperty('default_cpe_height')
            }
        } as Feature<Point, any>;
        this.map.fire('draw.create', {features: [newCPE]});
        this.marker.hide();
        this.hide();
    }

    protected onPlaceTower() {
        const newAP = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: this.lnglat
            },
            properties: {
                radius: DEFAULT_RADIUS
            }
        } as Feature<Point, any>
        this.map.fire('draw.create', {features: [newAP]});
        this.marker.hide();
        this.hide();
    }

    protected onCoverageUpdate(msg: string, data: any) {
        if (this.popup.isOpen()) {
            this.accessPoints.every((ap: AccessPoint, i: number) => {
                if (ap.workspaceId === data.uuid) {
                    let apStatus = ap.coverage.getCoverageStatus(this.buildingId);
                    let statusIcon = this.getStatusHTMLElements(apStatus).icon;
                    $(`#${CONNECT_TOWER_INDEX_STATUS_ICON_BASE_ID}-${i}`).html(`<img src="${statusIcon}"/>`);

                    this.calculateAPConnectIndex();
                    let apName = this.accessPoints[this.apConnectIndex].getFeatureProperty('name');
                    let apDist = this.apDistances.get(this.accessPoints[this.apConnectIndex]);
                    let statusElements = this.getStatusHTMLElements(this.losStatus);

                    $(`#${STATUS_MESSAGE_DIV_ID}`).attr('class', statusElements.divClass);
                    $(`#${STATUS_MESSAGE_DIV_ID}`).html(`
                        <h6>${statusElements.message}
                            <img src=${this.losStatus === BuildingCoverageStatus.UNKNOWN ? '' : statusElements.icon} >
                        </h6>
                    `);
                    $(`#${RADIO_TOWER_CONNECT_DIV_ID}`).html(`
                        <p><span class="bold">${apName}</span> - ${apDist?.toFixed(2)} ${isUnitsUS() ? 'mi' : 'km'}</p>
                    `)
                    return false;
                }
                else {
                    return true;
                }
            });
        }
    }

    protected highlightAndSelectAllAPs() {
        this.changeSelection(this.accessPoints);
    }

    protected highlightAndSelectAP(ap: AccessPoint) {
        this.changeSelection([ap]);
    }

    protected changeSelection(features: Array<BaseWorkspaceFeature>) {
        let feats = features.map((f: BaseWorkspaceFeature) => f.mapboxId);
        this.draw.changeMode('simple_select', {featureIds: feats});
        this.map.fire('draw.modechange', { mode: 'simple_select'});
        PubSub.publish(WorkspaceEvents.AP_RENDER_SELECTED, {});
    }

    protected highlightAllAPFeatures() {
        this.highlightFeatures(this.accessPoints);
    }

    protected highlightFeatures(aps: Array<BaseWorkspaceFeature>) {
        const features = aps.map(f => {return f.getFeatureData()})
        PubSub.publish(WorkspaceEvents.AP_RENDER_GIVEN, {features});
    }
}


export class LinkCheckVertexClickCustomerConnectPopup extends LinkCheckCustomerConnectPopup {
    private selectedFeatureId: string;
    private selectedVertex: number;
    private tooltipAction: boolean;
    private static _subclass_instance: LinkCheckVertexClickCustomerConnectPopup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw, marker: LinkCheckLocationSearchTool) {
        super(map, draw, marker);
        this.tooltipAction = false;
        if (!LinkCheckVertexClickCustomerConnectPopup._subclass_instance) {
            LinkCheckVertexClickCustomerConnectPopup._subclass_instance = this;
        }
    }

    setSelectedFeatureId(selectedFeatureId: string) {
        this.selectedFeatureId = selectedFeatureId;
    }

    setSelectedVertex(selectedVertex: number) {
        this.selectedVertex = selectedVertex;
    }

    static getInstance() {
        if (LinkCheckVertexClickCustomerConnectPopup._subclass_instance) {
            return LinkCheckVertexClickCustomerConnectPopup._subclass_instance;
        }
        else {
            throw new Error('No instance of LinkCheckVertexClickCustomerConnectPopup instantiated.')
        }
    }

    protected cleanup() {
        // Revert selection back to original direct select state if that was how this
        // popup was accessed.
        if (!this.tooltipAction) {
            this.draw.changeMode('direct_select', {featureId: this.selectedFeatureId});
            this.map.fire('mode.change', {mode: 'direct_select'});
        }
        this.tooltipAction = false;
        super.cleanup();
    }
    
    protected onDrawPtPLink() {
        this.tooltipAction = true;
        super.onDrawPtPLink();
    }

    protected onPlaceTower() {
        const sameVertex = (coord1: [number, number], coord2: [number, number]) => {
            return (Math.abs(coord1[0] - coord2[0]) < EPSILON && Math.abs(coord1[1] - coord2[1]) < EPSILON);
        };

        // Find all non-workspace PtP links sharing a vertex with the selected one

        // @ts-ignore
        let vertex = this.draw.get(this.selectedFeatureId).geometry.coordinates[this.selectedVertex] as [number, number];
        let sharedLinks = this.draw.getFeatureIdsAt(this.map.project(vertex)).map((id) => this.draw.get(id)).filter((feat) => {
            return (feat && feat.properties && feat.geometry.type === 'LineString' && !feat.properties.uuid &&
                (sameVertex(feat.geometry.coordinates[0] as [number, number], vertex) || sameVertex(feat.geometry.coordinates[1] as [number, number], vertex))
            );
        });


        // Find lat longs of CPEs
        let cpeLngLats = sharedLinks.map((feature: Feature<LineString, any>) => {
            let coords = feature.geometry.coordinates;
            return (coords[0][0] == this.lnglat[0] && coords[0][1] == this.lnglat[1]) ? coords[1] : coords[0]
        });

        let ptpLinksToRemove = sharedLinks.map((feature: Feature<LineString, any>) => {
            return feature.id;
        });

        this.tooltipAction = true;

        const newAP = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: this.lnglat
            },
            properties: {
                radius: DEFAULT_RADIUS,
                cpeLngLats: cpeLngLats,
                ptpLinksToRemove: ptpLinksToRemove,
            }
        } as Feature<Point, any>
        this.map.fire('draw.create', {features: [newAP]});
        this.marker.hide();
        this.hide();
    }
}


export class LinkCheckCPEClickCustomerConnectPopup extends LinkCheckCustomerConnectPopup {
    private cpe: CPE;
    private static _subclass_instance: LinkCheckCPEClickCustomerConnectPopup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw, marker: LinkCheckLocationSearchTool) {
        super(map, draw, marker);
        this.ptpRowPrompt = 'PtP drawn to:';
        if (!LinkCheckCPEClickCustomerConnectPopup._subclass_instance) {
            LinkCheckCPEClickCustomerConnectPopup._subclass_instance = this;
        }
    }

    static getInstance() {
        if (LinkCheckCPEClickCustomerConnectPopup._subclass_instance) {
            return LinkCheckCPEClickCustomerConnectPopup._subclass_instance;
        }
        else {
            throw new Error('No instance of LinkCheckCPEClickCustomerConnectPopup instantiated.')
        }
    }

    setCPE(cpe: CPE) {
        this.cpe = cpe;
        this.setLngLat(cpe.getFeatureGeometryCoordinates() as [number, number]);
    }

    show() {
        if (!this.popup.isOpen()) {
            // Find the building ID by rendering the entire area, then doing a query on underlying building ID.
            // We set a delay on showing tooltip to allow time for building coverage to render.
            this.changeSelection([]);
            setTimeout(() => {
                let building = this.map.queryRenderedFeatures(this.map.project(this.lnglat), {layers: [ACCESS_POINT_BUILDING_LAYER]})[0];
                if (building) {
                    this.setBuildingId(building.properties?.msftid);
                }
                super.show();
                // Add delete btn event handler
                $(`#cpe-delete-btn`).off().on('click', () => {
                    this.hide();
                    this.cpe.delete();
                })
            }, 50);
        }
    }

    cleanup() {
        this.changeSelection([this.cpe]);
        super.cleanup();
    }

    protected getButtonRowHTML() {
        return `
            <div class="node-edits">
                <a id="cpe-delete-btn">Delete Radio</a>
            </div>
        `;
    }

    protected calculateAPConnectIndex() {
        // Set AP connect index to AP that matches connected AP.
        this.losStatus = BuildingCoverageStatus.UNSERVICEABLE;
        this.accessPoints.forEach((ap: AccessPoint, i: number) => {
            this.losStatus = updateCoverageStatus(this.losStatus, ap.coverage.getCoverageStatus(this.buildingId));
            if (ap === this.cpe.ap) {
                this.apConnectIndex = i;
            }
        });
    }

    protected onViewLOS() {
        let ap = this.accessPoints[this.apConnectIndex];
        if (ap !== this.cpe.ap) {
            let link = this.cpe.ap?.links.get(this.cpe);
            link?.switchAP(ap);
        }
        this.marker.hide();
        this.hide();
    }

    protected onCoverageUpdate(msg: string, data: any) {
        if (this.popup.isOpen()) {
            if (this.buildingId === EMPTY_BUILDING_ID) {
                let building = this.map.queryRenderedFeatures(this.map.project(this.lnglat), {layers: [ACCESS_POINT_BUILDING_LAYER]})[0];
                if (building) {
                    this.setBuildingId(building.properties?.msftid);
                }
            }
            super.onCoverageUpdate(msg, data);
        }
    }
}
