import { getCookie } from "../../utils/Cookie";
import { getSessionID } from "../../utils/MapPreferences";

const DEFAULT_DIMENSIONS = '14';

// SVG path is a red hand with a transparent cross across it.
const LOCK_POLYGON_TRUE_ICON = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path',
);
LOCK_POLYGON_TRUE_ICON.setAttribute('fill-rule', 'evenodd');
LOCK_POLYGON_TRUE_ICON.setAttribute('clip-rule', 'evenodd');
LOCK_POLYGON_TRUE_ICON.setAttribute(
    'd',
    'M6.16244 5V1C6.16244 0 7.08206 0 7.08206 0C7.08206 0 8.00168 0 8.00168 1V5C8.00168 5 8.00168 5.5 8.46148 5.5C8.92129 5.5 8.92129 5 8.92129 5V2C8.92129 1 9.84091 1 9.84091 1C9.84091 1 10.7605 1 10.7605 2V3.12143L3.29781 12.8595C2.76918 12.1562 0.429468 9.03181 0.184936 8.5C-0.182911 7.9 0.0929741 7.3 0.460821 7C0.828667 6.8 1.4724 6.9 2.02417 7.5L3.40359 9V6L2.48398 2C2.48398 2 2.48398 1 3.40359 1C3.67948 1 4.13929 1 4.32321 2C4.37604 2.34467 4.5806 2.95333 4.79743 3.5985C4.95806 4.07645 5.12542 4.57445 5.24283 5C5.24283 5.2 5.24283 5.5 5.70263 5.5C6.16244 5.5 6.16244 5 6.16244 5ZM5.01306 13.8981C5.56458 14 6.22301 14 7.08206 14H9.84091C11.3144 14 11.7845 12.1388 12.2442 10.3187C12.3583 9.86689 12.4717 9.41763 12.5998 9C13.5194 6 13.9792 4 13.9792 4C14.0711 3.6 13.9792 3.2 13.5194 3C13.4767 2.98454 13.435 2.97174 13.3943 2.96144L11.9979 4.78362C11.8403 5.53556 11.6801 6 11.6801 6C11.66 6.06577 11.6487 6.12673 11.6384 6.18183C11.602 6.37808 11.5793 6.5 11.2203 6.5C11.0174 6.5 10.904 6.40257 10.8407 6.29373L5.01306 13.8981Z',
);
LOCK_POLYGON_TRUE_ICON.setAttribute('fill', '#F23E3E');

// SVG path is a black hand
const LOCK_POLYGON_FALSE_ICON = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path',
);
LOCK_POLYGON_FALSE_ICON.setAttribute(
    'd',
    'M6.15121 1V5C6.15121 5 6.15121 5.5 5.6914 5.5C5.2316 5.5 5.2316 5.2 5.2316 5C4.95571 4 4.40394 2.6 4.31198 2C4.12806 1 3.66825 1 3.39236 1C2.47275 1 2.47275 2 2.47275 2L3.39236 6V9L2.01294 7.5C1.46117 6.9 0.817437 6.8 0.44959 7C0.0817437 7.3 -0.194141 7.9 0.173705 8.5C0.44959 9.1 3.39236 13 3.39236 13C4.31198 14 5.2316 14 7.07083 14H9.82968C11.6689 14 11.9448 11.1 12.5885 9C13.5081 6 13.968 4 13.968 4C14.0599 3.6 13.968 3.2 13.5081 3C12.6805 2.7 12.2207 3.4 12.1287 4C11.9448 5.2 11.6689 6 11.6689 6C11.5769 6.3 11.6689 6.5 11.2091 6.5C10.7493 6.5 10.7493 6 10.7493 6V2C10.7493 1 9.82968 1 9.82968 1C9.82968 1 8.91006 1 8.91006 2V5C8.91006 5 8.91006 5.5 8.45025 5.5C7.99045 5.5 7.99045 5 7.99045 5V1C7.99045 0 7.07083 0 7.07083 0C7.07083 0 6.15121 0 6.15121 1V1Z',
);
LOCK_POLYGON_FALSE_ICON.setAttribute('fill', '#2D2D2D');

export default class MapboxLockDraggingControl {
    private _container: HTMLDivElement;
    private _button: HTMLButtonElement;
    private _svg: Element;
    private _path: Element;

    constructor(
        private map: mapboxgl.Map,
        private draw: MapboxDraw
    ) {
        this.map.getCanvas().addEventListener(
            'keydown',
            (e) => {
                if (e.key === 'l' || e.key === 'L') {
                    e.preventDefault();
                    //@ts-ignore
                    this.clickCallback({});
                }
            },
            true
        );
    }

    onAdd(map: mapboxgl.Map): HTMLDivElement {
        this.map = map;
        this._container = document.createElement('div');
        this._button = document.createElement('button');
        this._container.appendChild(this._button);
        this._container.addEventListener('click', this.clickCallback);
        this._container.className = 'mapboxgl-ctrl-group mapboxgl-ctrl';

        this._svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this._svg.setAttribute('width', DEFAULT_DIMENSIONS);
        this._svg.setAttribute('height', DEFAULT_DIMENSIONS);
        this._svg.setAttribute(
            'viewBox',
            `0 0 ${DEFAULT_DIMENSIONS} ${DEFAULT_DIMENSIONS}`,
        );
        this._svg.setAttribute('fill', 'none');

        this._button.appendChild(this._svg);

        this.updateIcon();
        return this._container;
    }

    onRemove() {
        this._container.removeEventListener('click', this.clickCallback);
        this._container.parentNode?.removeChild(this._container);
    }

    getDefaultPosition(): string {
        return 'bottom-right';
    }

    private clickCallback: { (event: MouseEvent): void } = (event: MouseEvent) =>  {
        // @ts-ignore
        this.draw.options.lockDragging = !this.draw.options.lockDragging;

        const session_id = getSessionID();
        if(session_id !== null){
            $.ajax({
                url: `/pro/workspace/api/session/${session_id}/`,
                // @ts-ignore
                data: { lock_dragging: this.draw.options.lockDragging },
                method: "PATCH",
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                }
            });
        }

        this.updateIcon();

        // This hack preserves both the selection and the tooltip in simple select mode.
        const mode = this.draw.getMode();
        const selected = this.draw.getSelectedIds();
        if (mode === 'simple_select') {
            this.draw.changeMode('simple_select', {featureIds: selected});
        }
    }

    private updateIcon() {
        if (this._path !== undefined) {
            this._svg.removeChild(this._path);
        }
        // @ts-ignore
        this._path = this.draw.options.lockDragging
            ? LOCK_POLYGON_TRUE_ICON
            : LOCK_POLYGON_FALSE_ICON;
        this._svg.appendChild(this._path);
    }
}