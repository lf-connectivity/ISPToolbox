// Shamelessly copied off of https://bl.ocks.org/chriswhong/8977c0d4e869e9eaf06b4e9fda80f3ab
import * as MapboxGL from 'mapbox-gl';

export class ClickableMarker extends MapboxGL.Marker {
    private clickHandler: (e: any) => void;

    onClick(handleClick: (e: any) => void) {
        this.clickHandler = handleClick;
        return this;
    }

    _onMapClick(e: any) {
        const targetElement = e.originalEvent.target;

        // @ts-ignore
        const element = this._element;

        if (this.clickHandler && (targetElement === element || element.contains(targetElement))) {
            this.clickHandler(e);
        }
    }
}
