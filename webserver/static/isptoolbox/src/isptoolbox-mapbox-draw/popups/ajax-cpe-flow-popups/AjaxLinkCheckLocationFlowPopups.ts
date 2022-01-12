import { getSessionID } from '../../../utils/MapPreferences';
import { BaseAjaxCPEPopup, BaseAjaxLinkCheckSwitchSectorPopup } from './BaseAjaxCPEFlowPopups';

const VIEW_LOS_BUTTON = 'view-los-btn-customer-popup';

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
        super.cleanup();
        this.geocoderMarkerCleanup();
    }

    protected setEventHandlers(): void {
        super.setEventHandlers();
        this.highlightAll();

        $(`#${VIEW_LOS_BUTTON}`)
            .off()
            .on(
                'click',
                this.createTooltipAction(() => {
                    this.createCPE($(`#${VIEW_LOS_BUTTON}`).data('sectorId'));
                    this.hide();
                })
            );
    }

    protected getEndpointParams(): any[] {
        return [getSessionID(), this.lnglat[0], this.lnglat[1]];
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
        super.cleanup();
        this.geocoderMarkerCleanup();
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
