export function setConnectionStatus(online: boolean) {
    const elem = $('#connection_issues_alert');
    online ? elem.addClass("d-none") : elem.removeClass("d-none");
}

export function renderAjaxOperationFailed() {
    $("#ajax-failed_alert").removeClass("d-none").fadeTo(3000, 500).slideUp(500, function(){
        $("#ajax-failed_alert").addClass("d-none");
    });
}