{% load nux i18n %}
const tour = new Shepherd.Tour({
    defaultStepOptions: {
        classes: '',
        scrollTo: true
    },
    useModalOverlay: true
});
tour.addStep({
    id: 'example-step',
    text: "{% translate 'Market Evaluator helps you assess areas your ISP could serve. Start by drawing a coverage area or placing an access point to see the number of rooftops, potential competitors, and average incomes in that area. <a href=\'https://facebook.com/isptoolbox\' target=\'_blank\'>Learn More</a>'%}",
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
{% show_nux market_nux %}
tour.start();
{% endnux %}
$(() => {
    $('#tool_help_button').on('click', () => {
        tour.cancel();
        tour.start();
    })
})
