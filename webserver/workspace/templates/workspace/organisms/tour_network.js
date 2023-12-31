// (c) Meta Platforms, Inc. and affiliates. Copyright
{% load nux i18n %}
const tour_dots = '<svg width="48" height="10" viewBox="0 0 48 10" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="5" fill="#EDEDED"/><circle cx="24" cy="5" r="5" fill="#A2A2A2"/><circle cx="43" cy="5" r="5" fill="#EDEDED"/></svg>';
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
    text: "{% translate 'LOS Check helps you assess if your link has a clear line of sight using LiDAR data. Start by plotting a PtP (point-to-point) link to see a 3D display of possible obstructions and details. <a href=\'https://facebook.com/isptoolbox/line-of-sight-check/\' target=\'_blank\'>Learn More</a>' %}",
    attachTo: {
        element: '#tool_help_button',
        on: 'bottom'
    },
    cancelIcon: { enabled: true },
    title: '<b>ISP Toolbox - LiDAR LOS Check Tool</b>',
    classes: 'footer-left-aligned',
    buttons: [{
        text: "{% translate 'Take a Tour' %}",
        action: tour.next,
        classes: "btn btn-primary isptoolbox-btn",
    }]
});
{% if request.user.is_authenticated %}
tour.addStep({
    id: 'example-step',
    text: "{% translate 'Use this session menu to switch between sessions or inspect and change session properties.' %}",
    attachTo: {
        element: '#navbarDropdown',
        on: 'bottom'
    },
    classes: 'footer-no-padding',
    cancelIcon: { enabled: true },
    buttons: [{
        text: tour_dots,
        action: tour.back,
        classes: 'btn px-4 ml-2'
    },
    {
        text: tour_arrow,
        action: tour.next,
        classes: "btn btn-primary isptoolbox-btn py-3 px-4",
    }]
});
{% endif %}
tour.addStep({
    id: 'example-step',
    text: "{% translate 'Add network elements: towers or point-to-point links can be placed on the map.' %}",
    attachTo: {
        element: '#drawing-controls',
        on: 'bottom'
    },
    classes: 'footer-no-padding',
    cancelIcon: { enabled: true },
    buttons: [{
        text: tour_dots,
        action: tour.back,
        classes: 'btn px-4 ml-2'
    },
    {
        text: tour_arrow,
        action: tour.next,
        classes: "btn btn-primary isptoolbox-btn py-3 px-4",
    }]
});
tour.addStep({
    id: 'example-step',
    text: "{% translate 'Move the map to a location and add a network element.' %}",
    attachTo: {
        element: '#geocoder',
        on: 'bottom'
    },
    classes: 'footer-no-padding',
    cancelIcon: { enabled: true },
    buttons: [{
        text: tour_dots,
        action: tour.back,
        classes: 'btn px-4 ml-2'
    },
    {
        text: tour_arrow,
        action: tour.next,
        classes: "btn btn-primary isptoolbox-btn py-3 px-4",
    }]
});
tour.addStep({
    id: 'example-step',
    title: 'Send us feedback on our Facebook page!',
    text: "{% translate '<a href=\'https://www.facebook.com/fbctoolbox\' target=\'_blank\'>Contact Us</a>' %}",
    cancelIcon: { enabled: true },
    buttons: [{
        text: "{% translate 'Done' %}",
        action: tour.next,
        classes: "btn btn-primary isptoolbox-btn",
    }]
});
const disclaimer = new Shepherd.Tour({
    defaultStepOptions: {
        classes: '',
        scrollTo: true
    },
    useModalOverlay: true
});
disclaimer.addStep({
    id: 'disclaimer',
    text: "{% translate 'The ISP Toolbox contains embedded content from and links to third party websites subject to additional terms, conditions, and policies imposed by the third party. By interacting with this embedded content or third party links, you direct Meta to make your personal data available to the third party and acknowledge that your usage of such content is subject to the third party’s terms, conditions, and policies. Meta has no obligations or liability with respect to your access to or use of any content or functionality provided by a third party.'%}",
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
    {% show_nux network_disclaimer %}
    disclaimer.start();
    {% endnux %}
    {% show_nux network_nux %}
    const start_tour = () => {
        if ($("#tool_help_button").is(":visible")) {
            tour.start();
        }
    }
    if (disclaimer.isActive()) {
        disclaimer.once('cancel', () => {
            start_tour();
        })
    } else {
        start_tour();
    }
    {% endnux %}
    $('#tool_help_button').on('click', () => {
        if (tour.isActive()) {
            tour.cancel();
        } else {
            tour.start();
        }
    });
    $('#disclaimer-link').on('click', () => {
        if (disclaimer.isActive()) {
            disclaimer.cancel();
        } else {
            disclaimer.start();
        }
    });
})
