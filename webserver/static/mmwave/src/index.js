
import { createLinkChart} from './link_profile.js';
import LOSCheckWS from './LOSCheckWS';
import {createLinkProfile, findOverlaps, findLidarObstructions} from './LinkCalcUtils';
import {updateObstructionsData} from './LinkObstructions';
import { createOrbitAnimationPath, createLinkGeometry, calcLinkLength, generateClippingVolume} from './LinkOrbitAnimation';
import {LinkMode, OverrideSimple} from './DrawingModes.js';
import {calculateLookVector} from './HoverMoveLocation3DView';
import {getAvailabilityOverlay} from './availabilityOverlay';
// Create new mapbox Map
mapboxgl.accessToken = 'pk.eyJ1IjoiZmJtYXBzIiwiYSI6ImNqOGFmamkxdTBmbzUyd28xY3lybnEwamIifQ.oabgbuGc81ENlOJoPhv4OQ';

var map = null;
var Draw = null;
var selected_feature = null;
var link_chart = null;

var profileWS = null;
var currentLinkHash = null;

var currentView = 'map';
const center_freq_values = {
    '2.4ghz': 2.437,
    '5ghz': 5.4925,
    '60ghz': 64.790,
};
var centerFreq = center_freq_values['5ghz'];


$(document).ready(function () {
    // Add resizing callback
    const resize_window = () => {
        let height = $(window).height() - $('#bottom-row-link-view-container').height();
        height = Math.max(height, 400);
        $('#map').height(height);
        if(map != null) {
            map.resize();
        }
        $('#3d-view-container').height(height);
        $('#potree_render_area').height(height);
    }
    resize_window();
    $(window).resize( 
        resize_window
    );
    const resizeObserver = new ResizeObserver(() => {
        resize_window();
    });
    resizeObserver.observe(document.querySelector('#bottom-row-link-view-container'));
    // Initialize Bootstrap Tooltips
    $('[data-toggle="tooltip"]').tooltip({
        template : `<div class="tooltip isptoolbox-tooltip" role="tooltip">
                        <div class="arrow"> 
                        </div>
                        <div class="tooltip-inner isptoolbox-tooltip-inner">
                        </div>
                    </div>`
    });
    // Add Freq Toggle Callback
    $(".freq-dropdown-item").click(function() {
        $('#freq-dropdown').text($(this).text());
        centerFreq = center_freq_values[this.id];
        $(".freq-dropdown-item").removeClass('active');
        $(this).addClass('active');
        updateLinkChart();
    });

    const numNodesLoadingChangedCallback = (num_nodes)=> {
        if(num_nodes > 0 && currentView === '3d') {
            $('#point-cloud-loading-status').removeClass('d-none');
            $('#number-loading-nodes').text(`loading point cloud: ${num_nodes} nodes`);
        } else {
            $('#point-cloud-loading-status').addClass('d-none');
        }
    }
    Potree.numNodesLoadingValue = 0;
    Object.defineProperty(Potree, 'numNodesLoading', {
        set: function(x) { 
            numNodesLoadingChangedCallback(x);
            this.numNodesLoadingValue = x;
        },
        get: function() {
            return this.numNodesLoadingValue;
        }
    });

    link_chart = createLinkChart(link_chart, highLightPointOnGround, moveLocation3DView);
    const ws_low_res_callback = (msg_event) => {
        try {
            const response = {
                data: JSON.parse(msg_event.data)
            };
            link_chart.hideLoading();
            $("#loading_spinner").addClass('d-none');
            $("#los-chart-tooltip-button").removeClass('d-none');
            if (response.data.error !== null) {
                $("#link-request-error-description").text(response.data.error);
            }
            if (response.data.lidar_profile === null && response.data.error === "Lidar data not available") {
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
            
            updateLinkChart();
            
            link_chart.xAxis[0].update({title:{
                text: `Distance - resolution ${response.data.res}`
            }});
            $('#los-chart-tooltip-button').attr(
                "title",
                `<div class="los-chart-legend">
                    <h5>Link Profile</h5>
                        <div class='isptoolbox-bullet-line'><span class='isptoolbox-tooltip-colorbox isptoolbox-los' ></span><p class='list-item'>LOS</p></div>
                        <div class='isptoolbox-bullet-line'><span class='isptoolbox-tooltip-colorbox isptoolbox-fresnel' ></span><p class='list-item'>Fresnel</p></div>
                        <div class='isptoolbox-bullet-line'><span class='isptoolbox-tooltip-colorbox isptoolbox-lidar' ></span><p class='list-item'>LiDAR</p></div>
                        <div class='isptoolbox-bullet-line'><span class='isptoolbox-tooltip-colorbox isptoolbox-terrain'></span><p class='list-item'>Terrain</p></div>
                        <div class='isptoolbox-bullet-line'><span class='isptoolbox-tooltip-colorbox isptoolbox-obstruction'></span><p class='list-item'>LOS Obstructions</p></div>
                    <p>Data Sources:</p>
                    <p class='isptoolbox-data-source'>${response.data.datasets}</p>
                </div>`
            ).tooltip('_fixTitle');
            link_chart.redraw();
            $("#link_chart").removeClass('d-none');
        } catch(err) {
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
            mapboxgl: mapboxgl,
            placeholder: 'Search for an address'
        });
        document.getElementById('geocoder').appendChild(geocoder.onAdd(map));

        Draw = new MapboxDraw({
            userProperties: true,
            modes: Object.assign({
                draw_link: LinkMode(),
                simple_select: OverrideSimple()
            }, MapboxDraw.modes),
            displayControlsDefault: false,
            controls: {
                trash: true
            },
            styles: [
            // Standard Link Styling - unselected
            {
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
                    'line-color': '#5692D1',
                    'line-width': 5
                }
            },
            // Styling Selected Links
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
            // Halos around radios - unselected
            {
                "id": "gl-draw-polygon-and-line-vertex-halo-active",
                "type": "circle",
                "filter": ["all", ["==", "$type", "LineString"]],
                "paint": {
                    "circle-radius": 10,
                    "circle-color": "#5692D1"
                }
            },
            // Radio styling 
            {
                'id': 'selected_radio_render',
                'type': 'circle',
                'filter': [
                  'all',
                  ['==', 'meta', 'radio_point']
                ],
                'paint': {
                  'circle-radius': 7,
                  'circle-color': ['get', "color"],
                },
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
            },]
        });

        map.addControl(Draw, 'bottom-right');
        map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');


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
                'radio_label_0': 'radio_0',
                'radio_label_1': 'radio_1',
                'radio_color': '#00FF00'
            }
        });
        const prioritizeDirectSelect = function({features})
        {
            if (features.length == 1)
            {
                Draw.changeMode('direct_select', {
                    featureId: features[0].id
                });
            }
        }
        map.on('draw.selectionchange', updateRadioLocation);
        map.on('draw.selectionchange', prioritizeDirectSelect);
        map.addSource('point', {
            'type': 'geojson',
            'data': {
                'type': 'Point',
                'coordinates': [0, 0]
            }
        });

        getAvailabilityOverlay(
            (data)=>{
                map.setMaxBounds(data['bb']);
                map.addSource('lidar_availability', {
                    'type': 'geojson',
                    'data': data['overlay']
                });
                map.addLayer({
                    'id': 'lidar_availability_layer',
                    'type': 'fill',
                    'source': 'lidar_availability',
                    'paint': {
                        'fill-color': '#EE9B7C',
                        'fill-opacity': 0.9
                    }
                });
                var popup = new mapboxgl.Popup({
                    closeButton: false,
                    closeOnClick: false
                });
                     
                map.on('mouseenter', 'lidar_availability_layer', function (e) {
                    // Change the cursor style as a UI indicator.
                    map.getCanvas().style.cursor = 'pointer';
                    var description = 'LiDAR Data Not Available Here'

                     
                    // Populate the popup and set its coordinates
                    // based on the feature found.
                    popup.setLngLat(e.lngLat).setHTML(description).addTo(map);
                });

                map.on('mousemove', 'lidar_availability_layer', function (e) {
                    popup.setLngLat(e.lngLat);
                });
                     
                map.on('mouseleave', 'lidar_availability_layer', function () {
                    map.getCanvas().style.cursor = '';
                    popup.remove();
                });
            }
        );

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
                updateLinkChart(true);
            }
        );
        $('#hgt-1').change(
            () => {
                updateLinkChart(true);
            }
        );

        $('#3D-view-btn').click(()=>{
            if(currentView === 'map')
            {
                $('#3D-view-btn').addClass('btn-primary');
                $('#3D-view-btn').removeClass('btn-secondary');
                $('#map-view-btn').addClass('btn-secondary');
                $('#map-view-btn').removeClass('btn-primary');
                $('#3d-view-container').removeClass('d-none');
                $('#map').addClass('d-none');
                $('#3d-controls').removeClass('d-none');
                currentView = '3d';
            }
        });
        $('#map-view-btn').click(()=>{
            if(currentView === '3d')
            {
                $('#3D-view-btn').addClass('btn-secondary');
                $('#3D-view-btn').removeClass('btn-primary');
                $('#map-view-btn').addClass('btn-primary');
                $('#map-view-btn').removeClass('btn-secondary');
                $('#3d-view-container').addClass('d-none');
                $('#map').removeClass('d-none');
                if(map != null) {
                    map.resize();
                }
                $('#3d-controls').addClass('d-none');
                currentView = 'map';
            }
        });
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
    const integer_X = Math.round(x);
    if(_coords !== null && integer_X < _coords.length && integer_X >= 0)
    {
        const new_data = {
            'type': 'Point',
            'coordinates': [_coords[integer_X].lng, _coords[integer_X].lat]
        };
        map.getSource('point').setData(new_data);
    }
};

