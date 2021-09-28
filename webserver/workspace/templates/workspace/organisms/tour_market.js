{% load nux i18n %}
const tour = new Shepherd.Tour({
    defaultStepOptions: {
        classes: 'isptoolbox-tour',
        scrollTo: true
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
    title: 'ISP Toolbox - Market Evaluator',
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
    cancelIcon: { enabled: true },
    buttons: [{
        text: "{% translate 'Next'%}",
        action: tour.next,
        classes: "btn btn-primary isptoolbox-btn",
    }]
});
tour.addStep({
    id: 'example-step',
    text: "{% translate 'Outline the area of interest by placing a tower or outlining a coverage area.'%}",
    attachTo: {
        element: '#drawing-controls',
        on: 'bottom'
    },
    cancelIcon: { enabled: true },
    buttons: [{
        text: "{% translate 'Next'%}",
        action: tour.next,
        classes: "btn btn-primary isptoolbox-btn",
    }]
});
tour.addStep({
    id: 'example-step',
    text: "{% translate 'This panel will display market data for the selected area.'%}",
    attachTo: {
        element: '#market-eval-stats',
        on: 'right'
    },
    cancelIcon: { enabled: true },
    buttons: [{
        text: "{% translate 'Next'%}",
        action: tour.next,
        classes: "btn btn-primary isptoolbox-btn",
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
