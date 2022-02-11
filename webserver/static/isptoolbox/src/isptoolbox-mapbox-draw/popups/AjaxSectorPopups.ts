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
    LOSWSEvents,
    WorkspaceEvents,
    WorkspaceFeatureTypes
} from '../../workspace/WorkspaceConstants';
import { AccessPoint } from '../../workspace/WorkspaceFeatures';
import { AccessPointSector } from '../../workspace/WorkspaceSectorFeature';
import { AjaxTowerPopup } from './AjaxTowerPopup';
import { LinkCheckBaseAjaxFormPopup } from './LinkCheckBaseAjaxPopup';
import { djangoUrl } from '../../utils/djangoUrl';
import { IIspToolboxAjaxPlugin, initializeIspToolboxInterface } from '../../utils/IIspToolboxAjaxPlugin';
import { BaseWorkspaceManager } from '../../workspace/BaseWorkspaceManager';

const SECTOR_NAME_UPDATE_FORM_ID = 'sector-name-update-form';
const SECTOR_UPDATE_FORM_ID = 'sector-update-form';
const BACK_TO_TOWER_LINK_ID = 'back-to-tower-sector-popup';
const SECTOR_DELETE_BUTTON_ID = 'sector-delete-btn';
const ADD_SECTOR_BUTTON_ID = 'add-access-point-sector-popup';
const TIME_REMAINING_P_ID = 'time-remaining-p-sector-popup';

const NAME_INPUT_ID = 'name-input-sector-popup';
const EDIT_NAME_BTN_ID = 'edit-sector-name-sector-popup';
const SAVE_NAME_BTN_ID = 'save-sector-name-sector-popup';
const SECTOR_SELECT_ID = 'select-sector-sector-popup';
const STAT_ROW_ID = 'stat-row-sector-popup';
const TIME_REMAINING_JSON_ID = 'time-remaining-viewshed-progress';

const TASK_PROGRESS_CLASS = 'task-progress-sector-popup';

/**
 * Doing base classes for this to account for differences in button logic
 * as opposed to just templating
 */
export abstract class BaseAjaxSectorPopup
    extends LinkCheckBaseAjaxFormPopup
    implements IMapboxDrawPlugin, IIspToolboxAjaxPlugin
{
    subscriptions: Array<string | null> = [];
    protected sector?: AccessPointSector;
    protected readonly tool: ISPToolboxTool;
    protected static _instance: BaseAjaxSectorPopup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw, tool: ISPToolboxTool) {
        super(map, draw, 'workspace:sector-form');
        initializeMapboxDrawInterface(this, this.map);
        this.subscriptions = initializeIspToolboxInterface(this);
        PubSub.subscribe(
            WorkspaceEvents.SECTOR_LAYER_CLICKED,
            this.sectorLayerClickCallback.bind(this)
        );

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

        // Enable viewshed submit if task coverage isn't loading or done
        if (!$(`.${TASK_PROGRESS_CLASS}`).length) {
            $(`#${SECTOR_UPDATE_FORM_ID}`)
                .find('input:submit, button:submit')
                .prop('disabled', false)
                .removeClass('d-none');
        }

        // Hide task Progress class if input changes
        $(`#${SECTOR_UPDATE_FORM_ID}`)
            .each(function () {
                $(this).data('serialized', $(this).serialize());
            })
            .on('change input', function () {
                const input_changed = !($(this).serialize() == $(this).data('serialized'));
                if (input_changed) {
                    $(`.${TASK_PROGRESS_CLASS}`).addClass('d-none');
                } else {
                    $(`.${TASK_PROGRESS_CLASS}`).removeClass('d-none');
                }
            });
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

    // Hide tooltip if designated AP gets hidden
    drawUpdateCallback(event: { features: Array<GeoJSON.Feature>; action: string }) {
        if (event.action === 'read' && this.sector && this.sector.workspaceId) {
            event.features.forEach((feat: any) => {
                if (
                    feat.properties.uuid == this.sector?.workspaceId &&
                    this.sector?.getFeatureProperty('hidden') == 'true'
                ) {
                    this.hide();
                }
            });
        }
    }

    protected updateSectorStats() {
        if (this.popup.isOpen()) {
            const request_params = this.getEndpointParams();
            $.get(
                djangoUrl('workspace:sector-stats', ...this.getEndpointParams()),
                '',
                (result) => {
                    if (this.responseMatchesCurrent(request_params)) {
                        $(`#${STAT_ROW_ID}`).html(result);
                    }
                },
                'html'
            )
                .fail(() => {})
                .done(() => {
                    this.setEventHandlers();
                });
        }
    }

    protected onFormSubmitSuccess() {}

    protected onFormSubmitFailure() {
        renderAjaxOperationFailed();
    }

    // Show edit sector tooltip after object gets persisted. Move to sector if
    // it is out of the map
    createCallback({features}: {features: Array<GeoJSON.Feature>}){
        if(features.length === 1){
            const feat = features[0];
            if(feat.properties?.feature_type === WorkspaceFeatureTypes.SECTOR)
            {
                console.log('runing');
                let sector = BaseWorkspaceManager.getFeatureByUuid(feat.properties.uuid) as AccessPointSector;
                console.dir(sector);
                this.setSector(sector);
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

                    this.draw.changeMode('simple_select', { featureIds: [this.sector.mapboxId] });
                    this.map.fire('draw.selectionchange', { features: [this.sector.getFeatureData()] });
                    this.hide();
                    this.show();
                }
            }
        }
    }

    // Show tooltip if only one sector is selected.
    protected sectorLayerClickCallback(
        event: string,
        data: { sectors: Array<AccessPointSector>; selectedSectors: Array<AccessPointSector> }
    ) {
        if (data.selectedSectors.length === 1) {
            let sector = data.selectedSectors[0];

            this.hide();
            this.setSector(sector);
            this.show();
        } else if (data.selectedSectors.length > 1) {
            this.hide();
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
    }

    protected onFormSubmitSuccess() {
        if (this.sector) {
            MarketEvaluatorWS.getInstance().sendViewshedRequest(this.sector.workspaceId);
        }
    }

    protected onCloudRfProgress(event: string, data: CloudRFProgressResponse) {
        if (data.sector === this.sector?.workspaceId) {
            this.updateSectorStats();
        }
    }

    protected onCloudRfComplete(event: string, data: ViewshedGeojsonResponse) {
        if (data.ap_uuid && data.ap_uuid === this.sector?.workspaceId) {
            this.updateSectorStats();
        }
    }
}

