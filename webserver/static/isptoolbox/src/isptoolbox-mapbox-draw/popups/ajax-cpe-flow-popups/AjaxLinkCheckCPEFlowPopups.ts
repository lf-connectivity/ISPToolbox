import { CPE } from '../../../workspace/WorkspaceFeatures';
import { BaseAjaxCPEPopup } from './BaseAjaxCPEFlowPopups';

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

    protected onSwitchSector(): void {}
}
