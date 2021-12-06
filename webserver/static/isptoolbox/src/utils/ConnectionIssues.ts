export function renderFailedConnectionIssues() {
    $('#connection_issues_alert').show();
}

export function renderAjaxOperationFailed() {
    $("#ajax-failed_alert").fadeTo(2000, 500).slideUp(500, function(){
        $("#ajax-failed_alert").slideUp(500);
    });
}