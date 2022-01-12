import { LinkCheckLocationSearchTool } from '../../../organisms/LinkCheckLocationSearchTool';
import { BaseWorkspaceManager } from '../../../workspace/BaseWorkspaceManager';
import { WorkspaceFeatureTypes } from '../../../workspace/WorkspaceConstants';
import { LinkCheckBaseAjaxFormPopup } from '../LinkCheckBaseAjaxPopup';
import { Feature, Point } from 'geojson';
import { getSessionID } from '../../../utils/MapPreferences';
import { CPE } from '../../../workspace/WorkspaceFeatures';
import { AccessPointSector } from '../../../workspace/WorkspaceSectorFeature';

var _ = require('lodash');

const CPE_NAME_JSON_ID = 'cpe-name-cpe-flow';
const SECTOR_IDS_JSON_ID = 'sector-ids-cpe-flow';

const DRAW_PTP_BUTTON = 'draw-ptp-btn-customer-popup';
const SWITCH_SECTOR_LINK = 'cpe-switch-sector-link-customer-popup';

const BACK_TO_MAIN_LINK_ID = 'back-to-main-link-switch-sector-popup';
const CONNECT_SECTOR_LI_CLASS = 'connect-sector-li-switch-sector-popup';
const CONNECT_SECTOR_LINK_CLASS = 'connect-sector-link-switch-sector-popup';

// Five decimal places of precision for lat longs,
export const EPSILON = 0.000001;

abstract class BaseAjaxCPEFlowPopup extends LinkCheckBaseAjaxFormPopup {
    protected tooltipAction: boolean;

    constructor(map: mapboxgl.Map, draw: MapboxDraw, endpoint: string) {
        super(map, draw, endpoint);
        this.tooltipAction = false;
    }

    protected cleanup() {
        if (!this.tooltipAction) {
            this.changeSelection([]);
        }
        this.tooltipAction = false;
    }

    protected getCPEName(): string {
        return JSON.parse(document.getElementById(CPE_NAME_JSON_ID)?.textContent || '""');
    }

    protected getSectorIds(): Array<string> {
        return JSON.parse(document.getElementById(SECTOR_IDS_JSON_ID)?.textContent || '[]');
    }

    protected highlightSector(sectorId: string) {
        this.changeSelection([sectorId]);
    }

    protected highlightAll() {
        this.changeSelection(this.getSectorIds());
    }

    protected createTooltipAction(f: (event: any | void) => void): (event: any | void) => void {
        return (event: any) => {
            this.tooltipAction = true;
            f(event);
        };
    }

    protected geocoderMarkerCleanup() {
        let geocoderLngLat = LinkCheckLocationSearchTool.getInstance().getLngLat();
        if (
            geocoderLngLat &&
            this.tooltipAction &&
            Math.abs(geocoderLngLat[0] - this.lnglat[0]) < EPSILON &&
            Math.abs(geocoderLngLat[1] - this.lnglat[1]) < EPSILON
        ) {
            LinkCheckLocationSearchTool.getInstance().hide();
        }
        LinkCheckLocationSearchTool.getInstance().onPopupClose();
    }

    protected createCPE(sectorId: string) {
        let newCPE = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: this.lnglat
            },
            properties: {
                name: this.getCPEName(),
                sector: sectorId,
                feature_type: WorkspaceFeatureTypes.CPE
            }
        } as Feature<Point, any>;
        this.map.fire('draw.create', { features: [newCPE] });
    }

    protected cpeSwitchSector(cpe: CPE, sectorId: string) {
        let sector = BaseWorkspaceManager.getFeatureByUuid(sectorId) as AccessPointSector;
        if (cpe.sector?.workspaceId && cpe.sector.workspaceId !== sectorId) {
            let link = cpe.sector?.links.get(cpe);
            link?.switchAP(sector);
        }
    }

    private changeSelection(sectorIds: Array<any>) {
        let features = sectorIds.map((id: string) => BaseWorkspaceManager.getFeatureByUuid(id));

        this.draw.changeMode('simple_select', { featureIds: features.map((f) => f.mapboxId) });
        this.map.fire('draw.modechange', { mode: 'simple_select' });
        this.map.fire('draw.selectionchange', {
            features: features.map((f) => f.getFeatureData())
        });
    }
}

export abstract class BaseAjaxCPEPopup extends BaseAjaxCPEFlowPopup {
    protected setEventHandlers() {
        $(`#${SWITCH_SECTOR_LINK}`).off().on('click', this.onSwitchSector.bind(this));
        $(`#${DRAW_PTP_BUTTON}`)
            .off()
            .on('click', this.createTooltipAction(this.onDrawPtP.bind(this)));
    }

    protected onDrawPtP() {
        //@ts-ignore
        this.draw.changeMode('draw_link', { start: this.lnglat });
        this.map.fire('draw.modechange', { mode: 'draw_link' });
        this.hide();
    }

    protected abstract onSwitchSector(): void;
}

export abstract class BaseAjaxLinkCheckSwitchSectorPopup extends BaseAjaxCPEFlowPopup {
    protected debouncedHighlightAll: any;
    protected debouncedHighlightSector: any;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        super(map, draw, 'workspace:cpe-switch-sector-form');

        this.debouncedHighlightAll = _.debounce(() => {
            this.debouncedHighlightSector.cancel();
            this.highlightAll();
        }, 150);

        this.debouncedHighlightSector = _.debounce((event: any) => {
            // find closest li with data attribute.
            let sectorId = $(event.target).closest('li[data-sector-id]').data('sectorId');
            if (sectorId) {
                this.debouncedHighlightAll.cancel();
                this.highlightSector(sectorId);
            }
        }, 150);
    }

    protected getEndpointParams(): any[] {
        return [getSessionID(), this.lnglat[0], this.lnglat[1]];
    }

    protected setEventHandlers(): void {
        $(`#${BACK_TO_MAIN_LINK_ID}`).off().on('click', this.onBackButton.bind(this));

        $(`.${CONNECT_SECTOR_LINK_CLASS}`)
            .off()
            .on('click', (event: any) => {
                // find closest li with data attribute.
                let sectorId = $(event.target).closest('li[data-sector-id]').data('sectorId');
                if (sectorId) {
                    this.tooltipAction = true;
                    this.onSelectSector(sectorId);
                }
            });

        $(`li.${CONNECT_SECTOR_LI_CLASS}`)
            .off()
            .on('mouseenter', (event: any) => {
                this.debouncedHighlightAll.cancel();
                this.debouncedHighlightSector(event);
            })
            .on('mouseleave', () => {
                this.debouncedHighlightSector.cancel();
                this.debouncedHighlightAll();
            });
    }

    protected abstract onBackButton(): void;
    protected abstract onSelectSector(sectorId: string): void;
}
