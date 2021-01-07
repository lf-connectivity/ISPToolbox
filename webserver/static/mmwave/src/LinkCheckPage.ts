// Create new mapbox Map
import * as MapboxGL from "mapbox-gl";

import {createLinkChart} from './link_profile.js';
import LOSCheckWS from './LOSCheckWS';
import {createLinkProfile, findOverlaps, findLidarObstructions} from './LinkCalcUtils';
import {updateObstructionsData} from './LinkObstructions';
import {createHoverPoint, createOrbitAnimationPath, createLinkGeometry, calcLinkLength, generateClippingVolume, createTrackShappedOrbitPath} from './LinkOrbitAnimation';
import {LinkMode, OverrideSimple, OverrideDirect} from './DrawingModes.js';
import {calculateLookVector} from './HoverMoveLocation3DView';
import {getAvailabilityOverlay} from './availabilityOverlay';
import MapboxCustomDeleteControl from './MapboxCustomDeleteControl';
import {LOSCheckMapboxStyles} from './LOSCheckMapboxStyles';

// @ts-ignore
const Potree = window.Potree;
// @ts-ignore
const THREE = window.THREE;

// @ts-ignore
const MapboxDraw = window.MapboxDraw;
// @ts-ignore
const MapboxGeocoder= window.MapboxGeocoder;
//@ts-ignore
const mapboxgl = window.mapboxgl;

const HOVER_POINT_SOURCE = 'hover-point-link-source';
const HOVER_POINT_LAYER = 'hover-point-link-layer';
const SELECTED_LINK_SOURCE = 'selected-link-source';
const SELECTED_LINK_LAYER = 'selected-link-layer';
const center_freq_values : {[key: string]: number} = {
    '2.4ghz': 2.437,
    '5ghz': 5.4925,
    '60ghz': 64.790,
};
const DEFAULT_LINK_FREQ = center_freq_values['5ghz'];

export class LinkCheckPage {
    map : MapboxGL.Map;
    Draw : any;
    selected_feature : any;
    link_chart : any;

    profileWS : LOSCheckWS;
    currentLinkHash : any;

    currentView: 'map' | '3d';
    _elevation : any;
    _coords : any;
    _lidar : any;
    fresnel_width: number;
    globalLinkAnimation : any;
    animationPlaying : boolean;
    aAbout1: any; 
    aAbout2: any;
    spacebarCallback: any;

    clippingVolume : any;
    linkLine : any;
    updateLinkHeight : any;

    tx_loc_lidar : any;
    rx_loc_lidar : any;

    centerFreq : number;
    userRequestIdentity : string;
    networkID : string;
    radio_names : [string, string];

    hover3dDot: any;
    currentMaterial : any;
    selectedFeatureID : string | null;