export class LinkCheckSectorPopup extends BaseAjaxSectorPopup {
    timeRemaining: null | number;
    intervalId: any;
    setTimeRemainingFunc: () => void;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        if (BaseAjaxSectorPopup._instance) {
            return BaseAjaxSectorPopup._instance as LinkCheckSectorPopup;
        }
        super(map, draw, ISPToolboxTool.LOS_CHECK);
        PubSub.subscribe(LOSWSEvents.VIEWSHED_PROGRESS_MSG, this.onTaskUpdate.bind(this));
        PubSub.subscribe(LOSWSEvents.VIEWSHED_MSG, this.onTaskUpdate.bind(this));
        PubSub.subscribe(LOSWSEvents.AP_MSG, this.onTaskUpdate.bind(this));

        this.timeRemaining = null;
        BaseAjaxSectorPopup._instance = this;
    }

    protected setEventHandlers(): void {
        super.setEventHandlers();

        this.timeRemaining = Math.round(
            JSON.parse(document.getElementById(TIME_REMAINING_JSON_ID)?.textContent || '0')
        );

        this.stopTimer();
        this.formatTimeRemaining();
        this.intervalId = setInterval(() => {
            if (this.timeRemaining != null) {
                this.timeRemaining -= 1;
                this.timeRemaining = Math.max(this.timeRemaining, 0);
            }
            this.formatTimeRemaining();
        }, 1000);
    }

    protected formatTimeRemaining() {
        let message;
        if (this.timeRemaining != null) {
            if (this.timeRemaining === 0) {
                this.stopTimer();
                message = 'Hold tight, almost there!';
            } else {
                let date = new Date(0);
                date.setSeconds(this.timeRemaining);
                message = 'Time Remaining: ' + date.toISOString().substr(14, 5);
            }
        } else {
            this.stopTimer();
            message = 'This may take several minutes';
        }

        $(`#${TIME_REMAINING_P_ID}`).text(message);
    }

    protected stopTimer() {
        if (this.intervalId != null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    protected onTaskUpdate(event: string, data: any) {
        if (data.uuid === this.sector?.workspaceId) {
            this.updateSectorStats();
        }
    }

    static getInstance() {
        return BaseAjaxSectorPopup.getInstance() as LinkCheckSectorPopup;
    }
}
