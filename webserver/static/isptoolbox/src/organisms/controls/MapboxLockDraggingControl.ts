// (c) Meta Platforms, Inc. and affiliates. Copyright
import { getCookie } from '../../utils/Cookie';
import { getSessionID } from '../../utils/MapPreferences';

const SVG_WIDTH = '16';
const SVG_HEIGHT = '15';

const LOCK_POLYGON_TRUE_ICON = `
    <path d="M12.6883 8.73075L11.9936 8.48071L7.26678 10.1973C6.7881 10.3708 6.26371 10.3708 5.78503 10.1973L1.05278 8.48071L0.358112 8.73075C0.253177 8.76884 0.162514 8.83831 0.0984423 8.92973C0.0343712 9.02114 0 9.13007 0 9.2417C0 9.35333 0.0343712 9.46226 0.0984423 9.55367C0.162514 9.64509 0.253177 9.71456 0.358112 9.75265L6.33729 11.9269C6.45737 11.9706 6.58901 11.9706 6.70909 11.9269L12.6883 9.75265C12.7932 9.71456 12.8839 9.64509 12.9479 9.55367C13.012 9.46226 13.0464 9.35333 13.0464 9.2417C13.0464 9.13007 13.012 9.02114 12.9479 8.92973C12.8839 8.83831 12.7932 8.76884 12.6883 8.73075V8.73075Z" fill="#2D2D2D"/>
    <path d="M12.6883 5.47172L11.9936 5.22168L7.26678 6.93825C6.7881 7.11174 6.26371 7.11174 5.78503 6.93825L1.05278 5.22168L0.358112 5.47172C0.253177 5.5098 0.162514 5.57928 0.0984423 5.67069C0.0343712 5.76211 0 5.87103 0 5.98267C0 6.0943 0.0343712 6.20322 0.0984423 6.29464C0.162514 6.38606 0.253177 6.45553 0.358112 6.49361L6.33729 8.66786C6.45737 8.71156 6.58901 8.71156 6.70909 8.66786L12.6883 6.49361C12.7932 6.45553 12.8839 6.38606 12.9479 6.29464C13.012 6.20322 13.0464 6.0943 13.0464 5.98267C13.0464 5.87103 13.012 5.76211 12.9479 5.67069C12.8839 5.57928 12.7932 5.5098 12.6883 5.47172V5.47172Z" fill="#2D2D2D"/>
    <path d="M12.6883 2.20702L6.70909 0.0327768C6.58901 -0.0109256 6.45737 -0.0109256 6.33729 0.0327768L0.358112 2.20702C0.253177 2.24511 0.162514 2.31458 0.0984423 2.406C0.0343712 2.49741 0 2.60634 0 2.71797C0 2.8296 0.0343712 2.93853 0.0984423 3.02995C0.162514 3.12136 0.253177 3.19083 0.358112 3.22892L6.33729 5.40317C6.45737 5.44687 6.58901 5.44687 6.70909 5.40317L12.6883 3.22892C12.7932 3.19083 12.8839 3.12136 12.9479 3.02995C13.012 2.93853 13.0464 2.8296 13.0464 2.71797C13.0464 2.60634 13.012 2.49741 12.9479 2.406C12.8839 2.31458 12.7932 2.24511 12.6883 2.20702V2.20702Z" fill="#2D2D2D"/>
    <path d="M14.5 8.58542V8C14.5 6.06986 12.9301 4.5 11 4.5C9.06986 4.5 7.5 6.06986 7.5 8V8.58542C6.91753 8.79144 6.5 9.34716 6.5 10V13C6.5 13.8281 7.17186 14.5 8 14.5H14C14.8281 14.5 15.5 13.8281 15.5 13V10C15.5 9.34716 15.0825 8.79144 14.5 8.58542ZM10.5 8C10.5 7.72482 10.7245 7.5 11 7.5C11.2755 7.5 11.5 7.72482 11.5 8V8.5H10.5V8Z" fill="#DF4E47" stroke="white"/>
`;

