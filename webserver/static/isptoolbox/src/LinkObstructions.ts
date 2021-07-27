export class LinkStatus {
    obstructions: Array<[number, number]> = [];
    still_loading: boolean = false;

    updateObstructionsData(obstructions: Array<[number, number]>) {
        this.obstructions = obstructions;
        this.render();
    }
    updateLoadingStatus(isLoading: boolean) {
        this.still_loading = isLoading;
        this.render();
    }

    render() {
        if (this.obstructions.length > 0) {
            if (this.still_loading) {
                $('#link-status--status')
                    .html('Loading&nbsp;')
                    .css('color', '#E29842')
                    .addClass('d-none');
                $('#link-status--loading-spinner').removeClass('d-none');
                $('#link-status--obstructions').text(`(${this.obstructions.length} Obstructions)`);
            } else {
                $('#link-status--status')
                    .html('Failed&nbsp;')
                    .css('color', '#D82020')
                    .removeClass('d-none');
                $('#link-status--loading-spinner').addClass('d-none');
                $('#link-status--obstructions').text(`(${this.obstructions.length} Obstructions)`);
            }
        } else {
            $('#link-status--status')
                .html('Passed&nbsp;')
                .css('color', '#288F13')
                .removeClass('d-none');
            $('#link-status--loading-spinner').addClass('d-none');
            $('#link-status--obstructions').text('(No Obstructions)');
        }
    }
}
