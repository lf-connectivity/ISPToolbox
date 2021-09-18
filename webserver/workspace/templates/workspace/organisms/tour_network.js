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
    text: "{% translate 'LOS Check helps you assess if your link has a clear line of sight using LiDAR data. Start by plotting a PtP (point-to-point) link to see a 3D display of possible obstructions and details. <a href=\'https://facebook.com/isptoolbox/line-of-sight-check/\' target=\'_blank\'>Learn More</a>' %}",
    attachTo: {
        element: '#tool_help_button',
        on: 'bottom'
    },
    cancelIcon: { enabled: true },
    title: 'ISP Toolbox - LiDAR LOS Check Tool',
    classes: 'footer-left-aligned',
    buttons: [{
        text: "{% translate 'Take a Tour' %}",
        action: tour.next,
        classes: "btn btn-primary isptoolbox-btn",
    }]
});
tour.addStep({
    id: 'example-step',
    text: "{% translate 'Use this session menu to switch between sessions or inspect and change session properties.' %}",
    attachTo: {
        element: '#navbarDropdown',
        on: 'bottom'
    },
    cancelIcon: { enabled: true },
    buttons: [{
        text: "{% translate 'Next' %}",
        action: tour.next,
        classes: "btn btn-primary isptoolbox-btn",
    }]
});
tour.addStep({
    id: 'example-step',
    text: "{% translate 'Add network elements: towers or point-to-point links can be placed on the map.' %}",
    attachTo: {
        element: '#drawing-controls',
        on: 'bottom'
    },
    cancelIcon: { enabled: true },
    buttons: [{
        text: "{% translate 'Next' %}",
        action: tour.next,
        classes: "btn btn-primary isptoolbox-btn",
    }]
});
tour.addStep({
    id: 'example-step',
    text: "{% translate 'Move the map to a location and add a network element.' %}",
    attachTo: {
        element: '#geocoder',
        on: 'bottom'
    },
    cancelIcon: { enabled: true },
    buttons: [{
        text: "{% translate 'Next' %}",
        action: tour.next,
        classes: "btn btn-primary isptoolbox-btn",
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
    {% show_nux network_disclaimer %}
    disclaimer.start();
    {% endnux %}
    {% show_nux network_nux %}
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