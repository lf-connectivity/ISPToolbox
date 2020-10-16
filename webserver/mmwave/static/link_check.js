// Create new mapbox Map

mapboxgl.accessToken = 'pk.eyJ1IjoiZmJtYXBzIiwiYSI6ImNqOGFmamkxdTBmbzUyd28xY3lybnEwamIifQ.oabgbuGc81ENlOJoPhv4OQ';

var map = null;
var Draw = null;
var selected_feature = null;

$(document).ready( function () {
    var initial_map_center = [(parseFloat($('#lng-0').val()) + parseFloat($('#lng-1').val())) / 2.0, (parseFloat($('#lat-0').val()) +  parseFloat($('#lat-1').val())) / 2.0];
    
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/satellite-streets-v11', // stylesheet location
        center: initial_map_center, // starting position [lng, lat]
        zoom: 17 // starting zoom
    });

    map.on('load', function() {
        // Add a modified drawing control
        const LinkMode = MapboxDraw.modes.draw_line_string;
        LinkMode.clickAnywhere = function(state, e) {
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
            "coordinates": [[tx_lng, tx_lat], [rx_lng,rx_lat]]
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
            () => {Draw.changeMode('draw_line_string');}
        )

        // Update Callbacks for Radio Heights
        $('#hgt-0').change(
            ()=> {
                createFresnelZonePlot();
                link_chart.redraw();
            }
        );
        $('#hgt-1').change(
            ()=> {
                createFresnelZonePlot();
                link_chart.redraw();
            }
        );

    });
});

const updateRadioLocation = (update) => {
    if(update.features.length) 
    {
        const feat = update.features[0];
        $('#lng-0').val(feat.geometry.coordinates[0][0]);
        $('#lat-0').val(feat.geometry.coordinates[0][1]);
        $('#lng-1').val(feat.geometry.coordinates[1][0]);
        $('#lat-1').val(feat.geometry.coordinates[1][1]);
        updateLinkProfile();
    }
};

const highLightPointOnGround = ({x, y}) =>
{
    const new_data = {
        'type': 'Point',
        'coordinates': [_coords[Math.round(x)].lng, _coords[Math.round(x)].lat]
    };
    map.getSource('point').setData(new_data);
}

const createFresnelZonePlot = () => {
    if(_elevation != null)
    {
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

var linkProfileRequestInProgress = null;
// Overlay
const updateLinkProfile = () => 
{
    
    const tx_lat = $('#lat-0').val();
    const tx_lng = $('#lng-0').val();
    const rx_lat = $('#lat-1').val();
    const rx_lng = $('#lng-1').val();
    const query_params = {tx: [tx_lng, tx_lat], rx: [rx_lng, rx_lat]};
    
    const query = new URLSearchParams(query_params).toString();
    if (selected_feature === query)
    {
        return;
    } else {
        selected_feature = query;
    }
    link_chart.showLoading();
    $("#loading_spinner").removeClass('d-none');
    $('#loading_failed_spinner').addClass('d-none');
    $('#lidar_not_found_msg').addClass('d-none');

    $("#link_chart").addClass('d-none');
    if(linkProfileRequestInProgress !== null ) {
        linkProfileRequestInProgress.cancel();
    }
    
    linkProfileRequestInProgress = axios.get('/mmwave/link-check/gis/?' + query)
    .then(function (response) {
        if(response.data.error !== null)
        {
            $("#link-request-error-description").text(response.data.error);
            if(response.data.lidar_profile === null && response.data.error === "Lidar data not available")
            {
                $('#lidar_not_found_msg').removeClass('d-none');
            }
        }
        renderNewLinkProfile(response);
        createFresnelZonePlot();
        link_chart.redraw();
        $("#link_chart").removeClass('d-none');
      })
      .catch(function (error) {
        // handle error
        console.log(error);
        selected_feature = null;
        $('#loading_failed_spinner').removeClass('d-none');
        $("#link-request-error-description").text();
        $("#link_chart").addClass('d-none');
      })
      .then(function () {
        // always executed
        link_chart.hideLoading();
        $("#loading_spinner").addClass('d-none');
        linkProfileRequestInProgress = null;
    });
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
    if (link_chart != null)
    {
        _elevation = response.data.terrain_profile.map(pt => {return pt.elevation;});
        _coords = response.data.terrain_profile.map(
            pt => {return {lat: pt.lat, lng: pt.lng}}
        );
        _lidar = response.data.lidar_profile;

        if(_lidar == null)
        {
            link_chart.series[0].setData(_elevation);
            link_chart.yAxis[0].update({min: Math.min(..._elevation)});
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

$(document).ready(
    function() {
        $('#refresh-link-btn').click(
            updateLinkProfile
        );
    }
);