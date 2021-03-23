// export class LiDAR3DView {
//     constructor(){}

//     updateLidarRender(name: Array<string>, urls: Array<string>, bb: Array<number>, tx: any, rx: any, tx_h: any, rx_h: any) {
//         this.tx_loc_lidar = tx;
//         this.rx_loc_lidar = rx;
//         const setClippingVolume = (bb: Array<number>) => {
//             if (potree) {
//                 // @ts-ignore
//                 let scene = window.viewer.scene;
//                 let { position, scale, camera } = generateClippingVolume(bb);
//                 { // VOLUME visible
//                     if (this.clippingVolume !== null) {
//                         scene.removeVolume(this.clippingVolume);
//                     }
//                     this.clippingVolume = new potree.BoxVolume();
//                     this.clippingVolume.name = "Visible Clipping Volume";
//                     this.clippingVolume.scale.set(scale[0], scale[1], scale[2]);
//                     this.clippingVolume.position.set(position[0], position[1], position[2]);
//                     this.clippingVolume.lookAt(new THREE.Vector3(tx[0], tx[1], position[2]));
//                     this.clippingVolume.clip = true;
//                     scene.addVolume(this.clippingVolume);
//                     this.clippingVolume.visible = false;

//                 }
//                 scene.view.position.set(camera[0], camera[1], camera[2]);
//                 scene.view.lookAt(new THREE.Vector3(position[0], position[1], 0));
//                 // @ts-ignore
//                 window.viewer.setClipTask(potree.ClipTask.SHOW_INSIDE);
//             }
//         }
//         // Check if we already added point cloud
//         urls.forEach((url: string, idx: number) => {
//             //@ts-ignore
//             const existing_pc_names: Array<string> = window.viewer.scene.pointclouds.map((cld) => { return cld.name });
//             if (!existing_pc_names.includes(name[idx]) && potree) {
//                 potree.loadPointCloud(url, name[idx], (e: any) => {
//                     // @ts-ignore
//                     let scene = window.viewer.scene;
//                     scene.addPointCloud(e.pointcloud);

//                     this.currentMaterial = e.pointcloud.material;
//                     this.currentMaterial.size = 4;
//                     if (potree) {
//                         this.currentMaterial.pointSizeType = potree.PointSizeType.FIXED;
//                         this.currentMaterial.shape = potree.PointShape.CIRCLE;
//                     }
//                     this.currentMaterial.activeAttributeName = "elevation";
//                     this.currentMaterial.elevationRange = [bb[4], bb[5]];
//                 });
//             }
//         });
//         setClippingVolume(bb);
//         this.addLink(tx, rx, tx_h, rx_h);
//     }

//     createAnimationForLink(tx: any, rx: any, tx_h: any, rx_h: any, start_animation: boolean) {
//         $('#3d-pause-play').off('click');
//         if (this.globalLinkAnimation != null) {
//             window.removeEventListener('keydown', this.spacebarCallback);
//             this.globalLinkAnimation.pause();
//             $('#pause-button-3d').addClass('d-none');
//             $('#play-button-3d').removeClass('d-none');
//             this.animationPlaying = false;
//             this.globalLinkAnimation = null;
//         }
//         if (potree) {
//             if (this.aAbout1 == null) {
//                 this.aAbout1 = new potree.Annotation({
//                     position: [tx[0], tx[1], tx_h + 10],
//                     title: this.radio_names[0],
//                 });
//                 // @ts-ignore
//                 window.viewer.scene.annotations.add(this.aAbout1);
//             } else {
//                 this.aAbout1.position.set(tx[0], tx[1], tx_h + 10);
//             }
//             if (this.aAbout2 == null) {
//                 this.aAbout2 = new potree.Annotation({
//                     position: [rx[0], rx[1], rx_h + 10],
//                     title: this.radio_names[1]
//                 });
//                 // @ts-ignore
//                 window.viewer.scene.annotations.add(this.aAbout2);
//             } else {
//                 this.aAbout2.position.set(rx[0], rx[1], rx_h + 10);
//             }

//             this.globalLinkAnimation = new potree.CameraAnimation(
//                 (window as any).viewer
//             );

//             const { targets, positions } = createTrackShappedOrbitPath(tx, tx_h, rx, rx_h, 50.0, 50.0);

//             for (let i = 0; i < positions.length; i++) {
//                 const cp = this.globalLinkAnimation.createControlPoint();
//                 cp.position.set(...positions[i]);
//                 cp.target.set(...targets[i]);
//             }
//             const link_len = calcLinkLength(tx, rx, tx_h, rx_h);
//             const desired_animation_speed = 50; // meters per second 
//             const min_animation_duration = 20;
//             const animationDuration = Math.max((link_len * 2 / desired_animation_speed), min_animation_duration);
//             // @ts-ignore
//             window.viewer.scene.addCameraAnimation(this.globalLinkAnimation);
//             this.globalLinkAnimation.setDuration(animationDuration);
//             this.globalLinkAnimation.setVisible(false);
//             this.globalLinkAnimation.setInterpolateControlPoints(true);
//             if (start_animation) {
//                 this.animationPlaying = true;
//                 this.globalLinkAnimation.play(true);
//             } else {
//                 this.animationPlaying = false;
//             }
//             const animationClickCallback = () => {
//                 if (this.animationPlaying) {
//                     // beta feature: show the dot again.
//                     if (isBeta()) {
//                         this.fitFresnelPositionToBounds();
//                         this.moveLocation3DView();

//                         // funny hack to get last line of code to toggle correctly
//                         this.animationPlaying = true;
//                     }
//                     else {
//                         this.globalLinkAnimation.pause();
//                         $('#pause-button-3d').addClass('d-none');
//                         $('#play-button-3d').removeClass('d-none');
//                     }
//                 } else {
//                     this.globalLinkAnimation.play(true);
//                     $('#pause-button-3d').removeClass('d-none');
//                     $('#play-button-3d').addClass('d-none');

//                     // beta feature: hide dot and link profile highlight when animation plays.
//                     if (isBeta()) {
//                         this.highlightCurrentPosition(false);
//                         this.hideHover3DDot();
//                     }
//                 }
//                 this.animationPlaying = !this.animationPlaying;
//             };

//             this.spacebarCallback = (event: any) => {
//                 var key = event.which || event.keyCode;
//                 if (key === 32 && this.currentView === '3d') {
//                     event.preventDefault();
//                     animationClickCallback();
//                 }
//             };

//             window.addEventListener('keydown', this.spacebarCallback);

//             $('#3d-pause-play').click(animationClickCallback);
//         }
//     }

//     addLink(tx: any, rx: any, tx_h: any, rx_h: any) {
//         this.updateLinkHeight = (tx_h: any, rx_h: any, start_animation: boolean = false) => {
//             // @ts-ignore
//             let scene = window.viewer.scene;
//             // Add LOS Link Line
//             if (this.linkLine !== null) {
//                 scene.scene.remove(this.linkLine);
//             }

//             const fresnel_width_m = calculateMaximumFresnelRadius(this._link_distance, this.centerFreq);
//             this.linkLine = createLinkGeometry(tx, rx, tx_h, rx_h, fresnel_width_m);
//             scene.scene.add(this.linkLine);
//             this.createAnimationForLink(tx, rx, tx_h, rx_h, start_animation);
//         }
//         this.updateLinkHeight(tx_h, rx_h, true);
//     }
// }