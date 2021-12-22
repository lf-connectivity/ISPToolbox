import { djangoUrl } from '../../utils/djangoUrl';
import { LinkCheckBasePopup, LOADING_SVG } from './LinkCheckBasePopup';

export abstract class LinkCheckBaseAjaxFormPopup extends LinkCheckBasePopup {
    protected endpoint: string;

    constructor(map: mapboxgl.Map, draw: MapboxDraw, endpoint: string) {
        super(map, draw);
        this.endpoint = endpoint;
    }

    protected showComponent() {
        this.popup.setLngLat(this.lnglat);
        if (!this.popup.isOpen()) {
            this.popup.setHTML(LOADING_SVG);
            this.popup.addTo(this.map);
            $.get(
                this.getEndpoint(),
                '',
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

    protected createSubmitFormCallback(
        formId: string,
        successFollowup?: (result: any) => void,
        errorFollowup?: () => void
    ) {
        // @ts-ignore
        $(`#${formId}`).validate({
            onkeyup: false,
            submitHandler: () => {
                $.post(
                    this.getEndpoint(),
                    $(`#${formId}`).serialize(),
                    (result) => {
                        this.popup.setHTML(result);
                        if (successFollowup) {
                            successFollowup(result);
                        }
                    },
                    'html'
                )
                    .fail(() => {})
                    .done(() => {
                        this.setEventHandlers();
                    });
            }
        });
    }

    // for getting rid of abstract function definition
    protected getHTML() {
        return '';
    }

    protected getEndpoint(): string {
        if (!this.getEndpointParams()) {
            return djangoUrl(this.endpoint);
        } else {
            return djangoUrl(this.endpoint, ...this.getEndpointParams());
        }
    }

    protected getEndpointParams(): any[] {
        return [];
    }
}
