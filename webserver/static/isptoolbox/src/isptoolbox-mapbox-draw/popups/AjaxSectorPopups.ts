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

const SECTOR_UPDATE_FORM_ID = 'sector-update-form';
const BACK_TO_TOWER_LINK_ID = 'back-to-tower-sector-popup';
const SECTOR_DELETE_BUTTON_ID = 'sector-delete-btn';
const ADD_SECTOR_BUTTON_ID = 'add-access-point-sector-popup';

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
        this.createSubmitFormCallback(SECTOR_UPDATE_FORM_ID, () => {
            if (this.sector) {
                this.sector.read(this.onFormSubmitSuccess.bind(this));
            }
        });

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
                $(`#ap-delete-confirm-btn`)
                    .off()
                    .on('click', () => {
                        this.map.fire('draw.delete', {
                            features: [this.sector?.getFeatureData()]
                        });
                    });
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
        BaseAjaxSectorPopup._instance = this;
    }

    static getInstance() {
        return BaseAjaxSectorPopup.getInstance() as MarketEvaluatorSectorPopup;
    }

    protected onFormSubmitSuccess() {
        console.log(
            `Calculating CloudRF coverage for sector ${this.sector?.workspaceId} coming soon`
        );
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
