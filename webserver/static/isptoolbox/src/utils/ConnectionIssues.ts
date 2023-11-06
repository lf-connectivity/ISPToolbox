// (c) Meta Platforms, Inc. and affiliates. Copyright
import * as _ from 'lodash';

export function setConnectionStatus(online: boolean) {
    const elem = $('#connection_issues_alert');
    online ? elem.addClass('d-none') : elem.removeClass('d-none');
}

export function renderAjaxOperationFailed() {
    $('#ajax-failed_alert')
        .removeClass('d-none')
        .fadeTo(3000, 500)
        .slideUp(500, function () {
            $('#ajax-failed_alert').addClass('d-none');
        });
}

function _renderQueryTimeout() {
    $('#market-eval-query-error')
        .removeClass('d-none')
        .fadeTo(3000, 500)
        .slideUp(500, function () {
            $('#long-query-alert').addClass('d-none');
        });
}

export const renderQueryTimeout = _.debounce(_renderQueryTimeout, 3500, {
    leading: true,
    trailing: false
});
