import MapboxGL from 'mapbox-gl';

export default interface MapboxOverlay {
    show(map: MapboxGL.Map): void;
    remove(map: MapboxGL.Map): void;
}
