import MarketEvaluatorWS, {
    CloudRFProgressResponse,
    MarketEvalWSEvents,
    ViewshedGeojsonResponse
} from '../../MarketEvaluatorWS';
import { DeleteFromPopupConfirmationModal } from './DeleteFromPopupConfirmationModal';
import { addHoverTooltip, hideHoverTooltip } from '../../organisms/HoverTooltip';
import { renderAjaxOperationFailed } from '../../utils/ConnectionIssues';
import { IMapboxDrawPlugin, initializeMapboxDrawInterface } from '../../utils/IMapboxDrawPlugin';
import {
    ISPToolboxTool,
    WorkspaceEvents,
    WorkspaceFeatureTypes
} from '../../workspace/WorkspaceConstants';
import { AccessPoint } from '../../workspace/WorkspaceFeatures';
import { AccessPointSector } from '../../workspace/WorkspaceSectorFeature';
import { AjaxTowerPopup } from './AjaxTowerPopup';
import { LinkCheckBaseAjaxFormPopup } from './LinkCheckBaseAjaxPopup';

const SECTOR_NAME_UPDATE_FORM_ID = 'sector-name-update-form';
const SECTOR_UPDATE_FORM_ID = 'sector-update-form';
const BACK_TO_TOWER_LINK_ID = 'back-to-tower-sector-popup';
const SECTOR_DELETE_BUTTON_ID = 'sector-delete-btn';
const ADD_SECTOR_BUTTON_ID = 'add-access-point-sector-popup';

const NAME_INPUT_ID = 'name-input-sector-popup';
const EDIT_NAME_BTN_ID = 'edit-sector-name-sector-popup';
const SAVE_NAME_BTN_ID = 'save-sector-name-sector-popup';
const SECTOR_SELECT_ID = 'select-sector-sector-popup';

const CLOUDRF_PROGRESS_CLASS = 'cloudrf-progress-sector-popup';

/**
 * Doing base classes for this to account for differences in button logic
 * as opposed to just templating
 */
export abstract class BaseAjaxSectorPopup
    extends LinkCheckBaseAjaxFormPopup
    implements IMapboxDrawPlugin
{
    protected sector?: AccessPointSector;
    protected readonly tool: ISPToolboxTool;
    protected static _instance: BaseAjaxSectorPopup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw, tool: ISPToolboxTool) {
        super(map, draw, 'workspace:sector-form');
        initializeMapboxDrawInterface(this, this.map);
        PubSub.subscribe(WorkspaceEvents.SECTOR_CREATED, this.sectorCreateCallback.bind(this));

        this.tool = tool;
    }

    getSector(): AccessPointSector | undefined {
        return this.sector;
    }

    setSector(sector: AccessPointSector) {
        this.sector = sector;

        if (this.sector != undefined) {
            const coords = this.sector.ap.getFeatureGeometryCoordinates();
            this.setLngLat(coords as [number, number]);
        }
    }

    protected cleanup() {}

    protected getEndpointParams() {
        return [this.tool, this.sector?.workspaceId];
    }

    protected setEventHandlers() {
        this.createSubmitFormCallback(
            SECTOR_UPDATE_FORM_ID,
            () => {
                if (this.sector) {
                    this.sector.read(this.onFormSubmitSuccess.bind(this));
                }
            },
            this.onFormSubmitFailure
        );

        this.createSubmitFormCallback(
            SECTOR_NAME_UPDATE_FORM_ID,
            () => {
                if (this.sector) {
                    this.sector.read();
                }
            },
            this.onFormSubmitFailure
        );

        this.createInputSubmitButtonListener(SECTOR_UPDATE_FORM_ID);

        $(`#${BACK_TO_TOWER_LINK_ID}`)
            .off()
            .on('click', () => {
                if (this.sector) {
                    let towerPopup = AjaxTowerPopup.getInstance();
                    towerPopup.setAccessPoint(this.sector.ap);
                    towerPopup.show();
                }
            });

        $(`#${SECTOR_DELETE_BUTTON_ID}`)
            .off()
            .on('click', () => {
                DeleteFromPopupConfirmationModal.getInstance()
                    .setPopup(this)
                    .setFeatureToDelete(this.sector?.getFeatureData());
            });

        // Set selected sector to the current one
        $(`#${SECTOR_SELECT_ID}`).prop('selectedIndex', 1);

        $(`#${SECTOR_SELECT_ID}`)
            .off()
            .on('change', () => {
                // Check if a different sector was selected
                if ($(`#${SECTOR_SELECT_ID}`).prop('selectedIndex') !== 1 && this.sector) {
                    let sectorUuid = $(`#${SECTOR_SELECT_ID}`).val() as string;
                    let sector = this.sector.ap.sectors.get(sectorUuid);
                    if (sector) {
                        this.draw.changeMode('simple_select', { featureIds: [sector.mapboxId] });
                        this.hide();
                        this.setSector(sector);
                        this.show();
                    }
                }
            });

        $(`#${ADD_SECTOR_BUTTON_ID}`)
            .off()
            .on('click', () => {
                if (this.sector) {
                    let newSector = {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: this.lnglat
                        },
                        properties: {
                            feature_type: WorkspaceFeatureTypes.SECTOR,
                            ap: this.sector.ap?.workspaceId,
                            uneditable: true
                        }
                    };
                    this.map.fire('draw.create', { features: [newSector] });
                }
            });

        $(`#${EDIT_NAME_BTN_ID}`)
            .off()
            .on('click', () => {
                hideHoverTooltip(`#${EDIT_NAME_BTN_ID}`);

                // Hide non-edit mode components
                $(`#${EDIT_NAME_BTN_ID}`).addClass('d-none');

                // Show edit mode components
                $(`#${NAME_INPUT_ID}`).prop('disabled', false);
                $(`#${SAVE_NAME_BTN_ID}`).removeClass('d-none');
            });

        // hack to remove tooltip, otherwise it stays on page until refresh
        $(`#${SAVE_NAME_BTN_ID}`)
            .off()
            .on('click', () => {
                hideHoverTooltip(`#${SAVE_NAME_BTN_ID}`);
            });

        addHoverTooltip('.tooltip-input-btn', 'bottom');
    }

    static getInstance() {
        if (BaseAjaxSectorPopup._instance) {
            return BaseAjaxSectorPopup._instance;
        } else {
            throw new Error('No instance of BaseAjaxSectorPopup instantiated.');
        }
    }

    // Hide tooltip if designated sector gets deleted
    drawDeleteCallback(event: { features: Array<GeoJSON.Feature> }) {
        event.features.forEach((feat: any) => {
            if (
                feat.properties &&
                this.sector &&
                feat.properties.feature_type === WorkspaceFeatureTypes.SECTOR &&
                feat.properties.uuid === this.sector.workspaceId
            ) {
                this.hide();
            }
        });
    }

    protected onFormSubmitSuccess() {}

    protected onFormSubmitFailure() {
        renderAjaxOperationFailed();
    }

    // Show edit sector tooltip after object gets persisted. Move to sector if
    // it is out of the map
    protected sectorCreateCallback(
        event: string,
        data: { ap: AccessPoint; sector: AccessPointSector }
    ) {
        this.setSector(data.sector);
        if (this.sector) {
            let coords = this.sector.ap.getFeatureGeometryCoordinates() as [number, number];

            // Fly to AP if AP isn't on map. We center the AP horizontally, but place it
            // 65% of the way down on the screen so the tooltip fits.
            if (!this.map.getBounds().contains(coords)) {
                let south = this.map.getBounds().getSouth();
                let north = this.map.getBounds().getNorth();
                this.map.flyTo({
                    center: [coords[0], coords[1] + +0.15 * (north - south)]
                });
            }
            this.hide();
            this.show();
        }
    }
}

