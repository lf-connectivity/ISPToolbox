import MapboxDraw from '@mapbox/mapbox-gl-draw';
import mapboxgl from 'mapbox-gl';
import { LinkCheckBasePopup } from './LinkCheckBasePopup';

export class DeleteFromPopupConfirmationModal {
    private map: mapboxgl.Map;
    private draw: MapboxDraw;
    private feature?: any;
    private popup?: LinkCheckBasePopup;
    private static _instance: DeleteFromPopupConfirmationModal;

    constructor(map: mapboxgl.Map, draw: MapboxDraw) {
        if (DeleteFromPopupConfirmationModal._instance) {
            return DeleteFromPopupConfirmationModal._instance;
        }

        this.map = map;
        this.draw = draw;

        $(`#ap-delete-confirm-btn`).off().on('click', this.deleteSetFeatures.bind(this));
        DeleteFromPopupConfirmationModal._instance = this;
    }

    setFeatureToDelete(feature: any) {
        this.feature = feature;
        return this;
    }

    setPopup(popup: LinkCheckBasePopup) {
        this.popup = popup;
        return this;
    }

    private deleteSetFeatures() {
        if (this.popup && this.feature) {
            this.draw.delete([this.feature.id]);
            this.map.fire('draw.delete', {
                features: [this.feature]
            });
            this.feature = undefined;
            this.popup.hide();
            this.popup = undefined;
        }
    }

    static getInstance() {
        return DeleteFromPopupConfirmationModal._instance;
    }
}
