// (c) Meta Platforms, Inc. and affiliates. Copyright
export function clickedOnMapCanvas(e: any) {
    return (
        e.originalEvent &&
        e.originalEvent.target != null &&
        // @ts-ignore
        $(e.originalEvent.target).prop('tagName').toLowerCase() == 'canvas' &&
        // @ts-ignore
        $(e.originalEvent.target).hasClass('mapboxgl-canvas')
    );
}
