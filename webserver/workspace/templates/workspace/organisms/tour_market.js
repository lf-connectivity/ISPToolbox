{% load nux %}
const tour = new Shepherd.Tour({
    defaultStepOptions: {
        classes: 'shadow-md bg-purple-dark',
        scrollTo: true
    },
    useModalOverlay: true
});
tour.addStep({
    id: 'example-step',
    text: 'Market Evaluator helps you assess areas your ISP could serve. Start by drawing a coverage area or placing an access point to see the number of rooftops, potential competitors, and average incomes in that area. <a href="https://facebook.com/isptoolbox" target="_blank">Learn More</a>',
    attachTo: {
        element: '#tool_help_button',
        on: 'bottom'
    },
    cancelIcon: { enabled: true },
    title: 'ISP Toolbox - Market Evaluator',
    classes: 'footer-left-aligned',
    buttons: [{
        text: 'Take a Tour',
        action: tour.next,
        classes: "btn btn-primary isptoolbox-btn",
    }]
});
tour.addStep({
    id: 'example-step',
    text: 'Use this session menu to switch between sessions or inspect and change session properties.',
    attachTo: {
        element: '#navbarDropdown',
        on: 'bottom'
    },
    cancelIcon: { enabled: true },
    buttons: [{
        text: 'Next',
        action: tour.next,
        classes: "btn btn-primary isptoolbox-btn",
    }]
});
tour.addStep({
    id: 'example-step',
    text: 'Add markets: coverage area or towers can be placed on the map.',
    attachTo: {
        element: '#drawing-controls',
        on: 'bottom'
    },
    cancelIcon: { enabled: true },
    buttons: [{
        text: 'Next',
        action: tour.next,
        classes: "btn btn-primary isptoolbox-btn",
    }]
});
tour.addStep({
    id: 'example-step',
    text: 'Move the map to a location and add market.',
    attachTo: {
        element: '#geocoder',
        on: 'bottom'
    },
    cancelIcon: { enabled: true },
    buttons: [{
        text: 'Next',
        action: tour.next,
        classes: "btn btn-primary isptoolbox-btn",
    }]
});
tour.addStep({
    id: 'example-step',
    text: 'After drawing a market, the size of the market will show up here.',
    attachTo: {
        element: '#market-eval-stats',
        on: 'right'
    },
    cancelIcon: { enabled: true },
    buttons: [{
        text: 'Next',
        action: tour.next,
        classes: "btn btn-primary isptoolbox-btn",
    }]
});
tour.addStep({
    id: 'example-step',
    title: 'Send us feedback on our facebook page!',
    text: '<a href="https://www.facebook.com/fbctoolbox" target="_blank">Link</a> to our facebook page.',
    cancelIcon: { enabled: true },
    buttons: [{
        text: 'Done',
        action: tour.next,
        classes: "btn btn-primary isptoolbox-btn",
    }]
});
{% show_nux market_nux %}
tour.start();
{% endnux %}
$(() => {
    $('#tool_help_button').on('click', () => {
        tour.start();
    })
})
