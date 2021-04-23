import mapboxgl, * as MapboxGL from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { distance, point } from "@turf/turf";
import { isUnitsUS } from '../../utils/MapPreferences';
import { km2miles } from '../../LinkCalcUtils';
import { LinkCheckBasePopup } from "./LinkCheckBasePopup";
import { AccessPoint, CPE } from '../../workspace/WorkspaceFeatures';

const SWITCH_TOWER_LINK_ID = 'cpe-switch-tower-link-customer-popup';
const BACK_TO_MAIN_LINK_ID = 'back-to-main-link-customer-popup';
const VIEW_LOS_BUTTON_ID = 'view-los-btn-customer-popup';
const PLACE_TOWER_LINK_ID = 'place-tower-link-customer-popup';
const CONNECT_TOWER_INDEX_LINK_BASE_ID = 'connect-tower-link-customer-popup';

const YES_SVG = `<svg width="12" height="9" viewBox="0 0 12 9" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10.2929 0.292431L3.99992 6.58543L1.70692 4.29243C1.51832 4.11027 1.26571 4.00948 1.00352 4.01176C0.741321 4.01403 0.490508 4.1192 0.3051 4.30461C0.119692 4.49002 0.0145233 4.74083 0.0122448 5.00303C0.00996641 5.26523 0.110761 5.51783 0.292919 5.70643L3.29292 8.70643C3.48045 8.8939 3.73475 8.99922 3.99992 8.99922C4.26508 8.99922 4.51939 8.8939 4.70692 8.70643L11.7069 1.70643C11.8891 1.51783 11.9899 1.26523 11.9876 1.00303C11.9853 0.740832 11.8801 0.49002 11.6947 0.304612C11.5093 0.119204 11.2585 0.014035 10.9963 0.0117566C10.7341 0.00947813 10.4815 0.110272 10.2929 0.292431Z" fill="#42B72A"/>
</svg>`

