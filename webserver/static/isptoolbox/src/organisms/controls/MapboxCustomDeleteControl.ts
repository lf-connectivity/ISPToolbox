import * as MapboxGL from 'mapbox-gl';

export default class MapboxCustomDeleteControl {
    _container: HTMLDivElement;
    _button: HTMLButtonElement;

    constructor(
        private map: MapboxGL.Map,
        private draw: MapboxDraw,
        private confirmation: boolean = false
    ) {
        // Listen for Backspace or Delete on the Map Canvas Element
        this.map.getCanvas().addEventListener(
            'keydown',
            (e) => {
                if (e.key === 'Backspace' || e.key === 'Delete') {
                    e.preventDefault();
                    //@ts-ignore
                    this.clickCallback({});
                }
            },
            true
        );
    }

    clickCallback: { (event: MouseEvent): void } = (event: MouseEvent) => {
        const selectedFeatures = this.draw.getSelected().features;
        const mode = this.draw.getMode();
        this.draw.changeMode('simple_select');
        const { features } = this.draw.getAll();
        if (mode === 'direct_select') {
            this.draw.changeMode('simple_select');
        } else {
            //@ts-ignore
            this.draw.changeMode(mode);
        }

        if (selectedFeatures.length) {
            const confirmDeleteCallback = () => {
                const ids = selectedFeatures.map((f) => f.id).filter((f) => f !== undefined);
                //@ts-ignore
                this.draw.delete(ids);
                this.map.fire('draw.delete', { features: selectedFeatures });
            };
            if (this.confirmation) {
                // @ts-ignore
                $('#selDelModal').modal('show');
                $('#sel-delete-confirm-btn').one('click', confirmDeleteCallback);
            } else {
                confirmDeleteCallback();
            }
        } else {
            const confirmDeleteCallback = () => {
                this.draw.deleteAll();
                this.map.fire('draw.delete', { features: features });
            };
            if (this.confirmation) {
                // @ts-ignore
                $('#everyDelModal').modal('show');
                $('#everything-delete-confirm-btn').one('click', confirmDeleteCallback);
            } else {
                confirmDeleteCallback();
            }
        }
    };

    onAdd(map: MapboxGL.Map): HTMLDivElement {
        this.map = map;
        this._container = document.createElement('div');
        this._button = document.createElement('button');
        this._container.appendChild(this._button);
        this._container.addEventListener('click', this.clickCallback);
        this._container.className = 'mapboxgl-ctrl-group mapboxgl-ctrl';
        this._button.className = 'mapbox-gl-draw_ctrl-draw-btn mapbox-gl-draw_trash';
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
