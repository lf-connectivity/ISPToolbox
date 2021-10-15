import MapboxDraw from '@mapbox/mapbox-gl-draw';
import mapboxgl from 'mapbox-gl';
import { Potree } from '../Potree.js';
import {
    calcLinkLength,
    createCircularOrbitPath,
    createHoverPoint,
    createLinkGeometry,
    createTrackShappedOrbitPath,
    generateClippingVolume,
    generateClippingVolumePoint
} from '../LinkOrbitAnimation';
import { getRadioHeightFromUI } from '../LinkCheckUtils';

// @ts-ignore
const THREE = window.THREE;

import { IMapboxDrawPlugin } from '../utils/MapboxDrawPlugin';
import { hasCookie } from '../utils/Cookie';
import { calculateMaximumFresnelRadius } from '../LinkCalcUtils';
import { LinkCheckPage } from '../LinkCheckPage';
import { calculateLookVector } from '../HoverMoveLocation3DView';
import { MapLayerSidebarManager } from '../workspace/MapLayerSidebarManager';

let potree = (window as any).Potree as null | typeof Potree;
if (!(window as any).webgl2support) {
    potree = null;
}

export type MetadataPotreeVizPointResponse = {
    type: 'Point';
    uuid: string;
    center: GeoJSON.Point;
    clouds: Array<{ name: string; url: string }>;
    dtm: number;
    height: number;
    bb: [number, number, number, number, number, number];
    name: string;
};

export type MetadataPotreeVizLineResponse = {
    type: 'LineString';
    uuid: string;
    clouds: Array<{ name: string; url: string }>;
    dtms: [number, number];
    heights: [number, number];
    bb: [number, number, number, number];
    names: [string, string];
    tx: GeoJSON.Point;
    rx: GeoJSON.Point;
};

export type MetadataPotreeVizResponse =
    | MetadataPotreeVizLineResponse
    | MetadataPotreeVizPointResponse;

export class LiDAR3DView extends IMapboxDrawPlugin {
    clippingVolume: any = null;
    globalLinkAnimation: any;
    currentView: 'map' | '3d' = 'map';
    hover3dDot: any = null;
    currentMaterial: any;
    last_selection: number | string | undefined = '';

    spacebarCallback: any;
    updateLinkHeight: any;

    tx_loc_lidar: [number, number] | null = null;
    rx_loc_lidar: [number, number] | null = null;

    // variables for handling offsets for hover point volume
    oldCamera: any = null;
    oldTarget: any;

    aAbout1: any;
    aAbout2: any;

    linkLine: any;

    constructor(
        private map: mapboxgl.Map,
        private draw: MapboxDraw,
        private app: LinkCheckPage,
        private radio_names: [string, string]
    ) {
        super(map, draw);
        if (potree) {
            const numNodesLoadingChangedCallback = (num_nodes: number) => {
                if (num_nodes > 0 && this.currentView === '3d') {
                    $('#point-cloud-loading-status').removeClass('d-none');
                } else {
                    $('#point-cloud-loading-status').addClass('d-none');
                }
            };
            potree.numNodesLoadingValue = 0;
            Object.defineProperty(potree, 'numNodesLoading', {
                set: function (x) {
                    numNodesLoadingChangedCallback(x);
                    this.numNodesLoadingValue = x;
                },
                get: function () {
                    return this.numNodesLoadingValue;
                }
            });
        }

        $('#3D-view-btn').click(() => {
            // TODO Cleanup achong: - hide maplayers cleanly
            MapLayerSidebarManager.getInstance().hide();
            if (this.currentView === 'map') {
                $('#3D-view-btn').addClass('btn-primary').removeClass('btn-secondary');
                $('#map-view-btn').addClass('btn-secondary').removeClass('btn-primary');
                $('#3d-view-container, #3d-controls').removeClass('d-none');
                $('#map, #map-controls').addClass('d-none');
                this.currentView = '3d';

                if (!this.animationPlaying) {
                    this.app.highlightCurrentPosition(true);
                }
                // If they haven't seen the tooltip yet, expand it by default for 30 seconds
                if (!hasCookie('losHelpSeen')) {
                    // Set cookie so tooltip is closed next time they visit
                    const now = new Date();
                    const exp = now.getTime() + 365 * 24 * 60 * 60 * 1000;
                    now.setTime(exp);
                    document.cookie =
                        'losHelpSeen=true; Expires=' +
                        now.toUTCString() +
                        '; SameSite=None; Secure; path=/;';
                    // Set the tooltip copy to visible, hide after 10s
                    $('.help-3D-copy').css({ opacity: '1', visibility: 'visible' });
                    setTimeout(() => {
                        $('.help-3D-copy').css({ opacity: '0', visibility: 'hidden' });
                    }, 10000);
                }
            }
        });
        $('#map-view-btn').click(() => {
            if (this.currentView === '3d') {
                $('#3D-view-btn').addClass('btn-secondary').removeClass('btn-primary');
                $('#map-view-btn').addClass('btn-primary').removeClass('btn-secondary');
                $('#3d-view-container, #3d-controls').addClass('d-none');
                $('#map, #map-controls').removeClass('d-none');
                if (this.map != null) {
                    this.map.resize();
                }
                this.currentView = 'map';
                this.app.highlightCurrentPosition(false);
            }
        });
    }