const moveLocation3DView = ({x, y}) => {
    // Stop Current Animation
    if(currentView === '3d') {
        if(globalLinkAnimation != null)
        {
            globalLinkAnimation.stop();
            $('#pause-button-3d').addClass('d-none');
            $('#play-button-3d').removeClass('d-none');
            animationPlaying = false;
        }
        try {
            
            const tx_h = parseFloat($('#hgt-0').val()) + _elevation[0];
            const rx_h = parseFloat($('#hgt-1').val()) + _elevation[_elevation.length - 1];
            const pos = x / _elevation.length;
            const {location, lookAt} = calculateLookVector(tx_loc_lidar, tx_h, rx_loc_lidar, rx_h, pos);
            const scene = viewer.scene;
            // Move Camera to Location
            scene.view.position.set(location[0], location[1], location[2]);
            // Point Camera at Link
            scene.view.lookAt(new THREE.Vector3(lookAt[0], lookAt[1], lookAt[2]));
        } catch(err) {
        }
    }
};

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
    $('#los-chart-tooltip-button').addClass('d-none');
    $('#loading_failed_spinner').addClass('d-none');

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
        const tx_h = parseFloat($('#hgt-0').val()) + _elevation[0];
        const rx_h = parseFloat($('#hgt-1').val()) + _elevation[_elevation.length - 1];

        if (_lidar == null) {
            link_chart.series[0].setData(_elevation);
            link_chart.series[1].setData([]);
            link_chart.yAxis[0].update({ min: Math.min(..._elevation) });
        } else {
            link_chart.series[0].setData(_elevation);
            link_chart.series[1].setData(_lidar);
            link_chart.yAxis[0].update({
                min: Math.min(...[..._lidar.map(x => x[1]), tx_h, rx_h]),
                max: Math.max(...[..._lidar.map(x => x[1]), tx_h, rx_h])
            });
        }
    }
};

