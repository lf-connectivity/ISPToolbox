
import { createLinkChart } from './link_profile.js';
import LOSCheckWS from './LOSCheckWS';
import {createLinkProfile} from './LinkCalcUtils';
import { createOrbitAnimationPath, createLinkGeometry, calcLinkLength } from './LinkOrbitAnimation';
import {LinkMode} from './DrawingModes.js';
// Create new mapbox Map
mapboxgl.accessToken = 'pk.eyJ1IjoiZmJtYXBzIiwiYSI6ImNqOGFmamkxdTBmbzUyd28xY3lybnEwamIifQ.oabgbuGc81ENlOJoPhv4OQ';

var map = null;
var Draw = null;
var selected_feature = null;
var link_chart = null;

var profileWS = null;
var currentLinkHash = null;

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
            }
            if (response.data.lidar_profile === null && response.data.error === "Lidar data not available") {
                $('#lidar_not_found_msg').removeClass('d-none');
            } else {
                $("#3D-view-btn").removeClass('d-none');
            }

            renderNewLinkProfile(response);
            const tx_hgt = parseFloat($('#hgt-0').val()) + _elevation[0];
            const rx_hgt = parseFloat($('#hgt-1').val()) + _elevation[_elevation.length - 1]; 
            if(currentLinkHash !== response.data.hash)
            {
                updateLidarRender(
                    response.data.name,
                    response.data.url,
                    response.data.bb,
                    response.data.tx,
                    response.data.rx,
                    tx_hgt,
                    rx_hgt
                );
                currentLinkHash = response.data.hash;
            }
            
            if(_elevation !== null)
            {
                const link_profile_data = createLinkProfile(
                    _elevation,
                    parseFloat($('#hgt-0').val()),
                    parseFloat($('#hgt-1').val()),
                );
                link_chart.series[2].setData(link_profile_data);
            }
            
            link_chart.xAxis[0].update({title:{
                text: `Distance : Resolution ${response.data.res}<br/>Source: ${response.data.datasets}`
            }});
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

        var geocoder = new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            mapboxgl: mapboxgl
        });
        map.addControl(geocoder, 'top-right');

        Draw = new MapboxDraw({
            modes: Object.assign({
                draw_link: LinkMode(),
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
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');


        const tx_lat = parseFloat($('#lat-0').val());
        const tx_lng = parseFloat($('#lng-0').val());
        const rx_lat = parseFloat($('#lat-1').val());
        const rx_lng = parseFloat($('#lng-1').val());
        
        map.on('draw.update', updateRadioLocation);
        map.on('draw.create', updateRadioLocation);
        Draw.add({
            "type": 'Feature',
            "geometry": {
                "type": "LineString",
                "coordinates": [[tx_lng, tx_lat], [rx_lng, rx_lat]]
            },
            "properties" :{
                "meta": "radio_link",
                'radio_label_0':'radio_0',
                'radio_label_1': 'radio_1'
            }
        });
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
                if(_elevation !== null)
                {
                    const link_profile_data = createLinkProfile(_elevation, parseFloat($('#hgt-0').val()), parseFloat($('#hgt-1').val()))
                    link_chart.series[2].setData(link_profile_data);
                }
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
                if(_elevation !== null)
                {
                    const link_profile_data = createLinkProfile(_elevation, parseFloat($('#hgt-0').val()), parseFloat($('#hgt-1').val()))
                    link_chart.series[2].setData(link_profile_data);
                }
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
    $("#3D-view-btn").addClass('d-none');
    profileWS.sendRequest(query_params.tx, query_params.rx, userRequestIdentity);
}


var _elevation = null;
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
var aAbout1 = null; 
var aAbout2 = null;
const createAnimationForLink = function (tx, rx, tx_h, rx_h) {
    $('#3d-pause').off('click');
    $('#3d-play').off('click');
    if(globalLinkAnimation !== null)
    {
        globalLinkAnimation.stop();
        globalLinkAnimation = null;
    }

    if(aAbout1 == null){
        aAbout1 = new Potree.Annotation({
            position: [tx[0], tx[1], tx_h + 5],
            title: 'Radio 0',
        });
        viewer.scene.annotations.add(aAbout1);
    } else {
        aAbout1.position.set(tx[0], tx[1], tx_h + 5);
    }
    if(aAbout2 == null){
        aAbout2 = new Potree.Annotation({
            position: [rx[0], rx[1], rx_h + 5],
            title: 'Radio 1',
        });
        viewer.scene.annotations.add(aAbout2);
    } else {
        aAbout2.position.set(rx[0], rx[1], rx_h + 5);
    }


    globalLinkAnimation = new Potree.CameraAnimation(viewer);
    const { targets, positions } = createOrbitAnimationPath(tx, tx_h, rx, rx_h, 100.0, 20.0);

    for (let i = 0; i < positions.length; i++) {
        const cp = globalLinkAnimation.createControlPoint();
        cp.position.set(...positions[i]);
        cp.target.set(...targets[i]);
    }
    const link_len = calcLinkLength(tx,rx,tx_h, rx_h);
    const desired_animation_speed = 50; // meters per second 
    const min_animation_duration = 20;
    const max_animation_duration = 60;
    const animationDuration = Math.min(max_animation_duration, Math.max((link_len * 2 / desired_animation_speed), min_animation_duration));
    viewer.scene.addCameraAnimation(globalLinkAnimation);
    globalLinkAnimation.setDuration(animationDuration);
    globalLinkAnimation.setVisible(false);
    globalLinkAnimation.play(true);
    $('#3d-pause').click(()=>{globalLinkAnimation.stop();});
    $('#3d-play').click(()=>{globalLinkAnimation.resume();});
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