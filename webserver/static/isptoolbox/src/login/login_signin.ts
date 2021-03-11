$(document).ready(function () {

    function showLoginModal() {
        $('#signin_container').removeClass('d-none');
        $('#signup_container').addClass('d-none');
    }

    function showSignUpModal() {
        $('#signin_container').addClass('d-none');
        $('#signup_container').removeClass('d-none');
    }
    // $ Add Nav Listeners
    $("#login-btn-nav").on("click", () => {
        showLoginModal();
    });
    $("#no-email-sign-in").on("click", () => {
        showSignUpModal();
    });
    $("#dy_have_account").on("click", () => { showLoginModal(); })
    $("#signup_email").on("click", () => {
        $("#sign_up-form").removeClass('d-none');
    })
});