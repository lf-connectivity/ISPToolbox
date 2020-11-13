
import { createLinkChart } from './link_profile.js';
import LOSCheckWS from './LOSCheckWS.ts';
import { createOrbitAnimationPath, createLinkGeometry, calcLinkLength } from './LinkOrbitAnimation.ts';
// Create new mapbox Map
mapboxgl.accessToken = 'pk.eyJ1IjoiZmJtYXBzIiwiYSI6ImNqOGFmamkxdTBmbzUyd28xY3lybnEwamIifQ.oabgbuGc81ENlOJoPhv4OQ';

var map = null;
var Draw = null;
var selected_feature = null;
var link_chart = null;

var profileWS = null;

$(document).ready(function () {
    link_chart = createLinkChart(link_chart, highLightPointOnGround);
    const ws_low_res_callback = (msg_event) => {
        try {
            const response = {
                data: JSON.parse(msg_event.data)
            };
            link_chart.hideLoading();
            $("#loading_spinner").addClass('d-none');
            if (response.data.error !== null) {
                $("#link-request-error-description").text(response.data.error);
                if (response.data.lidar_profile === null && response.data.error === "Lidar data not available") {
                    $('#lidar_not_found_msg').removeClass('d-none');
                }
            }
            renderNewLinkProfile(response);
            const tx_hgt = parseFloat($('#hgt-0').val()) + _elevation[0];
            const rx_hgt = parseFloat($('#hgt-1').val()) + _elevation[_elevation.length - 1];
            updateLidarRender(
                response.data.name,
                response.data.url,
                response.data.bb,
                response.data.tx,
                response.data.rx,
                tx_hgt,
                rx_hgt
            );
            createFresnelZonePlot();
            link_chart.redraw();
            $("#link_chart").removeClass('d-none');
        } catch {
            selected_feature = null;
            $('#loading_failed_spinner').removeClass('d-none');
            $("#link-request-error-description").text();
            $("#link_chart").addClass('d-none');
        }
    }
    profileWS = new LOSCheckWS(networkID, ws_low_res_callback);
    var initial_map_center = [(parseFloat($('#lng-0').val()) + parseFloat($('#lng-1').val())) / 2.0, (parseFloat($('#lat-0').val()) + parseFloat($('#lat-1').val())) / 2.0];

    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/satellite-streets-v11', // stylesheet location
        center: initial_map_center, // starting position [lng, lat]
        zoom: 17 // starting zoom
    });

    map.on('load', function () {
        // Add a modified drawing control
        const LinkMode = MapboxDraw.modes.draw_line_string;
        LinkMode.clickAnywhere = function (state, e) {
            if (state.currentVertexPosition === 1) {
                state.line.addCoordinate(state.currentVertexPosition, e.lngLat.lng, e.lngLat.lat);
                return this.changeMode('simple_select', { featureIds: [state.line.id] });
            }
            this.updateUIClasses({ mouse: 'add' });
            state.line.updateCoordinate(state.currentVertexPosition, e.lngLat.lng, e.lngLat.lat);
            if (state.direction === 'forward') {
                state.currentVertexPosition += 1; // eslint-disable-line
                state.line.updateCoordinate(state.currentVertexPosition, e.lngLat.lng, e.lngLat.lat);
            } else {
                state.line.addCoordinate(0, e.lngLat.lng, e.lngLat.lat);
            }
            return null;
        }


        var geocoder = new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            mapboxgl: mapboxgl
        });
        map.addControl(geocoder, 'top-right');

        Draw = new MapboxDraw({
            modes: Object.assign({
                draw_link: LinkMode,
            }, MapboxDraw.modes),
            displayControlsDefault: false,
            controls: {
                trash: true
            },
            styles: [{
                'id': 'gl-draw-line-inactive',
                'type': 'line',
                'filter': ['all', ['==', 'active', 'false'],
                    ['==', '$type', 'LineString'],
                    ['!=', 'mode', 'static']
                ],
                'layout': {
                    'line-cap': 'round',
                    'line-join': 'round'
                },
                'paint': {
                    'line-color': '#3bb2d0',
                    'line-width': 5
                }
            },
            {
                'id': 'gl-draw-line-active',
                'type': 'line',
                'filter': ['all', ['==', '$type', 'LineString'],
                    ['==', 'active', 'true']
                ],
                'layout': {
                    'line-cap': 'round',
                    'line-join': 'round'
                },
                'paint': {
                    'line-color': '#fbb03b',
                    'line-dasharray': [0.2, 2],
                    'line-width': 5
                }
            },
            {
                'id': 'gl-draw-point-inactive',
                'type': 'circle',
                'filter': ['all', ['==', 'active', 'false'],
                    ['==', '$type', 'Point'],
                    ['!=', 'mode', 'static']
                ],
                'paint': {
                    'circle-radius': 10,
                    'circle-color': '#3bb2d0'
                }
            },
            {
                'id': 'gl-draw-point-stroke-active',
                'type': 'circle',
                'filter': ['all', ['==', '$type', 'Point'],
                    ['==', 'active', 'true'],
                    ['!=', 'meta', 'midpoint']
                ],
                'paint': {
                    'circle-radius': 10,
                    'circle-color': '#fff'
                }
            },
            {
                'id': 'gl-draw-point-active',
                'type': 'circle',
                'filter': ['all', ['==', '$type', 'Point'],
                    ['!=', 'meta', 'midpoint'],
                    ['==', 'active', 'true']
                ],
                'paint': {
                    'circle-radius': 10,
                    'circle-color': '#fbb03b'
                }
            },]
        });

        map.addControl(Draw, 'top-right');

        const tx_lat = parseFloat($('#lat-0').val());
        const tx_lng = parseFloat($('#lng-0').val());
        const rx_lat = parseFloat($('#lat-1').val());
        const rx_lng = parseFloat($('#lng-1').val());
        Draw.add({
            "type": "LineString",
            "coordinates": [[tx_lng, tx_lat], [rx_lng, rx_lat]]
        });
        map.on('draw.update', updateRadioLocation);
        map.on('draw.create', updateRadioLocation);
        map.on('draw.selectionchange', updateRadioLocation);
        map.addSource('point', {
            'type': 'geojson',
            'data': {
                'type': 'Point',
                'coordinates': [0, 0]
            }
        });

        map.addLayer({
            'id': 'point',
            'type': 'circle',
            'source': 'point',
            'paint': {
                'circle-radius': 10,
                'circle-color': '#3887be'
            }
        });
        updateLinkProfile();
        link_chart.redraw();


        $('#add-link-btn').click(
            () => { Draw.changeMode('draw_line_string'); }
        )

        // Update Callbacks for Radio Heights
        $('#hgt-0').change(
            () => {
                createFresnelZonePlot();
                link_chart.redraw();
                if (_elevation != null && updateLinkHeight != null) {
                    const tx_hgt = parseFloat($('#hgt-0').val()) + _elevation[0];
                    const rx_hgt = parseFloat($('#hgt-1').val()) + _elevation[_elevation.length - 1];
                    updateLinkHeight(tx_hgt, rx_hgt);
                }
            }
        );
        $('#hgt-1').change(
            () => {
                createFresnelZonePlot();
                link_chart.redraw();
                if (_elevation != null && updateLinkHeight != null) {
                    const tx_hgt = parseFloat($('#hgt-0').val()) + _elevation[0];
                    const rx_hgt = parseFloat($('#hgt-1').val()) + _elevation[_elevation.length - 1];
                    updateLinkHeight(tx_hgt, rx_hgt);
                }
            }
        );

    });
});