/**
 * Updates link chart for LOS based on new elevation profile and tx/rx height
 */
function updateLinkChart(update3DView = false) {
    if(_elevation !== null)
    {
        const {los, fresnel} = createLinkProfile(
            _elevation,
            parseFloat($('#hgt-0').val()),
            parseFloat($('#hgt-1').val()),
            1.0,
            centerFreq
        );
        link_chart.series[2].setData(los);
        link_chart.series[3].setData(fresnel);
        if(_lidar != null)
        {
            const overlaps = findLidarObstructions(fresnel, _lidar);
            updateObstructionsData(overlaps);
            link_chart.xAxis[0].removePlotBand();
            overlaps.forEach((x) => {
                link_chart.xAxis[0].addPlotBand({
                    from: x[0],
                    to: x[1],
                    color: 'rgba(242, 62, 62, 0.2)'
                });
            })
        }
    }
    if (_elevation != null && updateLinkHeight != null && update3DView) {
        const tx_hgt = parseFloat($('#hgt-0').val()) + _elevation[0];
        const rx_hgt = parseFloat($('#hgt-1').val()) + _elevation[_elevation.length - 1];
        updateLinkHeight(tx_hgt, rx_hgt);
    }
}


var globalLinkAnimation = null;
var animationPlaying = true;
var aAbout1 = null; 
var aAbout2 = null;
var spacebarCallback = null;
const createAnimationForLink = function (tx, rx, tx_h, rx_h) {
    $('#3d-pause-play').off('click');
    if(globalLinkAnimation !== null)
    {
        window.removeEventListener('keydown', spacebarCallback);
        globalLinkAnimation.stop();
        $('#pause-button-3d').addClass('d-none');
        $('#play-button-3d').removeClass('d-none');
        animationPlaying = false;
        globalLinkAnimation = null;
    }

    if(aAbout1 == null){
        aAbout1 = new Potree.Annotation({
            position: [tx[0], tx[1], tx_h + 10],
            title: radio_names[0],
        });
        viewer.scene.annotations.add(aAbout1);
    } else {
        aAbout1.position.set(tx[0], tx[1], tx_h + 10);
    }
    if(aAbout2 == null){
        aAbout2 = new Potree.Annotation({
            position: [rx[0], rx[1], rx_h + 10],
            title: radio_names[1]
        });
        viewer.scene.annotations.add(aAbout2);
    } else {
        aAbout2.position.set(rx[0], rx[1], rx_h + 10);
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
    const animationClickCallback = () => {
        if(animationPlaying) {
            globalLinkAnimation.stop();
            $('#pause-button-3d').addClass('d-none');
            $('#play-button-3d').removeClass('d-none');
        } else {
            globalLinkAnimation.resume();
            $('#pause-button-3d').removeClass('d-none');
            $('#play-button-3d').addClass('d-none');
        }
        animationPlaying = !animationPlaying;
    };
    spacebarCallback = (event) => {
        var key = event.which || event.keyCode;
        if (key === 32 && currentView === '3d') {
          event.preventDefault();
          animationClickCallback();
        }
    };
    window.addEventListener('keydown', spacebarCallback);
    $('#3d-pause-play').click(animationClickCallback);
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

var tx_loc_lidar = null;
var rx_loc_lidar = null;

const updateLidarRender = function (name, url, bb, tx, rx, tx_h, rx_h) {
    tx_loc_lidar = tx;
    rx_loc_lidar = rx;
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
            clippingVolume.lookAt(new THREE.Vector3(tx[0], tx[1], position[2]));
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