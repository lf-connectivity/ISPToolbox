import { roundToDecimalPlaces } from '../../LinkCalcUtils';
import { IMapboxDrawPlugin, initializeMapboxDrawInterface } from '../../utils/IMapboxDrawPlugin';
import { parseLatitudeLongitude } from '../../utils/LatLngInputUtils';
import {
    ISPToolboxTool,
    WorkspaceEvents,
    WorkspaceFeatureTypes
} from '../../workspace/WorkspaceConstants';
import { AccessPoint } from '../../workspace/WorkspaceFeatures';
import { AccessPointSector } from '../../workspace/WorkspaceSectorFeature';
import { BaseAjaxSectorPopup } from './AjaxSectorPopups';
import { LinkCheckBaseAjaxFormPopup } from './LinkCheckBaseAjaxPopup';

const PLACE_SECTOR_BUTTON_ID = 'place-sector-btn-tower-popup';
const TOWER_UPDATE_FORM_ID = 'tower-update-form';

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
        PubSub.subscribe(WorkspaceEvents.SECTOR_CREATED, this.sectorCreateCallback.bind(this));
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
        this.createSubmitFormCallback(TOWER_UPDATE_FORM_ID, () => {
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

    // Show edit sector tooltip after object gets persisted. Move to sector if
    // it is out of the map
    protected sectorCreateCallback(
        event: string,
        data: { ap: AccessPoint; sector: AccessPointSector }
    ) {
        if (data.ap === this.accessPoint) {
            let popup = BaseAjaxSectorPopup.getInstance();
            popup.setSector(data.sector);
            popup.show();

            let coords = this.accessPoint.getFeatureGeometryCoordinates() as [number, number];

            // Fly to AP if AP isn't on map. We center the AP horizontally, but place it
            // 65% of the way down on the screen so the tooltip fits.
            if (!this.map.getBounds().contains(coords)) {
                let south = this.map.getBounds().getSouth();
                let north = this.map.getBounds().getNorth();
                this.map.flyTo({
                    center: [coords[0], coords[1] + +0.15 * (north - south)]
                });
            }
        }
    }
}
