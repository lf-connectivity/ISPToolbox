export enum LinkProfileDisplayOption {
    LINK_CHART = 'link_chart',
    DRAWING_INSTRUCTIONS = 'drawing_instructions',
    LOADING_CHART = 'loading_spinner',
    LOADING_ERROR = 'loading_failed_spinner',
}

export class LinkProfileView {
    constructor() {
    }

    render(display: LinkProfileDisplayOption) {
        for (let option in LinkProfileDisplayOption) {
            if (Object(LinkProfileDisplayOption)[option] === display) {
                $(`#${Object(LinkProfileDisplayOption)[option]}`).removeClass('d-none');
            } else {
                $(`#${Object(LinkProfileDisplayOption)[option]}`).addClass('d-none');
            }
        }

        if (display === LinkProfileDisplayOption.LINK_CHART) {
            $("#3D-view-btn").removeClass('d-none');
            $('#los-chart-tooltip-button').removeClass('d-none');
            $('#link-title').removeClass('d-none');
        } else {
            $('#los-chart-tooltip-button').addClass('d-none');
            $("#3D-view-btn").addClass('d-none');
        }

        if (display === LinkProfileDisplayOption.DRAWING_INSTRUCTIONS) {
            $('.radio-card-body').addClass('d-none');
            $('#link-title').addClass('d-none');
        } else {
            $('.radio-card-body').removeClass('d-none');
            $('#link-title').removeClass('d-none');
        }
    }
}