const updateRadioLocation = (update) => {
    if (update.features.length) {
        const feat = update.features[0];
        $('#lng-0').val(feat.geometry.coordinates[0][0]);
        $('#lat-0').val(feat.geometry.coordinates[0][1]);
        $('#lng-1').val(feat.geometry.coordinates[1][0]);
        $('#lat-1').val(feat.geometry.coordinates[1][1]);
        updateLinkProfile();
    }
};

const highLightPointOnGround = ({ x, y }) => {
    const new_data = {
        'type': 'Point',
        'coordinates': [_coords[Math.round(x)].lng, _coords[Math.round(x)].lat]
    };
    map.getSource('point').setData(new_data);
}

const createFresnelZonePlot = () => {
    if (_elevation != null) {
        const tx_hgt = parseFloat($('#hgt-0').val()) + _elevation[0];
        const rx_hgt = parseFloat($('#hgt-1').val()) + _elevation[_elevation.length - 1];
        const freq = 60.0 * (10 ** 9); // GHz to Hz
        const wavelength = 299792458 / freq; // m/s
        const fresnel_zone_number = 1.0;
        const link_len = _elevation.length;
        const fresnel_zone_hgt = _elevation.map(
            (pt, idx) => {
                const los = tx_hgt - idx * ((tx_hgt - rx_hgt) / link_len);
                const fresnel = Math.sqrt(fresnel_zone_number * idx * (link_len - idx) * wavelength / (link_len));
                return los - fresnel;
            }
        );

        link_chart.series[2].setData(fresnel_zone_hgt);
    }
};

