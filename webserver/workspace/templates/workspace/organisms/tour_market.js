{% load nux i18n %}
const tour_dots = '<svg width="48" height="10" viewBox="0 0 48 10" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="5" fill="#EDEDED"/><circle cx="24" cy="5" r="5" fill="#A2A2A2"/><circle cx="43" cy="5" r="5" fill="#EDEDED"/></svg>';
const style_dots = "btn px-4 ml-2";
const tour_arrow_reverse = '<svg width="10" height="17" viewBox="0 0 10 17" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 15.0025L3.81916 8.5L10 1.9975L8.09717 0L0 8.5L8.09717 17L10 15.0025Z" fill="white"/></svg>';
const tour_arrow = '<svg width="10" height="17" viewBox="0 0 10 17" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 1.9975L6.18084 8.5L0 15.0025L1.90283 17L10 8.5L1.90283 0L0 1.9975Z" fill="white"/></svg>';
const tour = new Shepherd.Tour({
    defaultStepOptions: {
        classes: 'isptoolbox-tour',
        scrollTo: true,
        popperOptions: {
            modifiers: [{ name: 'offset', options: { offset: [0, 12] } }]
        }
    },
    useModalOverlay: true
});
tour.addStep({
    id: 'example-step',
    text: "{% translate 'Market Evaluator helps you assess areas your ISP could serve. Start by drawing a coverage area or placing an access point to see the number of rooftops, potential competitors, and average incomes in that area. <a href=\'https://www.facebook.com/isptoolbox/market-evaluator/\' target=\'_blank\'>Learn More</a>'%}",
    attachTo: {
        element: '#tool_help_button',
        on: 'bottom'
    },
    cancelIcon: { enabled: true },
    title: '<b>ISP Toolbox - Market Evaluator</b>',
    classes: 'footer-left-aligned',
    buttons: [{
        text: "{% translate 'Take a Tour'%}",
        action: tour.next,
        classes: "btn btn-primary isptoolbox-btn",
    }]
});
tour.addStep({
    id: 'example-step',
    text: "{% translate 'Start by navigating to the area you wish to explore.'%}",
    attachTo: {
        element: '#geocoder',
        on: 'bottom'
    },
    classes: 'footer-no-padding',
    cancelIcon: { enabled: true },
    buttons: [{
        text: tour_arrow_reverse,
        action: tour.back,
        classes: "btn btn-primary isptoolbox-btn py-3 px-4",
    },
    {
        text: tour_arrow,
        action: tour.next,
        classes: "btn btn-primary isptoolbox-btn py-3 px-4",
    }]
});
tour.addStep({
    id: 'example-step',
    text: "{% translate 'Outline the area of interest by placing a tower or outlining a coverage area.'%}",
    attachTo: {
        element: '#drawing-controls',
        on: 'bottom'
    },
    classes: 'footer-no-padding',
    cancelIcon: { enabled: true },
    buttons: [{
        text: tour_arrow_reverse,
        action: tour.back,
        classes: 'btn btn-primary isptoolbox-btn py-3 px-4'
    },
    {
        text: tour_arrow,
        action: tour.next,
        classes: "btn btn-primary isptoolbox-btn py-3 px-4",
    }]
});
tour.addStep({
    id: 'example-step',
    text: "{% translate 'This panel will display market data for the selected area.'%}",
    attachTo: {
        element: '#market-eval-stats',
        on: 'right'
    },
    classes: 'footer-no-padding',
    cancelIcon: { enabled: true },
    buttons: [{
        text: tour_arrow_reverse,
        action: tour.back,
        classes: 'btn btn-primary isptoolbox-btn py-3 px-4'
    },
    {
        text: tour_arrow,
        action: tour.next,
        classes: "btn btn-primary isptoolbox-btn py-3 px-4",
    }]
});
{% if request.user.is_authenticated %}
tour.addStep({
    id: 'example-step',
    text: "{% translate 'Here you can save and manage your map sessions.'%}",
    attachTo: {
        element: '#navbarDropdown',
        on: 'bottom'
    },
    cancelIcon: { enabled: true },
    buttons: [{
        text: "{% translate 'Got it'%}",
        action: tour.next,
        classes: "btn btn-primary isptoolbox-btn",
    }]
});
{% else %}
tour.addStep({
    id: 'example-step',
    text: "{% translate 'Want to save your work? Create an account.'%}",
    attachTo: {
        element: '#account-dropdown',
        on: 'bottom'
    },
    cancelIcon: { enabled: true },
    buttons: [{
        text: "{% translate 'Got it'%}",
        action: tour.next,
        classes: "btn btn-primary isptoolbox-btn",
    }]
});
{% endif %}
const disclaimer = new Shepherd.Tour({
    defaultStepOptions: {
        classes: '',
        scrollTo: true
    },
    useModalOverlay: true
});
disclaimer.addStep({
    id: 'disclaimer',
    text: "{% translate 'This tool is intended for informational purposes only, and is provided \"as is\" solely in order to generate estimates. Please perform independent market research and consult an expert before deploying a network. Facebook makes no warranties regarding the accuracy of the tool or the third-party data sources and tools referenced below. Users are encouraged to check cited sources for latest updates and to learn more. Data is only available in the United States and Canada.'%}",
    attachTo: {
        element: '#disclaimer-link',
        on: 'top'
    },
    title: "{% translate 'Disclaimer'%}",
    buttons: [{
        text: "{% translate 'I understand' %}",
        action: () => { disclaimer.cancel(); },
        classes: "btn btn-primary isptoolbox-btn",
    }]
});
$(() => {
    {% show_nux market_disclaimer %}
    disclaimer.start();
    {% endnux %}
    {% show_nux market_nux %}
    if (!$('.mobile-overlay-lock').is(':visible')) {
        if (disclaimer.isActive()) {
            disclaimer.once('cancel', () => {
                tour.start();
            })
        } else {
            tour.start();
        }
    }
    {% endnux %}

    $('#tool_help_button').on('click', () => {
        tour.cancel();
        tour.start();
    });
    $('#disclaimer-link').on('click', () => {
        disclaimer.cancel();
        disclaimer.start();
    });
})

