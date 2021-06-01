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

const DRAW_PTP_BUTTON_ID = 'draw-ptp-btn-customer-popup';
const SWITCH_TOWER_LINK_ID = 'cpe-switch-tower-link-customer-popup';
const BACK_TO_MAIN_LINK_ID = 'back-to-main-link-customer-popup';
const VIEW_LOS_BUTTON_ID = 'view-los-btn-customer-popup';
const PLACE_TOWER_LINK_ID = 'place-tower-link-customer-popup';
const CONNECT_TOWER_INDEX_LINK_BASE_ID = 'connect-tower-link-customer-popup';

const EMPTY_BUILDING_ID = -1;

// Five decimal places of precision for lat longs,
const EPSILON = 0.000001

const YES_SVG = `<svg width="12" height="9" viewBox="0 0 12 9" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10.2929 0.292431L3.99992 6.58543L1.70692 4.29243C1.51832 4.11027 1.26571 4.00948 1.00352 4.01176C0.741321 4.01403 0.490508 4.1192 0.3051 4.30461C0.119692 4.49002 0.0145233 4.74083 0.0122448 5.00303C0.00996641 5.26523 0.110761 5.51783 0.292919 5.70643L3.29292 8.70643C3.48045 8.8939 3.73475 8.99922 3.99992 8.99922C4.26508 8.99922 4.51939 8.8939 4.70692 8.70643L11.7069 1.70643C11.8891 1.51783 11.9899 1.26523 11.9876 1.00303C11.9853 0.740832 11.8801 0.49002 11.6947 0.304612C11.5093 0.119204 11.2585 0.014035 10.9963 0.0117566C10.7341 0.00947813 10.4815 0.110272 10.2929 0.292431Z" fill="#42B72A"/>
</svg>`

const NO_SVG = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M7 0C3.15 0 0 3.15 0 7C0 10.85 3.15 14 7 14C10.85 14 14 10.85 14 7C14 3.15 10.85 0 7 0ZM7 1.75C8.1375 1.75 9.1875 2.1 10.0625 2.7125L2.7125 10.0625C2.1 9.1875 1.75 8.1375 1.75 7C1.75 4.1125 4.1125 1.75 7 1.75ZM7 12.25C5.8625 12.25 4.8125 11.9 3.9375 11.2875L11.2875 3.9375C11.9 4.8125 12.25 5.8625 12.25 7C12.25 9.8875 9.8875 12.25 7 12.25Z" fill="#F23E3E"/>
</svg>`

const UNKNOWN_SVG = `<svg width="9" height="13" viewBox="0 0 9 13" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5.7685 8.9475C5.7685 8.225 5.913 7.7915 6.491 7.358C8.0805 6.0575 8.514 5.1905 8.514 4.0345C8.514 2.156 7.2135 1 4.757 1C2.445 1 1 2.5895 1 4.179C1 4.6125 1.1445 5.046 1.289 5.335L3.1675 4.9015C3.1675 4.757 3.023 4.468 3.023 4.3235C3.023 3.312 3.7455 2.734 4.9015 2.734C5.913 2.734 6.491 3.312 6.491 4.0345C6.491 4.9015 6.0575 5.335 5.046 6.202C4.0345 7.069 3.7455 7.647 3.7455 8.6585V8.9475H5.7685V8.9475ZM3.7455 12.56H5.913V10.3925H3.7455V12.56V12.56Z" fill="#A2A2A2" stroke="#919191" stroke-width="0.163934" stroke-miterlimit="10"/>
</svg>`

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
        this.losStatus = BuildingCoverageStatus.UNSERVICEABLE;
        this.ptpRowPrompt = 'Draw PtP to:'
        this.apConnectIndex = 0;
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
                    icon: YES_SVG,
                    divClass: 'title success',
                    message: 'Clear line of sight'
                };
            case BuildingCoverageStatus.UNSERVICEABLE:
                return {
                    icon: NO_SVG,
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
        let apName = this.accessPoints[this.apConnectIndex].featureData.properties?.name;
        let apDist = this.apDistances.get(this.accessPoints[this.apConnectIndex]);
        let statusElements = this.getStatusHTMLElements(this.losStatus);
        return `
            <div class="tooltip--cpe">
                <div class="${statusElements.divClass}">
                    <h6>${statusElements.message} ${this.losStatus === BuildingCoverageStatus.UNKNOWN ? '' : statusElements.icon}</h6>
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
                    <div>
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
            let apName = ap.featureData.properties?.name;
            let apDist = this.apDistances.get(ap);
            let apStatus = ap.coverage.getCoverageStatus(this.buildingId);
            let statusIcon = this.getStatusHTMLElements(apStatus).icon;

            retval += `
                <li id='${CONNECT_TOWER_INDEX_LINK_BASE_ID}-${i}'>
                    <div>
                        <p>${apName} - ${apDist?.toFixed(2)} ${isUnitsUS() ? 'mi' : 'km'}</p>
                        <a class="link">View LOS</a>
                    </div>
                    <div>
                        ${statusIcon}
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
                this.highlightAndSelectAllAPs();
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
            let distFromCustomer = distance(customerPt, ap.featureData.geometry);
            if (distFromCustomer <= ap.featureData?.properties?.max_radius || ap.coverage.includes(this.buildingId)) {
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
                'height': ap.featureData.properties?.default_cpe_height
            }
        } as Feature<Point, any>;
        this.map.fire('draw.create', {features: [newCPE]});
        this.marker.hide();
        this.hide();
    }

    protected onPlaceTower() {
        //@ts-ignore
        this.draw.changeMode('draw_radius', {start: this.lnglat});
        this.map.fire('draw.modechange', {mode: 'draw_radius'});
        this.marker.hide();
        this.hide();
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
        const features = aps.map(f => {return f.featureData})
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
        //@ts-ignore
        this.draw.changeMode('draw_radius', {start: this.lnglat, cpeLngLats: cpeLngLats, ptpLinksToRemove: ptpLinksToRemove});
        this.map.fire('draw.modechange', {mode: 'draw_radius'});
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
        this.setLngLat(cpe.featureData.geometry.coordinates as [number, number]);
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
            }, 50);
        }
    }

    cleanup() {
        this.changeSelection([this.cpe]);
        super.cleanup();
    }

    protected getButtonRowHTML() {
        return ``;
    }

    protected calculateAPConnectIndex() {
        // Set AP connect index to AP that matches connected AP.
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
}