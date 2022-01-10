import { BaseWorkspaceFeature } from '../../../workspace/BaseWorkspaceFeature';
import { BaseWorkspaceManager } from '../../../workspace/BaseWorkspaceManager';
import { LinkCheckBaseAjaxFormPopup } from '../LinkCheckBaseAjaxPopup';

var _ = require('lodash');

const CPE_NAME_JSON_ID = 'cpe-name-cpe-flow';
const SECTOR_IDS_JSON_ID = 'sector-ids-cpe-flow';

const SWITCH_SECTOR_LINK = 'cpe-switch-sector-link-customer-popup';

const BACK_TO_MAIN_LINK_ID = 'back-to-main-link-switch-sector-popup';
const CONNECT_SECTOR_LI_CLASS = 'connect-sector-li-switch-sector-popup';
const CONNECT_SECTOR_LINK_CLASS = 'connect-sector-link-switch-sector-popup';

abstract class BaseAjaxCPEFlowPopup extends LinkCheckBaseAjaxFormPopup {
    protected cleanup() {
        this.changeSelection([]);
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

    protected setEventHandlers(): void {
        $(`#${BACK_TO_MAIN_LINK_ID}`).off().on('click', this.onBackButton.bind(this));

        $(`.${CONNECT_SECTOR_LINK_CLASS}`)
            .off()
            .on('click', (event: any) => {
                // find closest li with data attribute.
                let sectorId = $(event.target).closest('li[data-sector-id]').data('sectorId');
                if (sectorId) {
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
