import { LinkCheckLocationSearchTool } from '../../organisms/LinkCheckLocationSearchTool';
import { CPE } from '../../workspace/WorkspaceFeatures';
import { LinkCheckBaseAjaxFormPopup } from './LinkCheckBaseAjaxPopup';

export abstract class BaseAjaxCPEPopup extends LinkCheckBaseAjaxFormPopup {}

export class LinkCheckLocationPopup extends BaseAjaxCPEPopup {
    private static _instance: LinkCheckLocationPopup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        if (LinkCheckLocationPopup._instance) {
            return LinkCheckLocationPopup._instance;
        }
        super(map, draw, 'workspace:los-location-form');
        LinkCheckLocationPopup._instance = this;
    }

    static getInstance() {
        return LinkCheckLocationPopup._instance;
    }

    protected cleanup() {
        LinkCheckLocationSearchTool.getInstance().onPopupClose();
    }

    protected setEventHandlers(): void {}

    protected getEndpointParams(): any[] {
        return [this.lnglat[0], this.lnglat[1]];
    }
}

export class LinkCheckCPEPopup extends BaseAjaxCPEPopup {
    private cpe: CPE;
    private static _instance: LinkCheckCPEPopup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        if (LinkCheckCPEPopup._instance) {
            return LinkCheckCPEPopup._instance;
        }
        super(map, draw, 'workspace:cpe-form');
        LinkCheckCPEPopup._instance = this;
    }

    setCPE(cpe: CPE) {
        this.cpe = cpe;
        this.setLngLat(cpe.getFeatureGeometryCoordinates() as [number, number]);
    }

    static getInstance() {
        return LinkCheckCPEPopup._instance;
    }

    protected cleanup() {}

    protected setEventHandlers(): void {}

    protected getEndpointParams(): any[] {
        return [this.cpe.workspaceId];
    }
}
