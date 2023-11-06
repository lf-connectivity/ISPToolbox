// (c) Meta Platforms, Inc. and affiliates. Copyright
import { Feature, Point } from 'geojson';
import LOSCheckWS from '../../../LOSCheckWS';
import { getCookie } from '../../../utils/Cookie';
import { djangoUrl } from '../../../utils/djangoUrl';
import { getSessionID } from '../../../utils/MapPreferences';
import { BaseAjaxCPEPopup, BaseAjaxLinkCheckSwitchSectorPopup } from './BaseAjaxCPEFlowPopups';

const VIEW_LOS_BUTTON = 'view-los-btn-customer-popup';
const DRAW_PTP_BUTTON = 'draw-ptp-btn-customer-popup';
const PLACE_TOWER_BUTTON = 'place-tower-link-customer-popup';

export class AjaxLinkCheckLocationPopup extends BaseAjaxCPEPopup {
    private static _instance: AjaxLinkCheckLocationPopup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        if (AjaxLinkCheckLocationPopup._instance) {
            return AjaxLinkCheckLocationPopup._instance;
        }
        super(map, draw, 'workspace:los-location-form');
        AjaxLinkCheckLocationPopup._instance = this;
    }

    static getInstance() {
        return AjaxLinkCheckLocationPopup._instance;
    }

    protected cleanup() {
        this.geocoderMarkerCleanup();
        super.cleanup();
    }

    protected setEventHandlers(): void {
        super.setEventHandlers();

        $(`#${VIEW_LOS_BUTTON}`)
            .off()
            .on(
                'click',
                this.createTooltipAction(() => {
                    this.createCPE($(`#${VIEW_LOS_BUTTON}`).data('sectorId'));
                    this.hide();
                })
            );

        $(`#${DRAW_PTP_BUTTON}`)
            .off()
            .on('click', this.createTooltipAction(this.onDrawPtP.bind(this)));

        $(`#${PLACE_TOWER_BUTTON}`)
            .off()
            .on('click', this.createTooltipAction(this.onPlaceTower.bind(this)));
    }

    protected getEndpointParams(): any[] {
        return [getSessionID(), this.lnglat[0], this.lnglat[1]];
    }

    protected onDrawPtP() {
        //@ts-ignore
        this.draw.changeMode('draw_link', { start: this.lnglat });
        this.map.fire('draw.modechange', { mode: 'draw_link' });
        this.hide();
    }

    protected onPlaceTower() {
        LOSCheckWS.sendCPELocationRequest(this.lnglat[0], this.lnglat[1]);
        this.hide();
    }

    protected onSwitchSector(): void {
        this.hide();

        let popup = AjaxLinkCheckLocationSwitchSectorPopup.getInstance();
        popup.setLngLat(this.lnglat);
        popup.show();
    }
}

export class AjaxLinkCheckLocationSwitchSectorPopup extends BaseAjaxLinkCheckSwitchSectorPopup {
    private static _instance: AjaxLinkCheckLocationSwitchSectorPopup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        if (AjaxLinkCheckLocationSwitchSectorPopup._instance) {
            return AjaxLinkCheckLocationSwitchSectorPopup._instance;
        }
        super(map, draw);
        AjaxLinkCheckLocationSwitchSectorPopup._instance = this;
    }

    static getInstance() {
        return AjaxLinkCheckLocationSwitchSectorPopup._instance;
    }

    protected cleanup() {
        this.geocoderMarkerCleanup();
        super.cleanup();
    }

    protected onBackButton(): void {
        this.hide();

        let popup = AjaxLinkCheckLocationPopup.getInstance();
        popup.setLngLat(this.lnglat);
        popup.show();
    }

    protected onSelectSector(sectorId: string): void {
        this.createCPE(sectorId);
        this.hide();
    }
}