var axiosCancelToken = null;
// Overlay
const updateLinkProfile = () => {
    const tx_lat = $('#lat-0').val();
    const tx_lng = $('#lng-0').val();
    const rx_lat = $('#lat-1').val();
    const rx_lng = $('#lng-1').val();
    const query_params = { tx: [tx_lng, tx_lat], rx: [rx_lng, rx_lat], id: userRequestIdentity };

    const query = new URLSearchParams(query_params).toString();
    if (selected_feature === query) {
        return;
    } else {
        selected_feature = query;
    }
    link_chart.showLoading();
    $("#loading_spinner").removeClass('d-none');
    $('#loading_failed_spinner').addClass('d-none');
    $('#lidar_not_found_msg').addClass('d-none');

    $("#link_chart").addClass('d-none');

    // Create Callback Function for WebSocket
    // Use Websocket for request:

    profileWS.sendRequest(query_params.tx, query_params.rx, 'low', userRequestIdentity);
    profileWS.sendRequest(query_params.tx, query_params.rx, 'high', userRequestIdentity);
}

const std_building_hgt = 3.0;
const std_tree_hgt = 10.0;
var _elevation = null;
var _buildings = null;
var _trees = null;
var _coords = null;
var _lidar = null;


const renderNewLinkProfile = (response) => {
    // Check if we can update the chart
    if (link_chart != null) {
        _elevation = response.data.terrain_profile.map(pt => { return pt.elevation; });
        _coords = response.data.terrain_profile.map(
            pt => { return { lat: pt.lat, lng: pt.lng } }
        );
        _lidar = response.data.lidar_profile;

        if (_lidar == null) {
            link_chart.series[0].setData(_elevation);
            link_chart.yAxis[0].update({ min: Math.min(..._elevation) });
        } else {
            link_chart.series[0].setData(_elevation);
            link_chart.series[1].setData(_lidar);
            link_chart.yAxis[0].update({
                min: Math.min(..._lidar.map(x => x[1])),
                max: Math.max(..._lidar.map(x => x[1]))
            });
        }
    }
};

// LiDAR Functions 
const generateClippingVolume = function (bb, buffer = 10) {
    const position = [(bb[0] + bb[2]) / 2.0, (bb[1] + bb[3]) / 2.0, (bb[4] + bb[5]) / 2.0];
    const scale = [Math.abs(bb[0] - bb[2]) + buffer, Math.abs(bb[1] - bb[3]) + buffer, Math.abs(bb[4] - bb[5]) * 4.0];

    const camera_height = Math.max(scale[0], scale[1]) / (2.0 * Math.tan(Math.PI / 12)) + bb[4];
    const camera = [position[0], position[1], camera_height];

    return { position, scale, camera };
}



