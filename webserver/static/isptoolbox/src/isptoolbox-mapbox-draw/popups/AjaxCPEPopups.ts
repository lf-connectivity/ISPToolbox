import { LinkCheckLocationSearchTool } from '../../organisms/LinkCheckLocationSearchTool';
import { CPE } from '../../workspace/WorkspaceFeatures';
import { LinkCheckBaseAjaxFormPopup } from './LinkCheckBaseAjaxPopup';

export abstract class BaseAjaxCPEPopup extends LinkCheckBaseAjaxFormPopup {}

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
        LinkCheckLocationSearchTool.getInstance().onPopupClose();
    }

    protected setEventHandlers(): void {}

    protected getEndpointParams(): any[] {
        return [this.lnglat[0], this.lnglat[1]];
    }
}

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

    protected cleanup() {}

    protected setEventHandlers(): void {}

    protected getEndpointParams(): any[] {
        return [this.cpe.workspaceId];
    }
}
