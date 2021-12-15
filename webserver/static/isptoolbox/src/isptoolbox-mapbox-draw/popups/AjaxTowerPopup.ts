import { roundToDecimalPlaces } from '../../LinkCalcUtils';
import { IMapboxDrawPlugin, initializeMapboxDrawInterface } from '../../utils/IMapboxDrawPlugin';
import { WorkspaceFeatureTypes } from '../../workspace/WorkspaceConstants';
import { AccessPoint } from '../../workspace/WorkspaceFeatures';
import { LinkCheckBaseAjaxFormPopup } from './LinkCheckBaseAjaxPopup';

const PLACE_SECTOR_BUTTON_ID = 'place-sector-btn-tower-popup';

export class AjaxTowerPopup extends LinkCheckBaseAjaxFormPopup implements IMapboxDrawPlugin {
    protected accessPoint?: AccessPoint;
    protected static _instance: AjaxTowerPopup;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        if (AjaxTowerPopup._instance) {
            return AjaxTowerPopup._instance;
        }
        super(map, draw, 'workspace:tower-form');
        initializeMapboxDrawInterface(this, this.map);
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
        $(`#${PLACE_SECTOR_BUTTON_ID}`)
            .off()
            .on('click', () => {
                // Create two random sectors if there aren't any
                if (this.accessPoint && !this.accessPoint.sectors.size) {
                    for (let i = 0; i < 2; i++) {
                        let heading = roundToDecimalPlaces(Math.random() * 360.0, 1);
                        let azimuth = roundToDecimalPlaces((Math.random() * 360 + 0.1) % 360, 1);
                        let newSector = {
                            type: 'Feature',
                            geometry: {
                                type: 'Point',
                                coordinates: this.lnglat
                            },
                            properties: {
                                feature_type: WorkspaceFeatureTypes.SECTOR,
                                ap: this.accessPoint.workspaceId,
                                heading: heading,
                                azimuth: azimuth,
                                radius: 1,
                                height: 100,
                                default_cpe_height: 3,
                                frequency: 2.437,
                                name: 'Random Sector',
                                uneditable: true
                            }
                        };
                        this.map.fire('draw.create', { features: [newSector] });
                    }
                }
            });
    }

    protected cleanup() {}

    protected getEndpointParams() {
        return [this.accessPoint?.workspaceId];
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
