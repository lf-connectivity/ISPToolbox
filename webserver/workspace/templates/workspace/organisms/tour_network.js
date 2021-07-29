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
    text: 'Take a tour to see what you can do in this tool',
    attachTo: {
        element: '#tool_help_button',
        on: 'bottom'
    },
    cancelIcon: { enabled: true },
    title: 'ISP Toolbox - LiDAR LOS Check Tool',
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
    text: 'Add network elements: towers or point-to-point links can be placed on the map.',
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
    text: 'Move the map to a location and add a network element.',
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
    title: 'Send us feedback on our facebook page!',
    text: '<a href="https://www.facebook.com/fbctoolbox" target="_blank">Link</a> to our facebook page.',
    cancelIcon: { enabled: true },
    buttons: [{
        text: 'Done',
        action: tour.next,
        classes: "btn btn-primary isptoolbox-btn",
    }]
});
{% show_nux network_nux %}
tour.start();
{% endnux %}
$(() => {
    $('#tool_help_button').on('click', () => {
        tour.start();
    });
})