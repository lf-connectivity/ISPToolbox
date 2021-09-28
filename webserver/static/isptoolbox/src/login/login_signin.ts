$(() => {
    function showLoginModal() {
        $('#signin_container').removeClass('d-none');
        $('#signup_container').addClass('d-none');
        $('#fb_sign_up_container').addClass('d-none');
    }

    function showSignUpModal() {
        $('#signup_container').removeClass('d-none');
        $('#signin_container').addClass('d-none');
        $('#fb_sign_up_container').addClass('d-none');
    }

    function showFBSignUpModal() {
        $('#fb_sign_up_container').removeClass('d-none');
        $('#signin_container').addClass('d-none');
        $('#signup_container').addClass('d-none');
    }
    // $ Add Nav Listeners
    $('#login-btn-nav').on('click', () => {
        showLoginModal();
    });
    $('#no-email-sign-in').on('click', () => {
        showSignUpModal();
    });
    $('.dy_have_account').on('click', (e: any) => {
        showLoginModal();
        e.preventDefault();
    });
    $('#signup_email').on('click', () => {
        showSignUpModal();
    });
    $('#signup_fb').on('click', () => {
        showFBSignUpModal();
    });
    $('#no_act_yet').on('click', (e: any) => {
        showFBSignUpModal();
        e.preventDefault();
    });
});