    updateAnimationTitles() {
        // Update animation titles if they exist
        const name1 =
            this.radio_names[0].length > 15
                ? this.radio_names[0].substr(0, 15) + '...'
                : this.radio_names[0];
        const name2 =
            this.radio_names[1].length > 15
                ? this.radio_names[1].substr(0, 15) + '...'
                : this.radio_names[1];
        if (this.aAbout1) {
            this.aAbout1.title = name1;
        }
        if (this.aAbout2) {
            this.aAbout2.title = name2;
        }
    }

    drawSelectionChangeCallback(event: { features: Array<GeoJSON.Feature> }) {
        // Mapbox will count dragging a point features as a selection change event
        // Use this to determine if we are dragging or just selected a new feature
        let dragging = false;
        if (event.features.length === 1) {
            if (event.features[0].id === this.last_selection) {
                dragging = true;
            } else {
                this.last_selection = event.features[0].id;
            }
        } else {
            this.last_selection = '';
        }
        if (event.features.length === 1) {
            const feat = event.features[0];
            if (
                (feat.geometry.type === 'Point' && !dragging) ||
                feat.geometry.type === 'LineString'
            ) {
                this.highlightFeature(feat);
            }
        }
    }

    drawUpdateCallback(event: {
        features: Array<GeoJSON.Feature>;
        action: 'move' | 'change_coordinates';
    }) {
        if (event.features.length === 1) {
            const feat = event.features[0];
            if (feat.geometry.type === 'Point' || feat.geometry.type === 'LineString') {
                this.highlightFeature(feat);
            }
        }
    }

    highlightFeature(feat: GeoJSON.Feature) {
        // Load the meta data for feature
        const uuid = feat.properties?.uuid;
        if (typeof uuid === 'string') {
            $.get(`/pro/workspace/api/visualization/${uuid}/`)
                .done((resp) => {
                    const selected = this.draw.getSelected();
                    // Verify that the feature we selected is still the one we want to render
                    if (
                        selected.features.length === 1 &&
                        selected.features[0].properties?.uuid === resp.uuid
                    ) {
                        this.renderResponsePotree(resp);
                        this.hideMetadataError();
                    }
                })
                .fail((error) => {
                    // Server failed to return metadata - communicate to the user
                    this.renderMetadataError(error);
                });
        }
    }

    renderResponsePotree(resp: MetadataPotreeVizResponse) {
        if (resp.type === 'Point') {
            this.showRadio(resp);
        } else if (resp.type === 'LineString') {
            const name = resp.names;
            const urls = resp.clouds.map((cld) => cld.url);
            const tx_hgt = resp.dtms[0] + resp.heights[0];
            const rx_hgt = resp.dtms[1] + resp.heights[1];
            const bb_z_max = Math.max(tx_hgt, rx_hgt);
            const bb_z_min = Math.min(...resp.dtms);
            this.updateLidarRender(
                name,
                urls,
                resp.bb.concat([bb_z_min, bb_z_max]),
                resp.tx.coordinates.concat([tx_hgt]),
                resp.rx.coordinates.concat([rx_hgt])
            );
        }
    }

