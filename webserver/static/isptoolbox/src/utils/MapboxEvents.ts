export function clickedOnMapCanvas(e: any) {
    const target = e.originalEvent.target;
    return (
        target !== null &&
        // @ts-ignore
        $(target).prop('tagName').toLowerCase() == 'canvas' &&
        // @ts-ignore
        $(target).hasClass('mapboxgl-canvas')
    );
}
