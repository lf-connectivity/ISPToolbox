// (c) Meta Platforms, Inc. and affiliates. Copyright
import { addHoverTooltip, hideHoverTooltip } from '../../organisms/HoverTooltip';
import { IMapboxDrawPlugin, initializeMapboxDrawInterface } from '../../utils/IMapboxDrawPlugin';
import { parseLatitudeLongitude } from '../../utils/LatLngInputUtils';
import { BaseWorkspaceManager } from '../../workspace/BaseWorkspaceManager';
import {
    ISPToolboxTool,
    WorkspaceEvents,
    WorkspaceFeatureTypes
} from '../../workspace/WorkspaceConstants';
import { AccessPoint } from '../../workspace/WorkspaceFeatures';
import { LinkCheckBaseAjaxFormPopup } from './LinkCheckBaseAjaxPopup';

const TOWER_UPDATE_NAME_FORM_ID = 'tower-update-form-name';
const TOWER_DELETE_BUTTON_ID = 'tower-delete-btn';
const SECTOR_CREATE_BUTTON_ID = 'place-sector-btn-tower-popup';

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
        PubSub.subscribe(WorkspaceEvents.AP_LAYER_CLICKED, this.apLayerClickCallback.bind(this));
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

        this.createInputSubmitButtonListener(TOWER_UPDATE_NAME_FORM_ID);

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

        addHoverTooltip('.tooltip-input-btn', 'bottom');
        this.createFBOnlyClickListener();

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

    // Show tooltip on AP layer click.
    apLayerClickCallback(
        event: string,
        data: { aps: Array<AccessPoint>; selectedAPs: Array<AccessPoint> }
    ) {
        if (data.selectedAPs.length === 1) {
            this.hide();
            this.setAccessPoint(data.selectedAPs[0]);
            this.show();
        } else if (data.selectedAPs.length > 1) {
            this.hide();
        }
    }

    // Hide tooltip if tower is being dragged
    draggingFeatureCallback(event: string, data: { featureIds: Array<string> }) {
        if (this.accessPoint?.mapboxId && data.featureIds.includes(this.accessPoint.mapboxId)) {
            this.hide();
        }
    }
}
