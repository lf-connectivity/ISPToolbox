export function renderFailedConnectionIssues() {
    $('#connection_issues_alert').removeClass("d-none");
}

export function renderAjaxOperationFailed() {
    $("#ajax-failed_alert").removeClass("d-none").fadeTo(3000, 500).slideUp(500, function(){
        $("#ajax-failed_alert").addClass("d-none");
    });
}