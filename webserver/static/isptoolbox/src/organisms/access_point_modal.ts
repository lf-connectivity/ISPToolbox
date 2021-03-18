export class AccessPointModal {
    selector: string;
    constructor(selector: string) {
        this.selector = selector
        $(this.selector).on(
            // @ts-ignore
            'show.bs.modal',
            this.getAccessPoints.bind(this)
        );
        // @ts-ignore
        $(this.selector).modal('show');
    }

    getAccessPoints(){
        $.get('/pro/workspace/api/ap-los/', '',(result) => {
            $('#ap-list-modal-body').html(result); // Or whatever you need to insert the result
        },'html');
    }
}
