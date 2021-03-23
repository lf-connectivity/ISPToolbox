// export class LinkProfileView {
//     constructor(){

//     }


//     updateAxes() {
//         const scaling_factor = this._link_distance / this._lidar.length;
//         this.link_chart.xAxis[0].update({
//             labels: {
//                 formatter: this.units === UnitSystems.US ? function () {
//                     return `${km2miles(this.value * scaling_factor / 1000).toFixed(2)}`
//                 }
//                     : function () {
//                         return `${(this.value * scaling_factor / 1000).toFixed(1)}`;
//                     }
//             },
//             title: {
//                 text: `Distance ${this.units === UnitSystems.US ? '[mi]' : '[km]'} - resolution ${this.units === UnitSystems.US ? m2ft(this.data_resolution).toFixed(1) : this.data_resolution
//                     } ${this.units === UnitSystems.US ? '[ft]' : '[m]'}`
//             }
//         });
//         this.link_chart.yAxis[0].update({
//             labels: {
//                 formatter: this.units === UnitSystems.US ? function () {
//                     return `${m2ft(this.value).toFixed(0)}`
//                 }
//                     : function () {
//                         return `${(this.value).toFixed(0)}`;
//                     }
//             }, title: {
//                 text:
//                     this.units === UnitSystems.US ? 'Elevation [ft]' : 'Elevation [m]'
//             }
//         });
//     }

//     updateLegend() {
//         $("#los-chart-tooltip-button").removeClass('d-none')
//         const sources: Array<string> = [];
//         this.datasets.forEach((l, k) => { if (l instanceof Array) { l.forEach(v => { sources.push(v); }) } })
//         $('#los-chart-tooltip-button').attr(
//             "title",
//             `<div class="los-chart-legend">
//                 <h5>Link Profile</h5>
//                     <div class='isptoolbox-bullet-line'><span class='isptoolbox-tooltip-colorbox isptoolbox-los' ></span><p class='list-item'>LOS</p></div>
//                     <div class='isptoolbox-bullet-line'><span class='isptoolbox-tooltip-colorbox isptoolbox-fresnel' ></span><p class='list-item'>Fresnel</p></div>
//                     <div class='isptoolbox-bullet-line'><span class='isptoolbox-tooltip-colorbox isptoolbox-lidar' ></span><p class='list-item'>LiDAR</p></div>
//                     <div class='isptoolbox-bullet-line'><span class='isptoolbox-tooltip-colorbox isptoolbox-terrain'></span><p class='list-item'>Terrain</p></div>
//                     <div class='isptoolbox-bullet-line'><span class='isptoolbox-tooltip-colorbox isptoolbox-obstruction'></span><p class='list-item'>LOS Obstructions</p></div>
//                     ${this.datasets.size ? `
//                     <p class='isptoolbox-data-source'>Data Sources: ${sources.join(', ')}</p>` : ''}
//             </div>`
//             // @ts-ignore
//         ).tooltip('_fixTitle');
//     }

//     /*
//     Sets fresnel position to somewhere between the min and max value of x-axis,
//     depending on current zoom. Also tries to round fresnel position to prevent
//     floating point positions.
//     */
//     fitFresnelPositionToBounds() {
//         // Round bounds to the nearest integer within the bound.
//         // Bound min and max by either the zoomed in portion or the overall
//         // fresnel cone.
//         let xMin = Math.max(Math.ceil(this.link_chart.xAxis[0].min), 0);
//         let xMax = Math.min(Math.floor(this.link_chart.xAxis[0].max), this._elevation.length - 1);

//         // Round fresnel position first before applying bounds calculations
//         this.linkProfileFresnelPosition = Math.round(this.linkProfileFresnelPosition);
//         if (this.linkProfileFresnelPosition < xMin) {
//             this.linkProfileFresnelPosition = xMin;
//         }
//         else if (this.linkProfileFresnelPosition > xMax) {
//             this.linkProfileFresnelPosition = xMax;
//         }
//     }

//     /*
//     Updates how far along the fresnel zone we should go on one keypress event.
//     Smaller distances means more units (1 x-axis unit distance is smaller), while
//     max distance should mean less units (1 unit is minimum)
//     */
//     updateNavigationDelta() {
//         // Less than 1 mile = 8 units
//         if (this._link_distance < 1600) {
//             this.navigationDelta = 8;
//         }
//         else {
//             // Minimal delta speed is 1
//             this.navigationDelta = Math.max(Math.round(17000 / this._link_distance), 1);
//         }
//     }

//     /**
//      * Updates link chart for LOS based on new elevation profile and tx/rx height
//      */
//      updateLinkChart(update3DView = false) {
//         if (this._elevation.length > 0 && this._link_distance) {
//             const { los, fresnel } = createLinkProfile(
//                 this._elevation,
//                 this.getRadioHeightFromUI('0'),
//                 this.getRadioHeightFromUI('1'),
//                 this._link_distance / this._elevation.length,
//                 this.centerFreq
//             );
//             this.link_chart.series[2].setData(los);
//             this.link_chart.series[3].setData(fresnel);
//             this.fresnel_width = Math.max(...fresnel.map((x) => x[2] - x[1]));
//             if (this._lidar != null) {
//                 const overlaps = findLidarObstructions(fresnel, this._lidar);
//                 this.link_status.updateObstructionsData(overlaps);
//                 this.link_chart.xAxis[0].removePlotBand();
//                 overlaps.forEach((x) => {
//                     this.link_chart.xAxis[0].addPlotBand({
//                         from: x[0],
//                         to: x[1],
//                         color: 'rgba(242, 62, 62, 0.2)'
//                     });
//                 })
//             }
//         }
//         if (this._elevation != null && this.updateLinkHeight != null && update3DView) {
//             if (isBeta()) {
//                 this.highlightCurrentPosition(false);
//             }

//             const tx_hgt = this.getRadioHeightFromUI('0') + this._elevation[0];
//             const rx_hgt = this.getRadioHeightFromUI('1') + this._elevation[this._elevation.length - 1];
//             this.updateLinkHeight(tx_hgt, rx_hgt, !update3DView);            
//             if (this._lidar != null) {
//                 this.link_chart.yAxis[0].update({
//                     min: Math.min(...[...this._lidar, tx_hgt, rx_hgt]),
//                     max: Math.max(...[...this._lidar, tx_hgt, rx_hgt])
//                 });
//             }

//             if (isBeta()) {
//                 this.moveLocation3DView();
//             }
//         }
//     }

//     /**
//      * User adjusted chart limits - query BE for zoomed section
//      */
//     setExtremes(event: HighChartsExtremesEvent) {
//         this.link_chart.showLoading();
//         let extremes: [number, number] = [0, 1];
//         if (event.min !== undefined && event.max !== undefined) {
//             extremes = [event.min / this._elevation.length, event.max / this._elevation.length];
//         }
//         this.zoomUpdateLinkProfile(extremes);
//     }

// }