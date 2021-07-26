$(() => {
    $('#market-eval-export-frm').on('submit', function (event) {
        event.preventDefault();
        var $crf_token = $('[name="csrfmiddlewaretoken"]').attr('value');
        $('#me-export-load-msg').removeClass('d-none');
        $('.me-hide-on-export').addClass('d-none');
        $.ajax({
            data: $(this).serialize(),
            type: "POST",
            dataType: "json",
            headers: {
                "X-CSRFToken": $crf_token
            },
            url: $('#market-eval-export-frm').attr('action'),
            success: function (response) {
                $('#me-export-load-msg').addClass('d-none');
                $('#me-export-download-link').removeClass('d-none').attr('href',
                    response.url);
            },
            error: (response) => {
                $('#me-export-load-msg').addClass('d-none');
                $('#market-eval-error-msg').removeClass('d-none');
            }
        })
    });
    $('#exportMEModal').on('show.bs.modal', () => {
        $('#me-export-load-msg, #me-export-download-link, #market-eval-error-msg, #me-export-load-msg')
            .addClass(
                'd-none');
        $('.me-hide-on-export').removeClass('d-none');
    });
});