const NO_SVG = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M7 0C3.15 0 0 3.15 0 7C0 10.85 3.15 14 7 14C10.85 14 14 10.85 14 7C14 3.15 10.85 0 7 0ZM7 1.75C8.1375 1.75 9.1875 2.1 10.0625 2.7125L2.7125 10.0625C2.1 9.1875 1.75 8.1375 1.75 7C1.75 4.1125 4.1125 1.75 7 1.75ZM7 12.25C5.8625 12.25 4.8125 11.9 3.9375 11.2875L11.2875 3.9375C11.9 4.8125 12.25 5.8625 12.25 7C12.25 9.8875 9.8875 12.25 7 12.25Z" fill="#F23E3E"/>
</svg>`

export class LinkCheckCustomerConnectPopup extends LinkCheckBasePopup {
    private apDistances: Map<AccessPoint, number>; // AP to distance from customer
    private apClearLOS: Map<AccessPoint, boolean> // Clear LOS from AP
    private accessPoints: Array<AccessPoint>; // Sorted array of valid APs, by distance from customer
    private apConnectIndex: number;
    private isClearLOS: boolean;
    private static _instance: LinkCheckCustomerConnectPopup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        if (LinkCheckCustomerConnectPopup._instance) {
            return LinkCheckCustomerConnectPopup._instance;
        }
        super(map, draw);
        this.accessPoints = [];
        this.apDistances = new Map();
        this.apClearLOS = new Map();
        LinkCheckCustomerConnectPopup._instance = this;
    }

    setAccessPoints(accessPoints: Array<AccessPoint>) {
        // Filter APs by whether or not the lat long is in each AP's radius
        let customerPt = point(this.lnglat);
        accessPoints.forEach((ap: AccessPoint) => {
            let distFromCustomer = distance(customerPt, ap.featureData.geometry);
            if (distFromCustomer <= ap.featureData?.properties?.max_radius) {
                this.accessPoints.push(ap);
                this.apDistances.set(ap, isUnitsUS() ? km2miles(distFromCustomer) : distFromCustomer);

                // Mocked right now
                this.apClearLOS.set(ap, true);
            }
        });

        // sort by distance to customer
        this.accessPoints.sort((ap1: AccessPoint, ap2: AccessPoint) => {
            // @ts-ignore
            return this.apDistances.get(ap1) - this.apDistances.get(ap2);
        });

        // set apConnect index to first tower with LOS. If there isn't any, mark
        // customer as no clear LOS and set to closest tower.
        this.accessPoints.every((ap: AccessPoint, i: number) => {
            if (this.apClearLOS.get(ap)) {
                this.isClearLOS = true;
                this.apConnectIndex = i;
                return false;
            }
            else {
                return true;
            }
        });
    }

    getAccessPoints(): Array<AccessPoint> {
        return this.accessPoints;
    }

    show() {
        super.show();
        this.setMainPageEventHandlers();
    }

    cleanup() {
        this.accessPoints.length = 0;
        this.apDistances.clear();
        this.apClearLOS.clear();
        this.isClearLOS = false;
        this.apConnectIndex = 0;
    }

    setMainPageEventHandlers() {
        $(`#${SWITCH_TOWER_LINK_ID}`).on('click', () => {
            this.popup.setHTML(this.getSwitchTowerHTML());
            this.setSwitchTowerEventHandlers();
        });

        $(`#${VIEW_LOS_BUTTON_ID}`).on('click', () => {
            // Will do later :)
            console.log('viewing los')
        });

        $(`#${PLACE_TOWER_LINK_ID}`).on('click', () => {
            //@ts-ignore
            this.draw.changeMode('draw_radius', {start: this.lnglat});
            this.map.fire('draw.modechange', {mode: 'draw_radius'});
            this.hide();
        });
    }

    setSwitchTowerEventHandlers() {
        $(`#${BACK_TO_MAIN_LINK_ID}`).on('click', () => {
            this.popup.setHTML(this.getMainPageHTML());
            this.setMainPageEventHandlers();
        });

        this.accessPoints.forEach((_: AccessPoint, i: number) => {
            $(`#${CONNECT_TOWER_INDEX_LINK_BASE_ID}-${i}`).on('click', () => {
                this.apConnectIndex = i;
                this.isClearLOS = this.apClearLOS.get(this.accessPoints[this.apConnectIndex]) ? true : false;
                this.popup.setHTML(this.getMainPageHTML());
                this.setMainPageEventHandlers();
            });
        });
    }

    static getInstance() {
        if (LinkCheckCustomerConnectPopup._instance) {
            return LinkCheckCustomerConnectPopup._instance;
        }
        else {
            throw new Error('No instance of LinkCheckCustomerConnectPopup instantiated.')
        }
    }

    protected getHTML() {
        return this.getMainPageHTML();
    }

    protected getMainPageHTML() {
        let apName = this.accessPoints[this.apConnectIndex].featureData.properties?.name;
        let apDist = this.apDistances.get(this.accessPoints[this.apConnectIndex]);
        return `
            <div>
                <div>
                    <h6>${this.isClearLOS ? `Clear line of sight ${YES_SVG}` : `No clear line of sight ${NO_SVG}`}</h6>
                </div>
                <hr/>
                <div align='center'>
                    <p>${this.street}</p>
                    <p>${this.city}</p>
                    <p>${this.displayLngLat()}</p>
                </div>
                <hr/>
                <div>
                    <div style='display: flex; flex-flow: row; justify-content: space-between;'>
                        <p>Draw PtP to:</p>
                        ${this.accessPoints.length > 1 ? `<a id='${SWITCH_TOWER_LINK_ID}'>Switch</a>` : ''}
                    </div>
                    <div>
                        <p><b>${apName}</b> - ${apDist?.toFixed(2)} ${isUnitsUS() ? 'mi' : 'km'}</p>
                    </div>
                </div>
                <div align='center'>
                    <button class='btn btn-primary isptoolbox-btn' id='${VIEW_LOS_BUTTON_ID}'>View Line of Sight</button>
                    <a id='${PLACE_TOWER_LINK_ID}'>Place Tower</a>
                </div>
            </div>
        `;
    }

    protected getSwitchTowerHTML() {
        return `
            <div>
                <div>
                    <h6><a id='${BACK_TO_MAIN_LINK_ID}'> &#x3008; </a> Towers within Coverage </h6>
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
            let apClear = this.apClearLOS.get(ap);
            retval += `
                <li style='display: flex; flex-flow: row; justify-content: space-between; align-items: center;'>
                    <div>
                        <p><b>${apName}</b> - ${apDist?.toFixed(2)} ${isUnitsUS() ? 'mi' : 'km'}</p>
                        <a id='${CONNECT_TOWER_INDEX_LINK_BASE_ID}-${i}'>View LOS</a>
                    </div>
                    <div>
                        ${apClear ? YES_SVG : NO_SVG}
                    </div>
                </li>
            `
        });
        return retval;
    }
}