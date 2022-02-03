import { IMapboxDrawPlugin, initializeMapboxDrawInterface } from '../../utils/IMapboxDrawPlugin';
import { parseLatitudeLongitude } from '../../utils/LatLngInputUtils';
import { ISPToolboxTool, WorkspaceFeatureTypes } from '../../workspace/WorkspaceConstants';
import { AccessPoint } from '../../workspace/WorkspaceFeatures';
import { AccessPointSector } from '../../workspace/WorkspaceSectorFeature';
import { BaseAjaxSectorPopup } from './AjaxSectorPopups';
import { LinkCheckBaseAjaxFormPopup } from './LinkCheckBaseAjaxPopup';

const TOWER_UPDATE_FORM_ID = 'tower-update-form';
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
            this.accessPoint?.read(()=> {});
        });
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
        this.createInputSubmitButtonListener(TOWER_UPDATE_FORM_ID);

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
}
