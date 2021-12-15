import { roundToDecimalPlaces } from '../../LinkCalcUtils';
import { IMapboxDrawPlugin, initializeMapboxDrawInterface } from '../../utils/IMapboxDrawPlugin';
import { WorkspaceFeatureTypes } from '../../workspace/WorkspaceConstants';
import { AccessPointSector } from '../../workspace/WorkspaceSectorFeature';
import { LinkCheckBaseAjaxFormPopup } from './LinkCheckBaseAjaxPopup';

const CALCULATE_COVERAGE_BUTTON_ID = 'coverage-viewshed-btn-sector-popup';

export abstract class BaseAjaxSectorPopup
    extends LinkCheckBaseAjaxFormPopup
    implements IMapboxDrawPlugin
{
    protected sector?: AccessPointSector;
    protected static _instance: BaseAjaxSectorPopup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw, endpoint: string) {
        super(map, draw, endpoint);
        initializeMapboxDrawInterface(this, this.map);
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
        return [this.sector?.workspaceId];
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
        super(map, draw, 'workspace:sector-form-market-eval');
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
        super(map, draw, 'workspace:sector-form-network-edit');
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