    showRadio(resp: MetadataPotreeVizPointResponse) {
        // Set up orbit
        if (potree) {
            // Add all point clouds
            // @ts-ignore
            let scene = window.viewer.scene;

            const elevation_range = [resp.dtm, resp.height + resp.dtm];
            scene.pointclouds.forEach((cld: any) => {
                cld.material.elevationRange = elevation_range;
            });
            resp.clouds.forEach((value: { name: string; url: string }, idx: number) => {
                //@ts-ignore
                const existing_pc_names: Array<string> = scene.pointclouds.map((cld) => {
                    return cld.name;
                });
                if (!existing_pc_names.includes(value.name) && potree) {
                    potree.loadPointCloud(value.url, value.name, (e: any) => {
                        // @ts-ignore
                        scene.addPointCloud(e.pointcloud);

                        this.currentMaterial = e.pointcloud.material;
                        this.currentMaterial.size = 4;
                        if (potree) {
                            this.currentMaterial.pointSizeType = potree.PointSizeType.FIXED;
                            this.currentMaterial.shape = potree.PointShape.CIRCLE;
                        }
                        this.currentMaterial.activeAttributeName = 'elevation';
                        this.currentMaterial.elevationRange = elevation_range;
                    });
                }
            });

            // Set Clipping Volume
            this.setClippingVolume(resp.bb, resp.center.coordinates as [number, number], false);
            this.addRadio(resp.center, resp.height, resp.dtm, resp.name);
        }
    }

    renderMetadataError(error: any) {
        $('#potree_meta_missing').removeClass('d-none');
        $('#potree_render_area').addClass('d-none');
    }

    hideMetadataError() {
        $('#potree_meta_missing').addClass('d-none');
        $('#potree_render_area').removeClass('d-none');
    }

    animationPlaying() {
        if (this.globalLinkAnimation && this.globalLinkAnimation.playing) {
            return true;
        }
        return false;
    }

    createAnimationForRadio(center: GeoJSON.Point, height: number, dtm: number) {
        if (potree) {
            //@ts-ignore
            const scene = window.viewer.scene;
            $('#3d-pause-play').off('click');
            if (this.globalLinkAnimation) {
                scene.removeCameraAnimation(this.globalLinkAnimation);
                window.removeEventListener('keydown', this.spacebarCallback);
                this.globalLinkAnimation.stop();
                this.globalLinkAnimation = null;
            }
            this.globalLinkAnimation = new potree.CameraAnimation((window as any).viewer);
            const { targets, positions } = createCircularOrbitPath(center, height + dtm, 50);

            for (let i = 0; i < positions.length; i++) {
                const cp = this.globalLinkAnimation.createControlPoint();
                cp.position.set(...positions[i]);
                cp.target.set(...targets[i]);
            }
            this.globalLinkAnimation.setDuration(10);
            this.globalLinkAnimation.setVisible(true);
            this.globalLinkAnimation.setInterpolateControlPoints(true);
            scene.addCameraAnimation(this.globalLinkAnimation);
            this.globalLinkAnimation.play(true);

            const animationClickCallback = () => {
                if (this.animationPlaying()) {
                    this.globalLinkAnimation.pause();
                    this.setPlayPauseButton(true);
                } else {
                    this.globalLinkAnimation.play(true);
                    this.setPlayPauseButton(false);
                }
            };

            this.spacebarCallback = (event: any) => {
                var key = event.which || event.keyCode;
                if (key === 32 && this.currentView === '3d') {
                    event.preventDefault();
                    animationClickCallback();
                }
            };

            window.addEventListener('keydown', this.spacebarCallback);

            $('#3d-pause-play').on('click', animationClickCallback);
        }
    }

    createAnimationForLink(tx: any, rx: any, tx_h: any, rx_h: any, start_animation: boolean) {
        if (potree) {
            // @ts-ignore
            const scene = window.viewer.scene;
            $('#3d-pause-play').off('click');
            if (this.globalLinkAnimation != null) {
                scene.removeCameraAnimation(this.globalLinkAnimation);
                window.removeEventListener('keydown', this.spacebarCallback);
                this.globalLinkAnimation.pause();
                this.setPlayPauseButton(true);
                this.globalLinkAnimation = null;
            }
            this.updateAnnotations(
                [tx[0], tx[1], tx_h + 10],
                this.radio_names[0],
                [rx[0], rx[1], rx_h + 10],
                this.radio_names[1]
            );

            this.globalLinkAnimation = new potree.CameraAnimation((window as any).viewer);
            this.setPlayPauseButton(false);

            const { targets, positions } = createTrackShappedOrbitPath(
                tx,
                tx_h,
                rx,
                rx_h,
                50.0,
                50.0
            );

            for (let i = 0; i < positions.length; i++) {
                const cp = this.globalLinkAnimation.createControlPoint();
                cp.position.set(...positions[i]);
                cp.target.set(...targets[i]);
            }
            const link_len = calcLinkLength(tx, rx, tx_h, rx_h);
            const desired_animation_speed = 50; // meters per second
            const min_animation_duration = 20;
            const animationDuration = Math.max(
                (link_len * 2) / desired_animation_speed,
                min_animation_duration
            );
            // @ts-ignore
            scene.addCameraAnimation(this.globalLinkAnimation);
            this.globalLinkAnimation.setDuration(animationDuration);
            this.globalLinkAnimation.setVisible(false);
            this.globalLinkAnimation.setInterpolateControlPoints(true);
            if (start_animation) {
                this.globalLinkAnimation.play(true);
                this.setPlayPauseButton(false);
            } else {
            }

            let animationClickCallback = () => {
                if (this.animationPlaying()) {
                    this.globalLinkAnimation.pause();
                    this.setPlayPauseButton(true);
                } else {
                    this.globalLinkAnimation.play(true);
                    this.app.highlightCurrentPosition(false);
                    this.hideHover3DDot();
                    this.setPlayPauseButton(false);
                }
            };

            this.spacebarCallback = (event: any) => {
                var key = event.which || event.keyCode;
                if (key === 32 && this.currentView === '3d') {
                    event.preventDefault();
                    animationClickCallback();
                }
            };

            window.addEventListener('keydown', this.spacebarCallback);

            $('#3d-pause-play').on('click', animationClickCallback);
        }
    }