const LOCK_POLYGON_FALSE_ICON = `
    <path d="M12.6883 8.73075L11.9936 8.48071L7.26678 10.1973C6.7881 10.3708 6.26371 10.3708 5.78503 10.1973L1.05278 8.48071L0.358112 8.73075C0.253177 8.76884 0.162514 8.83831 0.0984423 8.92973C0.0343712 9.02114 0 9.13007 0 9.2417C0 9.35333 0.0343712 9.46226 0.0984423 9.55367C0.162514 9.64509 0.253177 9.71456 0.358112 9.75265L6.33729 11.9269C6.45737 11.9706 6.58901 11.9706 6.70909 11.9269L12.6883 9.75265C12.7932 9.71456 12.8839 9.64509 12.9479 9.55367C13.012 9.46226 13.0464 9.35333 13.0464 9.2417C13.0464 9.13007 13.012 9.02114 12.9479 8.92973C12.8839 8.83831 12.7932 8.76884 12.6883 8.73075V8.73075Z" fill="#2D2D2D"/>
    <path d="M12.6883 5.47172L11.9936 5.22168L7.26678 6.93825C6.7881 7.11174 6.26371 7.11174 5.78503 6.93825L1.05278 5.22168L0.358112 5.47172C0.253177 5.5098 0.162514 5.57928 0.0984423 5.67069C0.0343712 5.76211 0 5.87103 0 5.98267C0 6.0943 0.0343712 6.20322 0.0984423 6.29464C0.162514 6.38606 0.253177 6.45553 0.358112 6.49361L6.33729 8.66786C6.45737 8.71156 6.58901 8.71156 6.70909 8.66786L12.6883 6.49361C12.7932 6.45553 12.8839 6.38606 12.9479 6.29464C13.012 6.20322 13.0464 6.0943 13.0464 5.98267C13.0464 5.87103 13.012 5.76211 12.9479 5.67069C12.8839 5.57928 12.7932 5.5098 12.6883 5.47172V5.47172Z" fill="#2D2D2D"/>
    <path d="M12.6883 2.20702L6.70909 0.0327768C6.58901 -0.0109256 6.45737 -0.0109256 6.33729 0.0327768L0.358112 2.20702C0.253177 2.24511 0.162514 2.31458 0.0984423 2.406C0.0343712 2.49741 0 2.60634 0 2.71797C0 2.8296 0.0343712 2.93853 0.0984423 3.02995C0.162514 3.12136 0.253177 3.19083 0.358112 3.22892L6.33729 5.40317C6.45737 5.44687 6.58901 5.44687 6.70909 5.40317L12.6883 3.22892C12.7932 3.19083 12.8839 3.12136 12.9479 3.02995C13.012 2.93853 13.0464 2.8296 13.0464 2.71797C13.0464 2.60634 13.012 2.49741 12.9479 2.406C12.8839 2.31458 12.7932 2.24511 12.6883 2.20702V2.20702Z" fill="#2D2D2D"/>
    <path d="M14.5 8.58542V8C14.5 6.06986 12.9301 4.5 11 4.5C9.06986 4.5 7.5 6.06986 7.5 8V8.58542C6.91753 8.79144 6.5 9.34716 6.5 10V13C6.5 13.8281 7.17186 14.5 8 14.5H14C14.8281 14.5 15.5 13.8281 15.5 13V10C15.5 9.34716 15.0825 8.79144 14.5 8.58542ZM10.5 8C10.5 7.72482 10.7245 7.5 11 7.5C11.2755 7.5 11.5 7.72482 11.5 8V8.5H10.5V8Z" fill="#161616" stroke="white"/>
    <path d="M0 1L2 0V2H0V1Z" fill="white" transform="translate(11.6, 6.4) scale(1.3)"/>
`;

export default class MapboxLockDraggingControl {
    private _container: HTMLDivElement;
    private _button: HTMLButtonElement;
    private _svg: Element;

    constructor(private map: mapboxgl.Map, private draw: MapboxDraw) {
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
        this._svg.setAttribute('width', SVG_WIDTH);
        this._svg.setAttribute('height', SVG_HEIGHT);
        this._svg.setAttribute('viewBox', `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`);
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

    private clickCallback: { (event: MouseEvent): void } = (event: MouseEvent) => {
        // @ts-ignore
        this.draw.options.lockDragging = !this.draw.options.lockDragging;

        const session_id = getSessionID();
        if (session_id !== null) {
            $.ajax({
                url: `/pro/workspace/api/session/${session_id}/`,
                // @ts-ignore
                data: { lock_dragging: this.draw.options.lockDragging },
                method: 'PATCH',
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
            this.draw.changeMode('simple_select', { featureIds: selected });
        }
    };

    private updateIcon() {
        // @ts-ignore
        this._svg.innerHTML = this.draw.options.lockDragging
            ? LOCK_POLYGON_TRUE_ICON
            : LOCK_POLYGON_FALSE_ICON;

        this._button.setAttribute('title', 'Lock or unlock map shapes');
    }
}
