import { CPE } from '../../../workspace/WorkspaceFeatures';
import { BaseAjaxCPEPopup, BaseAjaxLinkCheckSwitchSectorPopup } from './BaseAjaxCPEFlowPopups';

const DELETE_CPE_BUTTON = 'cpe-delete-btn-customer-popup';

export class AjaxLinkCheckCPEPopup extends BaseAjaxCPEPopup {
    private cpe: CPE;
    private static _instance: AjaxLinkCheckCPEPopup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        if (AjaxLinkCheckCPEPopup._instance) {
            return AjaxLinkCheckCPEPopup._instance;
        }
        super(map, draw, 'workspace:cpe-form');
        AjaxLinkCheckCPEPopup._instance = this;
    }

    protected setEventHandlers(): void {
        super.setEventHandlers();

        $(`#${DELETE_CPE_BUTTON}`)
            .off()
            .on('click', () => {
                $(`#ap-delete-confirm-btn`)
                    .off()
                    .on(
                        'click',
                        this.createTooltipAction(() => {
                            this.hide();
                            console.log('deleting CPE');
                            this.cpe.delete();
                        })
                    );
            });
    }

    setCPE(cpe: CPE) {
        this.cpe = cpe;
        this.setLngLat(cpe.getFeatureGeometryCoordinates() as [number, number]);
    }

    static getInstance() {
        return AjaxLinkCheckCPEPopup._instance;
    }

    protected getEndpointParams(): any[] {
        return [this.cpe.workspaceId];
    }

    protected onSwitchSector(): void {
        this.hide();

        let popup = AjaxLinkCheckCPESwitchSectorPopup.getInstance();
        popup.setCPE(this.cpe);
        popup.show();
    }
}

export class AjaxLinkCheckCPESwitchSectorPopup extends BaseAjaxLinkCheckSwitchSectorPopup {
    private cpe: CPE;
    private static _instance: AjaxLinkCheckCPESwitchSectorPopup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        if (AjaxLinkCheckCPESwitchSectorPopup._instance) {
            return AjaxLinkCheckCPESwitchSectorPopup._instance;
        }
        super(map, draw);
        AjaxLinkCheckCPESwitchSectorPopup._instance = this;
    }

    setCPE(cpe: CPE) {
        this.cpe = cpe;
        this.setLngLat(cpe.getFeatureGeometryCoordinates() as [number, number]);
    }

    static getInstance() {
        return AjaxLinkCheckCPESwitchSectorPopup._instance;
    }

    protected onBackButton(): void {
        this.hide();

        let popup = AjaxLinkCheckCPEPopup.getInstance();
        popup.setCPE(this.cpe);
        popup.show();
    }

    protected onSelectSector(sectorId: string): void {
        this.cpeSwitchSector(this.cpe, sectorId);
        this.hide();
    }
}