    setPlayPauseButton(pause: boolean) {
        if (pause) {
            $('#pause-button-3d').addClass('d-none');
            $('#play-button-3d').removeClass('d-none');
        } else {
            $('#pause-button-3d').removeClass('d-none');
            $('#play-button-3d').addClass('d-none');
        }
    }

    hideHover3DDot() {
        // @ts-ignore
        let scene = window.viewer.scene;
        // Add LOS Link Line
        if (this.hover3dDot !== null) {
            scene.scene.remove(this.hover3dDot);
        }
        this.hover3dDot = null;
    }

    setClippingVolume = (bb: Array<number>, tx: [number, number], link: boolean = true) => {
        if (potree) {
            // @ts-ignore
            let scene = window.viewer.scene;

            let { position, scale, camera } = link
                ? generateClippingVolume(bb)
                : generateClippingVolumePoint(bb);

            {
                // VOLUME visible
                if (this.clippingVolume !== null) {
                    scene.removeVolume(this.clippingVolume);
                }
                this.clippingVolume = new potree.BoxVolume();
                this.clippingVolume.name = 'Visible Clipping Volume';
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
            window.viewer.setClipTask(potree.ClipTask.SHOW_INSIDE);
        }
    };

    moveLocation3DView(
        { x, y }: { x: number; y: number } = { x: this.app.linkProfileHoverPosition, y: 0 }
    ) {
        if (this.app._elevation.length > 1) {
            try {
                if (this.currentView === '3d' && this.tx_loc_lidar && this.rx_loc_lidar) {
                    // @ts-ignore
                    const scene = window.viewer.scene;

                    const tx_h = getRadioHeightFromUI('0') + this.app._elevation[0];
                    const rx_h =
                        getRadioHeightFromUI('1') +
                        this.app._elevation[this.app._elevation.length - 1];
                    const pos = Math.max(Math.min(x / this.app._elevation.length, 1), 0);
                    let { location, lookAt } = calculateLookVector(
                        this.tx_loc_lidar,
                        tx_h,
                        this.rx_loc_lidar,
                        rx_h,
                        pos
                    );

                    // Floating points might happen
                    this.app.linkProfileHoverPosition = Math.floor(x);
                    this.app.highlightCurrentPosition(true);
                    if (this.globalLinkAnimation != null) {
                        if (this.globalLinkAnimation.playing) {
                            this.globalLinkAnimation.pause();
                            this.setPlayPauseButton(true);
                        } else {
                            // Get the offset from lookat as the next camera location
                            const pivot = scene.view.getPivot();
                            const camera = scene.view.position;
                            const offset = camera.clone().sub(pivot);
                            location = [
                                lookAt[0] + offset.x,
                                lookAt[1] + offset.y,
                                lookAt[2] + offset.z
                            ];
                        }

                        // Set Resume Location
                        const LINK_ORBIT_MULTIPLIER = 3 / 8;
                        const modified_t = pos * LINK_ORBIT_MULTIPLIER;
                        this.globalLinkAnimation.setResumeTime(modified_t);
                    }

                    // Move Camera to Location
                    scene.view.position.set(location[0], location[1], location[2]);
                    // Point Camera at Link plus target offset
                    //@ts-ignore
                    scene.view.lookAt(new THREE.Vector3(lookAt[0], lookAt[1], lookAt[2]));

                    // Add LOS Link Line
                    if (this.hover3dDot !== null) {
                        scene.scene.remove(this.hover3dDot);
                    }

                    if (this.tx_loc_lidar) {
                        this.hover3dDot = createHoverPoint(
                            lookAt,
                            [this.tx_loc_lidar[0], this.tx_loc_lidar[1], tx_h],
                            this.app.isOverlapping()
                        );
                    }

                    scene.scene.add(this.hover3dDot);
                }
            } catch (err) {}
        }
    }

    updateLidarRender(
        name: Array<string>,
        urls: Array<string>,
        bb: Array<number>,
        tx: any,
        rx: any
    ) {
        this.tx_loc_lidar = tx;
        this.rx_loc_lidar = rx;
        // @ts-ignore
        let scene = window.viewer.scene;

        // Check if we already added point cloud
        urls.forEach((url: string, idx: number) => {
            //@ts-ignore
            const existing_pc_names: Array<string> = scene.pointclouds.map((cld) => {
                return cld.name;
            });
            scene.pointclouds.forEach((cld: any) => {
                cld.material.elevationRange = [bb[4], bb[5]];
            });
            if (!existing_pc_names.includes(name[idx])) {
                if (potree) {
                    potree.loadPointCloud(url, name[idx], (e: any) => {
                        scene.addPointCloud(e.pointcloud);

                        this.currentMaterial = e.pointcloud.material;
                        this.currentMaterial.size = 4;
                        if (potree) {
                            this.currentMaterial.pointSizeType = potree.PointSizeType.FIXED;
                            this.currentMaterial.shape = potree.PointShape.CIRCLE;
                        }
                        this.currentMaterial.activeAttributeName = 'elevation';
                        this.currentMaterial.elevationRange = [bb[4], bb[5]];
                    });
                }
            }
        });
        this.setClippingVolume(bb, tx);
        this.updateLink();
    }

    updateLink() {
        if (this.app._elevation.length > 1) {
            const tx_h = this.app.getRadioHeightFromUI('0') + this.app._elevation[0];
            const rx_h =
                this.app.getRadioHeightFromUI('1') +
                this.app._elevation[this.app._elevation.length - 1];
            if (this.tx_loc_lidar && this.rx_loc_lidar)
                this.addLink(this.tx_loc_lidar, this.rx_loc_lidar, tx_h, rx_h);
        }
    }

    updateAnnotations(
        coordinates1: [number, number, number],
        name1: string,
        coordinates2: [number, number, number] | undefined,
        name2: string | undefined
    ) {
        if (potree) {
            // @ts-ignore
            let scene = window.viewer.scene;
            if (this.aAbout1) {
                this.aAbout1.position.set(...coordinates1);
                this.aAbout1.title = name1.substr(0, 15);
            } else {
                this.aAbout1 = new potree.Annotation({
                    position: coordinates1,
                    title: name1.substr(0, 15)
                });
                scene.annotations.add(this.aAbout1);
            }
            if (name2 !== undefined && coordinates2) {
                if (this.aAbout2) {
                    this.aAbout2.position.set(...coordinates2);
                    this.aAbout2.title = name2.substr(0, 15);
                } else {
                    this.aAbout2 = new potree.Annotation({
                        position: coordinates2,
                        title: name2.substr(0, 15)
                    });
                    scene.annotations.add(this.aAbout2);
                }
            } else {
                scene.annotations.remove(this.aAbout2);
                this.aAbout2 = null;
            }
        }
    }

    addLink(tx: [number, number], rx: [number, number], tx_h: number, rx_h: number) {
        this.updateLinkHeight = (tx_h: number, rx_h: number, start_animation: boolean = false) => {
            // @ts-ignore
            let scene = window.viewer.scene;
            this.removeLink();
            // Add LOS Link Line

            const fresnel_width_m = calculateMaximumFresnelRadius(
                this.app._link_distance,
                this.app.centerFreq
            );
            this.linkLine = createLinkGeometry(tx, rx, tx_h, rx_h, fresnel_width_m);
            scene.scene.add(this.linkLine);
            this.createAnimationForLink(tx, rx, tx_h, rx_h, start_animation);
        };
        this.updateLinkHeight(tx_h, rx_h, true);
    }

    removeLink() {
        if (this.linkLine !== null) {
            // @ts-ignore
            let scene = window.viewer.scene;
            scene.scene.remove(this.linkLine);
            this.linkLine = null;
        }
    }

    addRadio(radio: GeoJSON.Point, height: number, dtm: number, name: string) {
        this.removeLink();
        this.updateAnnotations(
            [radio.coordinates[0], radio.coordinates[1], height + dtm],
            name,
            undefined,
            undefined
        );
        this.createAnimationForRadio(radio, height, dtm);
    }
}
