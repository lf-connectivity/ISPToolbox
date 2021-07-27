import mapboxgl from 'mapbox-gl';
import { MultiplayerConnection } from './MultiplayerConnection';
import { MultiplayerEvents } from './MultiplayerEvents';
import PubSub from 'pubsub-js';
import MapboxDrawMultiplayer from './MapboxDrawMultiplayer';
var _ = require('lodash');

const MULTIPLAYER_CONTROL_CLASS = 'multiplayer-usr-bubble-control';
const MULTIPLAYER_BUBBLE_CONTAINER_CLASS = 'multiplayer-usr-bubble-container';
const MULTIPLAYER_BUBBLE_CLASS = 'multiplayer-usr-bubble';
const USER_BUBBLE_COLORS = [
    '#ab34a4',
    '#79dbbd',
    '#b4975b',
    '#f2872e',
    '#0f2c9a',
    '#3aa65c',
    '#970eef',
    '#9e762a',
    '#70f69f',
    '#ee5614'
];
const MULTIPLAYER_USER_SOURCE = 'multiplayer-usr-source-data';
const MULTIPLAYER_USER_LAYER = 'multiplayer-user-layer';

export class MapboxMultiplayerControl {
    _map: mapboxgl.Map;
    _container: HTMLElement | null;
    _controlContainer: HTMLElement | null;
    _users: Map<string, { name: string }> = new Map();
    _userlocations: Map<string, { location: mapboxgl.LngLatLike; name: string }>;
    _source: mapboxgl.AnySourceImpl;

    _drawmultiplayer: MapboxDrawMultiplayer;
    constructor(private draw: MapboxDraw, private connection: MultiplayerConnection) {
        this._userlocations = new Map();

        this.initializeDrawListeners();
        PubSub.subscribe(
            MultiplayerEvents.INITIALIZE_USERS,
            this.initializeUsersCallback.bind(this)
        );
        PubSub.subscribe('userjoin', this.userJoinCallback.bind(this));
        PubSub.subscribe('userleave', this.userLeaveCallback.bind(this));
    }

    /**
     * onAdd and onRemove are required as part of Mapbox Control's interface
     */
    onAdd(map: mapboxgl.Map) {
        this._map = map;
        if (!this._container) this._container = this._map.getContainer();
        this._controlContainer = document.createElement('div');
        // this._controlContainer.setAttribute("class", `mapboxgl-ctrl mapboxgl-ctrl-group`);
        this._setupUI();

        this.initializeMapListeners();
        this._drawmultiplayer = new MapboxDrawMultiplayer(this._map, this.draw, this.connection, {
            type: 'FeatureCollection',
            features: []
        });
        return this._controlContainer;
    }
    onRemove() {
        this._controlContainer?.remove();
        // @ts-ignore
        this._map = null;
    }

    /**
     * Render Methods - Visualization
     */
    _setupUI() {
        this.render();
    }
    render() {
        if (this._controlContainer) {
            this._controlContainer.innerHTML = '';
            const user_elem = document.createElement('div');
            user_elem.setAttribute('class', MULTIPLAYER_CONTROL_CLASS);
            this._users.forEach((user, uid) => {
                const user_circle_container = document.createElement('div');
                user_circle_container.setAttribute('class', MULTIPLAYER_BUBBLE_CONTAINER_CLASS);
                const user_circle = document.createElement('span');
                user_circle.setAttribute('class', MULTIPLAYER_BUBBLE_CLASS);
                user_circle.innerText = user.name[0];
                const color = USER_BUBBLE_COLORS[parseInt(uid) % USER_BUBBLE_COLORS.length];
                user_circle.setAttribute('style', `background-color: ${color}`);
                user_circle_container.appendChild(user_circle);
                user_elem.appendChild(user_circle_container);
            });
            this._controlContainer?.appendChild(user_elem);
        }
    }
    initOverlay() {
        let img = new Image(30, 30);
        img.onload = () => this._map.addImage('user-cursor-simple', img);
        img.src = '/static/workspace/player_cursor.svg';
        this._map.addSource(MULTIPLAYER_USER_SOURCE, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });
        this._map.addLayer({
            id: MULTIPLAYER_USER_LAYER,
            type: 'symbol',
            source: MULTIPLAYER_USER_SOURCE,
            layout: {
                'icon-image': 'user-cursor-simple',
                'text-field': [
                    'case',
                    ['boolean', ['all', ['has', 'name']], true],
                    ['format', ['to-string', ['get', 'name']], {}],
                    ''
                ],
                'icon-offset': [5, 5],
                'text-anchor': 'top',
                'text-font': ['Roboto Mono Bold', 'Arial Unicode MS Regular'],
                'text-size': 14,
                'text-offset': [2, 1]
            },
            paint: {
                'icon-opacity-transition': {
                    duration: 0,
                    delay: 0
                },
                'icon-translate-transition': {
                    delay: 0,
                    duration: 0
                },
                'text-color': 'white',
                'text-halo-color': ['get', 'color'],
                'text-halo-width': 20
            }
        });
        this._source = this._map.getSource(MULTIPLAYER_USER_SOURCE);
    }
    updateOverlay() {
        if (this._source.type === 'geojson') {
            const features: Array<mapboxgl.MapboxGeoJSONFeature> = [];
            this._userlocations.forEach((user, uid) => {
                const user_metadata = this._users.get(uid);
                features.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        //@ts-ignore
                        coordinates: user.location
                    },
                    properties: {
                        name: user_metadata?.name,
                        color: USER_BUBBLE_COLORS[parseInt(uid) % USER_BUBBLE_COLORS.length]
                    }
                });
            });
            this._source.setData({ type: 'FeatureCollection', features });
        }
    }

    /**
     * Various Callbacks
     */
    initializeUsersCallback(msg: string, data: any) {
        data.users.forEach((user: any) => {
            this._users.set(user.id, { name: user.name });
        });
        this.render();
    }

    userJoinCallback(msg: string, data: any) {
        this._users.set(data.uid, { name: data.name });
        this.render();
    }

    userLeaveCallback(msg: string, data: any) {
        this._users.delete(data.uid);
        this.render();
    }

    initializeMapListeners() {
        this.initOverlay();
        this._map.on('mousemove', this.moveEventCallback.bind(this));
        PubSub.subscribe(MultiplayerEvents.USER_MOVEMOUSE, this.userMoveMouseCallback.bind(this));
    }

    initializeDrawListeners() {}

    moveEventCallback(event: mapboxgl.MapMouseEvent) {
        this.connection.send({
            type: MultiplayerEvents.USER_MOVEMOUSE,
            location: [event.lngLat.lng, event.lngLat.lat]
        });
    }

    userMoveMouseCallback(msg: string, data: any) {
        this._userlocations.set(data.uid, {
            location: data.location,
            name: data.name
        });
        requestAnimationFrame(this.updateOverlay.bind(this));
    }
}