var globalLinkAnimation = null;
const createAnimationForLink = function (tx, rx, tx_h, rx_h) {
    if (globalLinkAnimation !== null) {
        clearInterval(globalLinkAnimation.interval);
    }
    globalLinkAnimation = new Potree.CameraAnimation(viewer);
    const { targets, positions } = createOrbitAnimationPath(tx, tx_h, rx, rx_h, 100.0, 20.0);

    for (let i = 0; i < positions.length; i++) {
        const cp = globalLinkAnimation.createControlPoint();
        cp.position.set(...positions[i]);
        cp.target.set(...targets[i]);
    }
    const link_len = calcLinkLength(tx,rx,tx_h, rx_h);
    const desired_animation_speed = 20; // meters per second 
    const min_animation_duration = 20;
    const animationDuration = Math.min([desired_animation_speed / link_len, min_animation_duration]);
    viewer.scene.addCameraAnimation(globalLinkAnimation);
    globalLinkAnimation.setDuration(animationDuration);
    globalLinkAnimation.setVisible(false);
    globalLinkAnimation.play();
    globalLinkAnimation.interval = setInterval(function () {
        globalLinkAnimation.setVisible(false);
        globalLinkAnimation.play();
    }, animationDuration * 1000);
}

var clippingVolume = null;
var linkLine = null;
var updateLinkHeight = null;
const addLink = function (tx, rx, tx_h, rx_h) {
    updateLinkHeight = function (tx_h, rx_h) {
        let scene = viewer.scene;
        // Add LOS Link Line
        if (linkLine !== null) {
            scene.scene.remove(linkLine);
        }

        linkLine = createLinkGeometry(tx, rx, tx_h, rx_h);
        scene.scene.add(linkLine);
        createAnimationForLink(tx, rx, tx_h, rx_h);
    }
    updateLinkHeight(tx_h, rx_h);
}

const updateLidarRender = function (name, url, bb, tx, rx, tx_h, rx_h) {
    const setClippingVolume = function (bb) {
        let scene = viewer.scene;
        let { position, scale, camera } = generateClippingVolume(bb);
        { // VOLUME visible
            if (clippingVolume !== null) {
                scene.removeVolume(clippingVolume);
            }
            clippingVolume = new Potree.BoxVolume();
            clippingVolume.name = "Visible Clipping Volume";
            clippingVolume.scale.set(scale[0], scale[1], scale[2]);
            clippingVolume.position.set(position[0], position[1], position[2]);
            clippingVolume.clip = true;
            scene.addVolume(clippingVolume);
            clippingVolume.visible = false;
        }
        scene.view.position.set(camera[0], camera[1], camera[2]);
        scene.view.lookAt(new THREE.Vector3(position[0], position[1], 0));
        viewer.setClipTask(Potree.ClipTask.SHOW_INSIDE);
    }

    // Check if we already added point cloud
    const existing_match_ptcloud = viewer.scene.pointclouds.find(x => { return x.name === name });
    if (existing_match_ptcloud) {
        existing_match_ptcloud.material.elevationRange = [bb[4], bb[5]];
        setClippingVolume(bb);
        addLink(tx, rx, tx_h, rx_h);
    } else {
        Potree.loadPointCloud(url, name, function (e) {
            let scene = viewer.scene;
            scene.addPointCloud(e.pointcloud);

            let material = e.pointcloud.material;
            material.size = 4;
            material.pointSizeType = Potree.PointSizeType.FIXED;
            material.shape = Potree.PointShape.CIRCLE;
            material.activeAttributeName = "elevation";
            material.elevationRange = [bb[4], bb[5]];
            setClippingVolume(bb);
            addLink(tx, rx, tx_h, rx_h);
        });
    }


}