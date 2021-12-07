export function renderFailedConnectionIssues() {
    $('#connection_issues_alert').show();
}

export function renderAjaxOperationFailed() {
    $("#ajax-failed_alert").fadeTo(3000, 500).slideUp(500);
}