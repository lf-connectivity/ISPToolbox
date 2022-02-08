import { addHoverTooltip, hideHoverTooltip } from '../../organisms/HoverTooltip';
import { IMapboxDrawPlugin, initializeMapboxDrawInterface } from '../../utils/IMapboxDrawPlugin';
import { parseLatitudeLongitude } from '../../utils/LatLngInputUtils';
import { ISPToolboxTool, WorkspaceFeatureTypes } from '../../workspace/WorkspaceConstants';
import { AccessPoint } from '../../workspace/WorkspaceFeatures';
import { LinkCheckBaseAjaxFormPopup } from './LinkCheckBaseAjaxPopup';

const TOWER_UPDATE_NAME_FORM_ID = 'tower-update-form-name';
const TOWER_UPDATE_CORD_FORM_ID = 'tower-update-form-coord';
const TOWER_DELETE_BUTTON_ID = 'tower-delete-btn';
const SECTOR_CREATE_BUTTON_ID = 'place-sector-btn-tower-popup';

const TOWER_NAME_EDIT_BTN_ID = 'edit-ap-name-btn';
const TOWER_NAME_EDIT_INPUT_ID = 'name-input-ap-popup';
const TOWER_NAME_SAVE_BTN_ID = 'save-ap-name-btn';

const TOWER_CORD_EDIT_BTN_ID = 'edit-ap-coord-btn';
const TOWER_CORD_EDIT_INPUT_ID = 'lat-lng-input-tower-popup';
const TOWER_CORD_SAVE_BTN_ID = 'save-ap-coord-btn';

// @ts-ignore
$.validator.addMethod('latlng', (value, element) => {
    return parseLatitudeLongitude(value) !== null;
});

export class AjaxTowerPopup extends LinkCheckBaseAjaxFormPopup implements IMapboxDrawPlugin {
    protected accessPoint?: AccessPoint;
    protected readonly tool: ISPToolboxTool;
    protected static _instance: AjaxTowerPopup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw, tool: ISPToolboxTool) {
        if (AjaxTowerPopup._instance) {
            return AjaxTowerPopup._instance;
        }
        super(map, draw, 'workspace:tower-form');
        initializeMapboxDrawInterface(this, this.map);
        this.tool = tool;
        AjaxTowerPopup._instance = this;
    }

    getAccessPoint(): AccessPoint | undefined {
        return this.accessPoint;
    }

    setAccessPoint(accessPoint: AccessPoint) {
        this.accessPoint = accessPoint;

        if (this.accessPoint != undefined) {
            const coords = accessPoint.getFeatureGeometryCoordinates();
            this.setLngLat(coords as [number, number]);
        }
    }

    protected setEventHandlers() {
        // Tower Parameters Update
        this.createSubmitFormCallback(TOWER_UPDATE_NAME_FORM_ID, () => {
            this.accessPoint?.read(() => {});
        });

        this.createSubmitFormCallback(TOWER_UPDATE_CORD_FORM_ID, () => {
            this.accessPoint?.read(() => {});
        });

        // Create Sector Callback
        $(`#${SECTOR_CREATE_BUTTON_ID}`).on('click', () => {
            if (this.accessPoint) {
                this.accessPoint.read(() => {
                    let newSector = {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: this.lnglat
                        },
                        properties: {
                            feature_type: WorkspaceFeatureTypes.SECTOR,
                            ap: this.accessPoint?.workspaceId,
                            uneditable: true
                        }
                    };
                    this.map.fire('draw.create', { features: [newSector] });
                });
            }
        });

        // Edit field names callback
        $(`#${TOWER_NAME_EDIT_BTN_ID}`)
            .off()
            .on('click', () => {
                hideHoverTooltip(`#${TOWER_NAME_EDIT_BTN_ID}`);

                // Hide non-edit mode components
                $(`#${TOWER_NAME_EDIT_BTN_ID}`).addClass('d-none');

                // Show edit mode components
                $(`#${TOWER_NAME_EDIT_INPUT_ID}`).prop('disabled', false);
                $(`#${TOWER_NAME_SAVE_BTN_ID}`).removeClass('d-none');
            });

        // hack to remove tooltip, otherwise it stays on page until refresh
        $(`#${TOWER_NAME_SAVE_BTN_ID}`)
            .off()
            .on('click', () => {
                hideHoverTooltip(`#${TOWER_NAME_SAVE_BTN_ID}`);
            });

        // Edit field names callback
        $(`#${TOWER_CORD_EDIT_BTN_ID}`)
            .off()
            .on('click', () => {
                hideHoverTooltip(`#${TOWER_CORD_EDIT_BTN_ID}`);

                // Hide non-edit mode components
                $(`#${TOWER_CORD_EDIT_BTN_ID}`).addClass('d-none');

                // Show edit mode components
                $(`#${TOWER_CORD_EDIT_INPUT_ID}`).prop('disabled', false);
                $(`#${TOWER_CORD_SAVE_BTN_ID}`).removeClass('d-none');
            });

        // hack to remove tooltip, otherwise it stays on page until refresh
        $(`#${TOWER_CORD_SAVE_BTN_ID}`)
            .off()
            .on('click', () => {
                hideHoverTooltip(`#${TOWER_CORD_SAVE_BTN_ID}`);
            });

        addHoverTooltip('.tooltip-input-btn', 'bottom');

        // Delete Tower Button Callback
        $(`#${TOWER_DELETE_BUTTON_ID}`)
            .off()
            .on('click', () => {
                $(`#ap-delete-confirm-btn`)
                    .off()
                    .on('click', () => {
                        this.map.fire('draw.delete', {
                            features: [this.accessPoint?.getFeatureData()]
                        });
                    });
            });
    }

    protected cleanup() {}

    protected getEndpointParams() {
        return [this.tool, this.accessPoint?.workspaceId];
    }

    static getInstance() {
        if (AjaxTowerPopup._instance) {
            return AjaxTowerPopup._instance;
        } else {
            throw new Error('No instance of AjaxTowerPopup instantiated.');
        }
    }

    // Hide tooltip if designated AP gets deleted
    drawDeleteCallback(event: { features: Array<GeoJSON.Feature> }) {
        event.features.forEach((feat: any) => {
            if (
                feat.properties &&
                this.accessPoint &&
                feat.properties.feature_type === WorkspaceFeatureTypes.AP &&
                feat.properties.uuid === this.accessPoint.workspaceId
            ) {
                this.hide();
            }
        });
    }

    // Hide tooltip if designated AP gets hidden
    drawUpdateCallback(event: { features: Array<GeoJSON.Feature>; action: string }) {
        if (event.action === 'read' && this.accessPoint && this.accessPoint.workspaceId) {
            event.features.forEach((feat: any) => {
                if (
                    feat.properties.uuid == this.accessPoint?.workspaceId &&
                    this.accessPoint?.getFeatureProperty('hidden') == 'true'
                ) {
                    this.hide();
                }
            });
        }
    }
}