export class MarketEvaluatorSectorPopup extends BaseAjaxSectorPopup {
    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        if (BaseAjaxSectorPopup._instance) {
            return BaseAjaxSectorPopup._instance as MarketEvaluatorSectorPopup;
        }
        super(map, draw, ISPToolboxTool.MARKET_EVAL);
        PubSub.subscribe(
            MarketEvalWSEvents.CLOUDRF_VIEWSHED_PROGRESS,
            this.onCloudRfProgress.bind(this)
        );
        PubSub.subscribe(
            MarketEvalWSEvents.CLOUDRF_VIEWSHED_MSG,
            this.onCloudRfComplete.bind(this)
        );
        BaseAjaxSectorPopup._instance = this;
    }

    static getInstance() {
        return BaseAjaxSectorPopup.getInstance() as MarketEvaluatorSectorPopup;
    }

    protected setEventHandlers(): void {
        super.setEventHandlers();

        // Enable viewshed submit if cloudrf coverage isn't loading or done
        if (!$(`.${CLOUDRF_PROGRESS_CLASS}`).length) {
            $(`#${SECTOR_UPDATE_FORM_ID}`)
                .find('input:submit, button:submit')
                .prop('disabled', false)
                .removeClass('d-none');
        }

        // Hide CloudRF Progress class if input changes
        $(`#${SECTOR_UPDATE_FORM_ID}`)
            .each(function () {
                $(this).data('serialized', $(this).serialize());
            })
            .on('change input', function () {
                const input_changed = !($(this).serialize() == $(this).data('serialized'));
                if (input_changed) {
                    $(`.${CLOUDRF_PROGRESS_CLASS}`).addClass('d-none');
                } else {
                    $(`.${CLOUDRF_PROGRESS_CLASS}`).removeClass('d-none');
                }
            });
    }

    protected onFormSubmitSuccess() {
        if (this.sector) {
            MarketEvaluatorWS.getInstance().sendViewshedRequest(this.sector.workspaceId);
        }
    }

    protected onCloudRfProgress(event: string, data: CloudRFProgressResponse) {
        if (data.sector === this.sector?.workspaceId) {
            this.updateComponent();
        }
    }

    protected onCloudRfComplete(event: string, data: ViewshedGeojsonResponse) {
        if (data.ap_uuid && data.ap_uuid === this.sector?.workspaceId) {
            this.updateComponent();
        }
    }
}

export class LinkCheckSectorPopup extends BaseAjaxSectorPopup {
    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        if (BaseAjaxSectorPopup._instance) {
            return BaseAjaxSectorPopup._instance as LinkCheckSectorPopup;
        }
        super(map, draw, ISPToolboxTool.LOS_CHECK);
        BaseAjaxSectorPopup._instance = this;
    }

    protected onFormSubmitSuccess() {
        console.log(
            `Calculating building/viewshed coverage for sector ${this.sector?.workspaceId} coming soon`
        );
    }

    static getInstance() {
        return BaseAjaxSectorPopup.getInstance() as LinkCheckSectorPopup;
    }
}
