import { getCookie } from '../utils/Cookie';
import { getSessionID } from '../utils/MapPreferences';
import { getToolURL } from '../utils/ToolURL';
import { addHoverTooltip } from './HoverTooltip';

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
            $('.ap-delete-btn').on('click', (event) => {
                // @ts-ignore
                $('#paginationNetworkModal').modal('hide');
                // @ts-ignore
                $('#sessionDel').modal('show');
                const uuid = event.currentTarget.getAttribute('data-target');
                const name = event.currentTarget.getAttribute('data-target-name');
                // Update modal text
                if(typeof name === 'string')
                {
                    // TODO: i18n
                    $('#sessionDelTitle').text(`Are you sure you want to delete the session '${name}'?`);
                }
                const delete_submit_callback = () => {$.ajax({
                    url: djangoUrl('workspace:session_delete', uuid),
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken'),
                        Accept: 'application/json'
                    }
                }).done(() => {
                    if (uuid === getSessionID()) {
                        window.location.replace('/pro/network/edit/');
                    }
                })};
                // Add Callback to Modal Submit
                const delForm = $('#sessionDel').find('#session-delete-confirm-btn');
                delForm.on("click", delete_submit_callback);

                $('#sessionDel').on('hidden.bs.modal', (e) => {
                    // Remove callback on modal close
                    delForm.off('click', delete_submit_callback);
                });
            });
            // Ordering Button Callbacks
            $('.sort-ap').on('click', (e: any) => {
                const ordering = e.currentTarget.getAttribute('ordering-target');
                const page = this.getCurrentPage();
                this.showModalCallback(undefined, page, ordering);
            });

            // Hover tooltips for save/edit/delete
            addHoverTooltip('.session-save-btn');
            addHoverTooltip('.session-edit-btn');
            addHoverTooltip('.session-delete-btn');
        });
    }
}
