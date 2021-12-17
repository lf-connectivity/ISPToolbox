import { roundToDecimalPlaces } from '../../LinkCalcUtils';
import { IMapboxDrawPlugin, initializeMapboxDrawInterface } from '../../utils/IMapboxDrawPlugin';
import { ISPToolboxTool, WorkspaceFeatureTypes } from '../../workspace/WorkspaceConstants';
import { AccessPointSector } from '../../workspace/WorkspaceSectorFeature';
import { LinkCheckBaseAjaxFormPopup } from './LinkCheckBaseAjaxPopup';

const CALCULATE_COVERAGE_BUTTON_ID = 'coverage-viewshed-btn-sector-popup';

/**
 * Doing base classes for this to account for differences in button logic
 * as opposed to just templating
 */
export abstract class BaseAjaxSectorPopup
    extends LinkCheckBaseAjaxFormPopup
    implements IMapboxDrawPlugin
{
    protected sector?: AccessPointSector;
    protected readonly tool: ISPToolboxTool
    protected static _instance: BaseAjaxSectorPopup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw, tool: ISPToolboxTool) {
        super(map, draw, 'workspace:sector-form');
        initializeMapboxDrawInterface(this, this.map);
        this.tool = tool
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
}

export class MarketEvaluatorSectorPopup extends BaseAjaxSectorPopup {
    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        if (BaseAjaxSectorPopup._instance) {
            return BaseAjaxSectorPopup._instance as MarketEvaluatorSectorPopup;
        }
        super(map, draw, ISPToolboxTool.MARKET_EVAL);
        BaseAjaxSectorPopup._instance = this;
    }

    protected setEventHandlers() {
        $(`#${CALCULATE_COVERAGE_BUTTON_ID}`)
            .off()
            .on('click', () => {
                console.log(`Calculating viewshed coverage for sector ${this.sector?.workspaceId}`);
            });
    }

    static getInstance() {
        return BaseAjaxSectorPopup.getInstance() as MarketEvaluatorSectorPopup;
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

    protected setEventHandlers() {
        $(`#${CALCULATE_COVERAGE_BUTTON_ID}`)
            .off()
            .on('click', () => {
                console.log(`Calculating viewshed for sector ${this.sector?.workspaceId}`);
            });
    }

    static getInstance() {
        return BaseAjaxSectorPopup.getInstance() as LinkCheckSectorPopup;
    }
}
