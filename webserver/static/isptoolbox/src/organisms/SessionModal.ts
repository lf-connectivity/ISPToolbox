import { getCookie } from '../utils/Cookie';
import { getSessionID } from '../utils/MapPreferences';
import { getToolURL } from '../utils/ToolURL';
import { djangoUrl } from '../utils/djangoUrl';

export class SessionModal {
    constructor() {
        $('#paginationNetworkModal').on('shown.bs.modal', this.showModalCallback.bind(this));
    }

    getCurrentOrdering(): string {
        return $('#session-modal-ordering').val() as string;
    }

    getCurrentPage(): string {
        return $('#session-modal-page-num').val() as string;
    }
    showModalCallback(e: any, page: string | undefined, ordering: string | undefined) {
        $.get(
            '/pro/workspace/api/session/list/',
            { page, ordering },
            (result) => {
                $('#session-list-modal-body').html(result);
            },
            'html'
        ).done(() => {
            // Pagination Callback
            $('.session-modal-page-change').one('click', (e) => {
                const page = e.currentTarget.getAttribute('page-target') as string;
                const ordering = this.getCurrentOrdering();
                this.showModalCallback({}, page, ordering);
            });

            $('.session-name-link').on('click', (event) => {
                e.preventDefault();
                const uuid = event.currentTarget.getAttribute('data-target');
                const url = `${getToolURL()}${uuid}/`;
                window.location.replace(url);
            });

            // Edit Button Callback
            $('.session-edit-btn').on('click', (event) => {
                const uuid = event.currentTarget.getAttribute('data-target');
                $(`.update-form-name[data-target=${uuid}]`).removeClass('d-none');
                $(`.session-name-link[data-target=${uuid}]`).addClass('d-none');
                $(`.session-edit-btn[data-target=${uuid}]`).addClass('d-none');
                $(`.session-save-btn[data-target=${uuid}]`).removeClass('d-none');
            });

            // Save Button Callback
            $('.session-save-btn').on('click', (event) => {
                const uuid = event.currentTarget.getAttribute('data-target');
                $.ajax({
                    url: `/pro/workspace/api/session/${uuid}/`,
                    data: {
                        name: $(`.session-name-input[data-target=${uuid}]`).val()
                    },
                    method: 'PATCH',
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken'),
                        Accept: 'application/json'
                    }
                })
                    .done(() => {
                        if (uuid === getSessionID()) {
                            window.location.replace(
                                djangoUrl('workspace:edit_network_by_uuid', uuid)
                            );
                        }
                    })
                    .always(() => {
                        this.showModalCallback(null, page, ordering);
                    });
            });
            // Delete Button Callback
            $('.session-delete-btn').on('click', (event) => {
                const uuid = event.currentTarget.getAttribute('data-target');
                if (typeof uuid === 'string') {
                    $.ajax({
                        url: `/pro/workspace/api/session/delete/${uuid}/`,
                        method: 'POST',
                        headers: {
                            'X-CSRFToken': getCookie('csrftoken'),
                            Accept: 'application/json'
                        }
                    }).done(() => {
                        if (uuid === getSessionID()) {
                            window.location.replace('/pro/network/edit/');
                        } else {
                            const ordering = this.getCurrentOrdering();
                            const page = this.getCurrentPage();
                            this.showModalCallback(null, page, ordering);
                        }
                    });
                }
            });
            // Ordering Button Callbacks
            $('.sort-ap').on('click', (e: any) => {
                const ordering = e.currentTarget.getAttribute('ordering-target');
                const page = this.getCurrentPage();
                console.log({ ordering, page });
                this.showModalCallback(undefined, page, ordering);
            });
        });
    }
}
