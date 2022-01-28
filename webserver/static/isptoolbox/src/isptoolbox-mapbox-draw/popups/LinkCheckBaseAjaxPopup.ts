import { djangoUrl } from '../../utils/djangoUrl';
import { LinkCheckBasePopup, createLoadingHTMLContent, createErrorHTMLContent } from './LinkCheckBasePopup';

export abstract class LinkCheckBaseAjaxFormPopup extends LinkCheckBasePopup {
    protected endpoint: string;

    constructor(map: mapboxgl.Map, draw: MapboxDraw, endpoint: string) {
        super(map, draw);
        this.endpoint = endpoint;
    }

    protected showComponent() {
        this.popup.setLngLat(this.lnglat);
        if (!this.popup.isOpen()) {
            this.popup.off('close', this.cleanupCall);
            this.popup.setHTML(createLoadingHTMLContent());
            this.popup.addTo(this.map);
            const request_params = this.getEndpointParams();
            $.get({
                url: this.getEndpoint(),
                data: '',
                dataType: 'html',
            })
            .done((result) => {
                if(this.responseMatchesCurrent(request_params))
                {
                    this.popup.setHTML(result);
                    this.popup.on('close', this.cleanupCall);
                    this.setEventHandlers();
                }
            })
            .fail(() => {
                if(this.responseMatchesCurrent(request_params)){
                    this.popup.setHTML(createErrorHTMLContent());
                }
            })
            .always(() => {
                if(this.responseMatchesCurrent(request_params))
                {
                    this.popup.addTo(this.map);
                }
            });
        }
    }

    protected updateComponent() {
        if (this.popup.isOpen()) {
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
            // For inputs in a data with unit div, append param name to error message
            invalidHandler: (event: any, validator: any) => {
                let errorList = validator.errorList;
                errorList.forEach((err: any) => {
                    let element = $(err.element);
                    if (element.data('paramLabel')) {
                        err.message = `${element.data('paramLabel')}: ${err.message}`;
                    }
                });
            },
            // No error class in input
            highlight: (element: any, errorClass: any) => {
                $(element).removeClass(errorClass);
            },
            // For inputs in a data with unit div, display at bottom
            errorPlacement: (label: any, element: any) => {
                if (element.data('paramErrorPutAfterId')) {
                    label.insertAfter($(`#${element.data('paramErrorPutAfterId')}`));
                } else {
                    label.insertAfter(element);
                }
            },
            onkeyup: false,
            onclick: false,
            onfocusout: false,
            submitHandler: () => {
                $.post({
                    url: this.getEndpoint(),
                    data: $(`#${formId}`).serialize(),
                    dataType: 'html'
                })
                    .done((result) => {
                        this.popup.setHTML(result);
                        this.setEventHandlers();
                        if (successFollowup) {
                            successFollowup(result);
                        }
                    })
                    .fail((error) => {
                        if (errorFollowup) {
                            errorFollowup();
                        }
                    });
            }
        });
    }

    protected createInputSubmitButtonListener(formId: string) {
        // If input changes don't match initial form values, enable submit button
        $(`#${formId}`)
            .each(function () {
                $(this).data('serialized', $(this).serialize());
            })
            .on('change input', function () {
                const input_changed = !($(this).serialize() == $(this).data('serialized'));
                const submit_btn = $(this).find('input:submit, button:submit');
                submit_btn.prop('disabled', !input_changed);
                if (input_changed) {
                    submit_btn.removeClass('d-none');
                } else {
                    submit_btn.addClass('d-none');
                }
            })
            .find('input:submit, button:submit')
            .prop('disabled', true);
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

    protected responseMatchesCurrent(params: any[]): boolean{
        const allEqual = (arr: any[]) => arr.every( (params, idx) => params === arr[idx]);
        const eq = allEqual( this.getEndpointParams() );
        return eq;
    }

    protected getEndpointParams(): any[] {
        return [];
    }
}
