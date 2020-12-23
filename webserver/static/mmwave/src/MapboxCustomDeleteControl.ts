import * as MapboxGL from "mapbox-gl";

interface deleteCallback {
    (features: Array<MapboxGL.MapboxGeoJSONFeature>) : void;
};
export default class MapboxCustomDeleteControl {
    _map: MapboxGL.Map;
    _draw: any; //MapboxDraw;
    _container: HTMLDivElement;
    _button: HTMLButtonElement;
    _deleteCallback: deleteCallback;
  
    constructor(inputs: {
      map: MapboxGL.Map,
      draw: any//MapboxDraw,
      deleteCallback: deleteCallback
    }) {
      this._map = inputs.map;
      this._draw = inputs.draw;
      this._deleteCallback = inputs.deleteCallback;
    }
  
    clickCallback: {(event: MouseEvent) : void} = (event: MouseEvent) => {
      const selectedFeature: Array<MapboxGL.MapboxGeoJSONFeature> = this._draw.getSelected()
        .features;
      const mode = this._draw.getMode();
      this._draw.changeMode('simple_select');
      const {features} = this._draw.getAll();
      if (mode === 'direct_select') {
        this._draw.changeMode('simple_select');
      } else {
        this._draw.changeMode(mode);
      }
  
      if (selectedFeature.length) {
        selectedFeature.forEach(f => {
          const featureId = f?.id;
          if (typeof featureId === 'string' || typeof featureId === 'number') {
            this._draw.delete(`${featureId}`);
          }
        });
      } else {
        this._draw.deleteAll();
      }
      //@ts-ignore
      this._deleteCallback({features});
    };
  
    onAdd(map: MapboxGL.Map): HTMLDivElement {
      this._map = map;
      this._container = document.createElement('div');
      this._button = document.createElement('button');
      this._container.appendChild(this._button);
      this._container.addEventListener('click', this.clickCallback);
      this._container.className = 'mapboxgl-ctrl-group mapboxgl-ctrl';
      this._button.className = 
        'mapbox-gl-draw_ctrl-draw-btn mapbox-gl-draw_trash';
      this._button.setAttribute('title', 'Clear map');
      return this._container;
    }
  
    onRemove() {
      this._container.removeEventListener('click', this.clickCallback);
      this._container.parentNode?.removeChild(this._container);
    }
  
    getDefaultPosition(): string {
      return 'bottom-right';
    }
  }