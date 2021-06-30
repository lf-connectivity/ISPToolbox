import MapboxGL from 'mapbox-gl';

export default interface MapboxOverlay {
    show(): void;
    remove(): void;
}