    constructor(networkID : string, userRequestIdentity: string, radio_names : [string, string]){
        this.networkID = networkID;
        this.userRequestIdentity = userRequestIdentity;
        this.radio_names = radio_names;
        this.animationPlaying = true;
        this.centerFreq  = DEFAULT_LINK_FREQ;
        this.currentView = 'map';
        this.hover3dDot = null;
        this.currentMaterial = null;
        this.fresnel_width = 1.;
        this.selectedFeatureID = null;

        // Add Resize-Window Callback
        const resize_window = () => {
            let height = $(window).height() - $('#bottom-row-link-view-container').height();
            height = Math.max(height, 400);
            $('#map').height(height);
            if(this.map != null) {
                this.map.resize();
            }
            $('#3d-view-container').height(height);
            $('#potree_render_area').height(height);
        }
        resize_window();
        $(window).resize( 
            resize_window
        );
        // @ts-ignore
        const resizeObserver = new ResizeObserver(() => {
            resize_window();
        });
        resizeObserver.observe(document.querySelector('#bottom-row-link-view-container'));
        // Initialize Bootstrap Tooltips
        // @ts-ignore
        $('[data-toggle="tooltip"]').tooltip({
            template : `<div class="tooltip isptoolbox-tooltip" role="tooltip">
                            <div class="arrow"> 
                            </div>
                            <div class="tooltip-inner isptoolbox-tooltip-inner">
                            </div>
                        </div>`
        });
        // Add Freq Toggle Callback
        $(".freq-dropdown-item").click((event)=> {
            $('#freq-dropdown').text($(event.target).text());
            this.centerFreq = center_freq_values[event.target.id];
            $(".freq-dropdown-item").removeClass('active');
            $(this).addClass('active');
            this.Draw.setFeatureProperty(this.selectedFeatureID, 'freq', this.centerFreq);
            this.updateLinkChart(true);
        });
    
        const numNodesLoadingChangedCallback = (num_nodes : number)=> {
            if(num_nodes > 0 && this.currentView === '3d') {
                $('#point-cloud-loading-status').removeClass('d-none');
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
    
        this.link_chart = createLinkChart(
            this.link_chart,
            this.highLightPointOnGround.bind(this),
            this.moveLocation3DView.bind(this),
            this.mouseLeave.bind(this)
        );
        const ws_low_res_callback = (msg_event : any) => {
            try {
                const response = {
                    data: JSON.parse(msg_event.data)
                };
                this.link_chart.hideLoading();
                $("#loading_spinner").addClass('d-none');
                $("#los-chart-tooltip-button").removeClass('d-none');
                if (response.data.error !== null) {
                    $("#link-request-error-description").text(response.data.error);
                }
                if (response.data.lidar_profile === null && response.data.error === "Lidar data not available") {
                } else {
                    $("#3D-view-btn").removeClass('d-none');
                }
    
                this.renderNewLinkProfile(response);
                const tx_hgt = parseFloat(String($('#hgt-0').val())) + this._elevation[0];
                const rx_hgt = parseFloat(String($('#hgt-1').val())) + this._elevation[this._elevation.length - 1]; 
                if(this.currentLinkHash !== response.data.hash)
                {
                    this.updateLidarRender(
                        response.data.name,
                        response.data.url,
                        response.data.bb,
                        response.data.tx,
                        response.data.rx,
                        tx_hgt,
                        rx_hgt
                    );
                    this.currentLinkHash = response.data.hash;
                } else {
                    this.currentMaterial.elevationRange = [response.data.bb[4], response.data.bb[5]];
                }
                
                this.updateLinkChart();
                
                this.link_chart.xAxis[0].update({title:{
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
                // @ts-ignore
                ).tooltip('_fixTitle');
                this.link_chart.redraw();
                $("#link_chart").removeClass('d-none');
            } catch(err) {
                this.selected_feature = null;
                $('#loading_failed_spinner').removeClass('d-none');
                $("#link-request-error-description").text();
                $("#link_chart").addClass('d-none');
            }
        }
        this.profileWS = new LOSCheckWS(this.networkID, ws_low_res_callback);
        
        let initial_map_center = {
            'lon': (parseFloat(String($('#lng-0').val())) + parseFloat(String($('#lng-1').val()))) / 2.0,
            'lat': (parseFloat(String($('#lat-0').val())) + parseFloat(String($('#lat-1').val()))) / 2.0
        };
        let initial_zoom = 17;
        try {
            // @ts-ignore
            initial_map_center = window.ISPTOOLBOX_SESSION_INFO.initialMapCenter.coordinates;
            // @ts-ignore
            initial_zoom = window.ISPTOOLBOX_SESSION_INFO.initialMapZoom;
        } catch(err){}
    
        this.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/satellite-streets-v11', // stylesheet location
            center: initial_map_center, // starting position [lng, lat]
            zoom: initial_zoom // starting zoom
        });
    
        this.map.on('load', () => {
            var geocoder = new MapboxGeocoder({
                accessToken: mapboxgl.accessToken,
                mapboxgl: mapboxgl,
                placeholder: 'Search for an address'
            });
            document.getElementById('geocoder').appendChild(geocoder.onAdd(this.map));

            const tx_lat = parseFloat(String($('#lat-0').val()));
            const tx_lng = parseFloat(String($('#lng-0').val()));
            const rx_lat = parseFloat(String($('#lat-1').val()));
            const rx_lng = parseFloat(String($('#lng-1').val()));

            // Add a modified drawing control       
            this.Draw = new MapboxDraw({
                userProperties: true,
                modes: Object.assign({
                    draw_link: LinkMode(),
                    simple_select: OverrideSimple(),
                    direct_select: OverrideDirect()
                }, MapboxDraw.modes),
                displayControlsDefault: false,
                controls: {
                },
                styles: LOSCheckMapboxStyles
            });
            
            this.map.addControl(this.Draw, 'bottom-right');
            const deleteControl = new MapboxCustomDeleteControl({
                map: this.map,
                draw: this.Draw,
                deleteCallback: (e:any)=>{},
            });
        
            this.map.addControl(deleteControl, 'bottom-right');
            this.map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

            
            this.map.on('draw.update', this.updateRadioLocation.bind(this));
            this.map.on('draw.create', this.updateRadioLocation.bind(this));
            const features = this.Draw.add({
                "type": 'Feature',
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[tx_lng, tx_lat], [rx_lng, rx_lat]]
                },
                "properties" :{
                    "meta": "radio_link",
                    'radio_label_0': 'radio_0',
                    'radio_label_1': 'radio_1',
                    'radio_color': '#00FF00',
                    'radio0hgt': parseFloat(String($('#hgt-0').val())),
                    'radio1hgt': parseFloat(String($('#hgt-1').val())),
                    'freq': DEFAULT_LINK_FREQ,
                }
            });
            this.selectedFeatureID = features.length ? features[0] : null;
            const prioritizeDirectSelect = function({features} : any)
            {
                if (features.length == 1)
                {
                    this.Draw.changeMode('direct_select', {
                        featureId: features[0].id
                    });
                }
            }
            this.map.on('draw.selectionchange', this.updateRadioLocation.bind(this));
            this.map.on('draw.selectionchange', prioritizeDirectSelect.bind(this));
            this.map.on('draw.selectionchange', this.mouseLeave.bind(this));


            window.addEventListener('keydown', (event) => {
                const featureCollection = this.Draw.getSelected();
                if (event.target === this.map.getCanvas() && (event.key === "Backspace" || event.key === "Delete"))
                {
                    featureCollection.features.forEach((feat : any) => {this.Draw.delete(feat.id)})
                }
            });

            getAvailabilityOverlay(
                (data)=>{
                    this.map.setMaxBounds(data['bb']);
                    this.map.addSource('lidar_availability', {
                        'type': 'geojson',
                        'data': data['overlay']
                    });
                    this.map.addLayer({
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
                         
                    this.map.on('mouseenter', 'lidar_availability_layer', (e: any) => {
                        // Change the cursor style as a UI indicator.
                        this.map.getCanvas().style.cursor = 'pointer';
                        var description = 'LiDAR Data Not Available Here'
    
                         
                        // Populate the popup and set its coordinates
                        // based on the feature found.
                        popup.setLngLat(e.lngLat).setHTML(description).addTo(this.map);
                    });
    
                    this.map.on('mousemove', 'lidar_availability_layer', (e : any) => {
                        popup.setLngLat(e.lngLat);
                    });
                         
                    this.map.on('mouseleave', 'lidar_availability_layer', (e : any)=> {
                        this.map.getCanvas().style.cursor = '';
                        popup.remove();
                    });
                }
            );
            // Add Data Sources to Help User Understand Map
            this.map.addSource(SELECTED_LINK_SOURCE, {
                'type': 'geojson',
                'data': {
                    'type': 'FeatureCollection',
                    'features': [
                        {
                            'type' : 'Feature',
                            'properties' : {},
                            'geometry': {
                                "type": "LineString",
                                "coordinates": [[tx_lng, tx_lat], [rx_lng, rx_lat]]
                            },
                        }
                    ]
                }
            });
            // Selected Link Layer
            this.map.addLayer({
                'id': SELECTED_LINK_LAYER,
                'type': 'line',
                'source': SELECTED_LINK_SOURCE,
                'paint': {
                    'line-color': '#FFFFFF',
                    'line-width': 7,
                }
            }, this.Draw.options.styles[0].id);
            this.map.addSource(HOVER_POINT_SOURCE, {
                'type': 'geojson',
                'data': {
                    'type': 'FeatureCollection',
                    'features': [
                        {
                            'type' : 'Feature',
                            'properties' : {},
                            'geometry': {'type': 'Point',
                            'coordinates': [0, 0]}
                        }
                    ]
                }
            });
    
            // HOVER POINT MAP LAYERS
            this.map.addLayer({
                'id': `${HOVER_POINT_LAYER}_halo`,
                'type': 'circle',
                'source': HOVER_POINT_SOURCE,
                'paint': {
                    'circle-radius': 7,
                    'circle-color': '#FFFFFF'
                }
            }, this.Draw.options.styles[this.Draw.options.styles.length - 1].id);
            
            this.map.addLayer({
                'id': HOVER_POINT_LAYER,
                'type': 'circle',
                'source': HOVER_POINT_SOURCE,
                'paint': {
                    'circle-radius': 5,
                    'circle-color': '#3887be'
                }
            }, this.Draw.options.styles[this.Draw.options.styles.length - 1].id);

            
            this.updateLinkProfile();
            this.link_chart.redraw();
    
    
            $('#add-link-btn').click(
                () => { this.Draw.changeMode('draw_line_string'); }
            )
    
            // Update Callbacks for Radio Heights
            $('#hgt-0').change(
                () => {
                    this.updateLinkChart(true);
                    if(this.selectedFeatureID != null){
                        this.Draw.setFeatureProperty(this.selectedFeatureID, 'radio0hgt', parseFloat(String($('#hgt-0').val())))
                    }
                }
            );
            $('#hgt-1').change(
                () => {
                    this.updateLinkChart(true);
                    if(this.selectedFeatureID != null){
                        this.Draw.setFeatureProperty(this.selectedFeatureID, 'radio1hgt', parseFloat(String($('#hgt-1').val())))
                    }
                }
            );
            const createRadioCoordinateChangeCallback = (id: string, coord1: number, coord2: number) => {
                $(id).change(
                    () => {
                        if(this.selectedFeatureID != null)
                        {
                            const feat = this.Draw.get(this.selectedFeatureID);
                            feat.geometry.coordinates[coord1][coord2] = parseFloat(String($(id).val()))
                            this.Draw.add(feat);
                            const selected_link_source = this.map.getSource(SELECTED_LINK_SOURCE);
                            if(selected_link_source.type === 'geojson'){
                                selected_link_source.setData(feat.geometry);
                            }
                            this.updateLinkProfile();
                        }
                    }
                );
            }
            createRadioCoordinateChangeCallback('#lng-0', 0, 0);
            createRadioCoordinateChangeCallback('#lat-0', 0, 1);
            createRadioCoordinateChangeCallback('#lng-1', 1, 0);
            createRadioCoordinateChangeCallback('#lat-1', 1, 1);
        
    
            $('#3D-view-btn').click(()=>{
                if(this.currentView === 'map')
                {
                    $('#3D-view-btn').addClass('btn-primary');
                    $('#3D-view-btn').removeClass('btn-secondary');
                    $('#map-view-btn').addClass('btn-secondary');
                    $('#map-view-btn').removeClass('btn-primary');
                    $('#3d-view-container').removeClass('d-none');
                    $('#map').addClass('d-none');
                    $('#3d-controls').removeClass('d-none');
                    this.currentView = '3d';
                }
            });
            $('#map-view-btn').click(()=>{
                if(this.currentView === '3d')
                {
                    $('#3D-view-btn').addClass('btn-secondary');
                    $('#3D-view-btn').removeClass('btn-primary');
                    $('#map-view-btn').addClass('btn-primary');
                    $('#map-view-btn').removeClass('btn-secondary');
                    $('#3d-view-container').addClass('d-none');
                    $('#map').removeClass('d-none');
                    if(this.map != null) {
                        this.map.resize();
                    }
                    $('#3d-controls').addClass('d-none');
                    this.currentView = 'map';
                }
            });
        });
    };
    updateRadioLocation(update : any) {
        if (update.features.length) {
            const feat = update.features[0];
            this.selectedFeatureID = feat.id;
            if(feat.properties.freq == undefined)
            {
                this.Draw.setFeatureProperty(this.selectedFeatureID, 'freq', DEFAULT_LINK_FREQ);
            }
            const current_freq = Object.entries(center_freq_values).filter((v)=> v[1] === feat.properties.freq);
            if (current_freq.length !== 0)
            {
                $('#freq-dropdown').text(current_freq[0][0]);
            }
            $('#lng-0').val(feat.geometry.coordinates[0][0].toFixed(5));
            $('#lat-0').val(feat.geometry.coordinates[0][1].toFixed(5));
            $('#lng-1').val(feat.geometry.coordinates[1][0].toFixed(5));
            $('#lat-1').val(feat.geometry.coordinates[1][1].toFixed(5));
            if(feat.properties.radio0hgt == undefined)
            {
                this.Draw.setFeatureProperty(this.selectedFeatureID, 'radio0hgt', 20);
            }
            $('#hgt-0').val(feat.properties.radio0hgt);
            if(feat.properties.radio1hgt == undefined)
            {
                this.Draw.setFeatureProperty(this.selectedFeatureID, 'radio1hgt', 10);
            }
            $('#hgt-1').val(feat.properties.radio1hgt);
            const selected_link_source = this.map.getSource(SELECTED_LINK_SOURCE);
            if(selected_link_source.type === 'geojson'){
                selected_link_source.setData(feat.geometry);
            }
            this.updateLinkProfile();
        }
    };
    
    highLightPointOnGround({ x, y} : {x:number, y: number}) {
        const integer_X = Math.round(x);
        if(this._coords !== null && integer_X < this._coords.length && integer_X >= 0)
        {
            const new_data = {
                'type': 'Point',
                'coordinates': [this._coords[integer_X].lng, this._coords[integer_X].lat]
            };
            const source = this.map.getSource(HOVER_POINT_SOURCE);
            if(source.type === 'geojson')
            {
                // @ts-ignore
                source.setData(new_data);
            }
        }
    };
    
    moveLocation3DView({ x, y} : {x:number, y: number}){
        try {
            const tx_h = parseFloat(String($('#hgt-0').val())) + this._elevation[0];
            const rx_h = parseFloat(String($('#hgt-1').val())) + this._elevation[this._elevation.length - 1];
            const pos = x / this._elevation.length;
            const {location, lookAt} = calculateLookVector(this.tx_loc_lidar, tx_h, this.rx_loc_lidar, rx_h, pos);
            // Stop Current Animation
            if(this.currentView === '3d') {
                if(this.globalLinkAnimation != null) {
                    this.globalLinkAnimation.pause();
                    $('#pause-button-3d').addClass('d-none');
                    $('#play-button-3d').removeClass('d-none');
                    this.animationPlaying = false;
                }
                // @ts-ignore
                const scene = window.viewer.scene;
                // Move Camera to Location
                scene.view.position.set(location[0], location[1], location[2]);
                // Point Camera at Link
                //@ts-ignore
                scene.view.lookAt(new window.THREE.Vector3(lookAt[0], lookAt[1], lookAt[2]));   
            }
            // @ts-ignore
            let scene = window.viewer.scene;
            // Add LOS Link Line
            if (this.hover3dDot !== null) {
                scene.scene.remove(this.hover3dDot);
            }
    
            this.hover3dDot = createHoverPoint(lookAt);
            scene.scene.add(this.hover3dDot);
        } catch(err) {
        }
    };
    
    // Overlay
    updateLinkProfile() {
        const tx_lat = parseFloat(String($('#lat-0').val()));
        const tx_lng = parseFloat(String($('#lng-0').val()));
        const rx_lat = parseFloat(String($('#lat-1').val()));
        const rx_lng = parseFloat(String($('#lng-1').val()));
        const query_params : {
            tx: [number, number],
            rx: [number, number],
            id: string
        } = { tx: [tx_lng, tx_lat], rx: [rx_lng, rx_lat], id: this.userRequestIdentity };
    
        // @ts-ignore
        const query = new URLSearchParams(query_params).toString();
        if (this.selected_feature === query) {
            return;
        } else {
            this.selected_feature = query;
        }
        this.link_chart.showLoading();
        $("#loading_spinner").removeClass('d-none');
        $('#los-chart-tooltip-button').addClass('d-none');
        $('#loading_failed_spinner').addClass('d-none');
    
        $("#link_chart").addClass('d-none');
    
        // Create Callback Function for WebSocket
        // Use Websocket for request:
        $("#3D-view-btn").addClass('d-none');
        this.profileWS.sendRequest(query_params.tx, query_params.rx, this.userRequestIdentity);
    }

    mouseLeave() {
        const source = this.map.getSource(HOVER_POINT_SOURCE);
        if(source.type === 'geojson')
        {
            // @ts-ignore
            source.setData({'type': "FeatureCollection", "features":[]});
        }
        // @ts-ignore
        let scene = window.viewer.scene;
        // Add LOS Link Line
        if (this.hover3dDot !== null) {
            scene.scene.remove(this.hover3dDot);
        }
        this.hover3dDot = null;
    }
    
    renderNewLinkProfile(response : any){
        // Check if we can update the chart
        if (this.link_chart != null) {
            this._elevation = response.data.terrain_profile.map((pt: any) => { return pt.elevation; });
            this._coords = response.data.terrain_profile.map(
                (pt : any) => { return { lat: pt.lat, lng: pt.lng } }
            );
            this._lidar = response.data.lidar_profile;
            const tx_h = parseFloat(String($('#hgt-0').val())) + this._elevation[0];
            const rx_h = parseFloat(String($('#hgt-1').val())) + this._elevation[this._elevation.length - 1];
    
            if (this._lidar == null) {
                this.link_chart.series[0].setData(this._elevation);
                this.link_chart.series[1].setData([]);
                this.link_chart.yAxis[0].update({ min: Math.min(...this._elevation) });
            } else {
                this.link_chart.series[0].setData(this._elevation);
                this.link_chart.series[1].setData(this._lidar);
                this.link_chart.yAxis[0].update({
                    min: Math.min(...[...this._lidar.map((x : any) => x[1]), tx_h, rx_h]),
                    max: Math.max(...[...this._lidar.map((x : any) => x[1]), tx_h, rx_h])
                });
            }
        }
    };
    
    /**
     * Updates link chart for LOS based on new elevation profile and tx/rx height
     */
    updateLinkChart(update3DView = false){
        if(this._elevation !== null) {
            const {los, fresnel} = createLinkProfile(
                this._elevation,
                parseFloat(String($('#hgt-0').val())),
                parseFloat(String($('#hgt-1').val())),
                1.0,
                this.centerFreq
            );
            this.link_chart.series[2].setData(los);
            this.link_chart.series[3].setData(fresnel);
            this.fresnel_width = Math.max(...fresnel.map((x)=>x[2] - x[1]));
            if(this._lidar != null)
            {
                const overlaps = findLidarObstructions(fresnel, this._lidar);
                updateObstructionsData(overlaps);
                this.link_chart.xAxis[0].removePlotBand();
                overlaps.forEach((x) => {
                    this.link_chart.xAxis[0].addPlotBand({
                        from: x[0],
                        to: x[1],
                        color: 'rgba(242, 62, 62, 0.2)'
                    });
                })
            }
        }
        if (this._elevation != null && this.updateLinkHeight != null && update3DView) {
            const tx_hgt = parseFloat(String($('#hgt-0').val())) + this._elevation[0];
            const rx_hgt = parseFloat(String($('#hgt-1').val())) + this._elevation[this._elevation.length - 1];
            this.updateLinkHeight(tx_hgt, rx_hgt, !update3DView);
            if( this._lidar != null){
                this.link_chart.yAxis[0].update({
                    min: Math.min(...[...this._lidar.map((x : any) => x[1]), tx_hgt, rx_hgt]),
                    max: Math.max(...[...this._lidar.map((x : any) => x[1]), tx_hgt, rx_hgt])
                });
            }
        }
    }
    
    createAnimationForLink(tx : any, rx : any, tx_h : any, rx_h : any, start_animation : boolean) {
        $('#3d-pause-play').off('click');
        if(this.globalLinkAnimation != null) {
            window.removeEventListener('keydown', this.spacebarCallback);
            this.globalLinkAnimation.pause();
            $('#pause-button-3d').addClass('d-none');
            $('#play-button-3d').removeClass('d-none');
            this.animationPlaying = false;
            this.globalLinkAnimation = null;
        }
    
        if(this.aAbout1 == null){
            this.aAbout1 = new Potree.Annotation({
                position: [tx[0], tx[1], tx_h + 10],
                title: this.radio_names[0],
            });
            // @ts-ignore
            window.viewer.scene.annotations.add(this.aAbout1);
        } else {
            this.aAbout1.position.set(tx[0], tx[1], tx_h + 10);
        }
        if(this.aAbout2 == null){
            this.aAbout2 = new Potree.Annotation({
                position: [rx[0], rx[1], rx_h + 10],
                title: this.radio_names[1]
            });
            // @ts-ignore
            window.viewer.scene.annotations.add(this.aAbout2);
        } else {
            this.aAbout2.position.set(rx[0], rx[1], rx_h + 10);
        }
    
        // @ts-ignore
        this.globalLinkAnimation = new Potree.CameraAnimation(window.viewer);
        const { targets, positions } = createTrackShappedOrbitPath(tx, tx_h, rx, rx_h, 50.0, 50.0);
    
        for (let i = 0; i < positions.length; i++) {
            const cp = this.globalLinkAnimation.createControlPoint();
            cp.position.set(...positions[i]);
            cp.target.set(...targets[i]);
        }
        const link_len = calcLinkLength(tx,rx,tx_h, rx_h);
        const desired_animation_speed = 50; // meters per second 
        const min_animation_duration = 20;
        const max_animation_duration = 60;
        const animationDuration = Math.min(max_animation_duration, Math.max((link_len * 2 / desired_animation_speed), min_animation_duration));
        // @ts-ignore
        window.viewer.scene.addCameraAnimation(this.globalLinkAnimation);
        this.globalLinkAnimation.setDuration(animationDuration);
        this.globalLinkAnimation.setVisible(false);
        if(start_animation) {
            this.animationPlaying = true;
            this.globalLinkAnimation.play(true);
        } else {
            this.animationPlaying = false;
        }
        const animationClickCallback = () => {
            if(this.animationPlaying) {
                this.globalLinkAnimation.pause();
                $('#pause-button-3d').addClass('d-none');
                $('#play-button-3d').removeClass('d-none');
            } else {
                this.globalLinkAnimation.play(true);
                $('#pause-button-3d').removeClass('d-none');
                $('#play-button-3d').addClass('d-none');
            }
            this.animationPlaying = !this.animationPlaying;
        };
        this.spacebarCallback = (event : any) => {
            var key = event.which || event.keyCode;
            if (key === 32 && this.currentView === '3d') {
              event.preventDefault();
              animationClickCallback();
            }
        };
        window.addEventListener('keydown', this.spacebarCallback);
        $('#3d-pause-play').click(animationClickCallback);
    }
    
    
    addLink(tx :any, rx:any, tx_h:any, rx_h:any){
        this.updateLinkHeight = (tx_h :any, rx_h:any, start_animation : boolean = false) => {
            // @ts-ignore
            let scene = window.viewer.scene;
            // Add LOS Link Line
            if (this.linkLine !== null) {
                scene.scene.remove(this.linkLine);
            }
    
            this.linkLine = createLinkGeometry(tx, rx, tx_h, rx_h, this.fresnel_width);
            scene.scene.add(this.linkLine);
            this.createAnimationForLink(tx, rx, tx_h, rx_h, start_animation);
        }
        this.updateLinkHeight(tx_h, rx_h, true);
    }
    
    
    
    updateLidarRender(name : any, url : any, bb : any, tx : any, rx : any, tx_h : any, rx_h : any) {
        this.tx_loc_lidar = tx;
        this.rx_loc_lidar = rx;
        const setClippingVolume = (bb : any) => {
            // @ts-ignore
            let scene = window.viewer.scene;
            let { position, scale, camera } = generateClippingVolume(bb);
            { // VOLUME visible
                if (this.clippingVolume !== null) {
                    scene.removeVolume(this.clippingVolume);
                }
                this.clippingVolume = new Potree.BoxVolume();
                this.clippingVolume.name = "Visible Clipping Volume";
                this.clippingVolume.scale.set(scale[0], scale[1], scale[2]);
                this.clippingVolume.position.set(position[0], position[1], position[2]);
                this.clippingVolume.lookAt(new THREE.Vector3(tx[0], tx[1], position[2]));
                this.clippingVolume.clip = true;
                scene.addVolume(this.clippingVolume);
                this.clippingVolume.visible = false;
            }
            scene.view.position.set(camera[0], camera[1], camera[2]);
            scene.view.lookAt(new THREE.Vector3(position[0], position[1], 0));
            // @ts-ignore
            window.viewer.setClipTask(Potree.ClipTask.SHOW_INSIDE);
        }
    
        // Check if we already added point cloud
        // @ts-ignore
        const existing_match_ptcloud = window.viewer.scene.pointclouds.find(
            (x: any) => { return x.name === name }
        );
        if (existing_match_ptcloud) {
            existing_match_ptcloud.material.elevationRange = [bb[4], bb[5]];
            setClippingVolume(bb);
            this.addLink(tx, rx, tx_h, rx_h);
        } else {
            Potree.loadPointCloud(url, name, (e: any) => {
                // @ts-ignore
                let scene = window.viewer.scene;
                scene.addPointCloud(e.pointcloud);
    
                this.currentMaterial = e.pointcloud.material;
                this.currentMaterial.size = 4;
                this.currentMaterial.pointSizeType = Potree.PointSizeType.FIXED;
                this.currentMaterial.shape = Potree.PointShape.CIRCLE;
                this.currentMaterial.activeAttributeName = "elevation";
                this.currentMaterial.elevationRange = [bb[4], bb[5]];
                setClippingVolume(bb);
                this.addLink(tx, rx, tx_h, rx_h);
            });
        }
    }
}