import { LinkCheckBasePopup } from './LinkCheckBasePopup';

export abstract class LinkCheckBaseAjaxPopup extends LinkCheckBasePopup {
    protected endpointUrl: string;

    constructor(map: mapboxgl.Map, draw: MapboxDraw, endpointUrl: string) {
        super(map, draw);
        this.endpointUrl = endpointUrl;
    }

    protected showComponent() {
        this.popup.setLngLat(this.lnglat);
        if (!this.popup.isOpen()) {
            let data = this.getData();
            if (!this.getData()) {
                data = '';
            }

            $.get(
                this.endpointUrl,
                data,
                (result) => {
                    this.popup.setHTML(result);
                },
                'html'
            )
                .fail(() => {})
                .done(() => {
                    this.popup.addTo(this.map);
                    this.setEventHandlers();
                });
        }
    }

    // for getting rid of abstract class clause
    protected getHTML() {
        return '';
    }

    protected abstract getData(): any;
}
