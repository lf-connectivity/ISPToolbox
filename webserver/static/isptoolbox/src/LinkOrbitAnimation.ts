// @ts-ignore
const THREE = window.THREE;
// @ts-ignore
const Potree = window.Potree;
import {calculateLookVector} from './HoverMoveLocation3DView';


/* Generate a Gerono lemniscate curve for the camera position, and target along the link path */
export function createOrbitAnimationPath (tx: [number,number], tx_h: number, rx: [number,number], rx_h: number, radius: number, height: number, num_pts=50)
: {targets: Array<[number,number, number]>, positions: Array<[number,number,number]>}
{
    const positions: Array<[number,number,number]> = [];
    const targets: Array<[number,number,number]>  = [];
    const xScaling = Math.sqrt((tx[0] - rx[0])*(tx[0] - rx[0]) + (tx[1] - rx[1])*( tx[1] - rx[1])) / (2.0) + radius;
    const yScaling = radius;
    const offset = [(tx[0] + rx[0]) / 2.0, (tx[1] + rx[1]) / 2.0];
    const angle = Math.atan2((tx[1] - rx[1]), (tx[0] - rx[0]))

    for(let i = 0; i <= num_pts; i++)
    {
        const t = 2.0 * Math.PI * i / num_pts;
        const x_8 =  Math.sin(t) * xScaling;
        const y_8 =  Math.sin(t) * Math.cos(t) * yScaling;

        const pos : [number, number, number] = [
            offset[0] + x_8 * Math.cos(angle) + Math.sin(angle) * y_8,
            offset[1] + x_8 * Math.sin(angle) + Math.cos(angle) * y_8,
            Math.max(tx_h + height, rx_h + height)
        ];
        positions.push(pos);
        let look : [number, number, number] = [tx[0], tx[1], tx_h];

        if (t <  Math.PI)
        {
            look = look;
        } else if (t < 2.0 * Math.PI)
        {
            look = [rx[0], rx[1], rx_h];
        } else {
            look = [tx[0], tx[1], tx_h];
        }
        targets.push(look);
    }
    return {targets, positions};
}

/**
 * @param tx - coordinates of tx radio in 3d view
 * @param tx_h - height of radio in 3d view
 * @param rx - coordinates of rx radio in 3d view
 * @param rx_h - height of radio in 3d view
 * @param radius - distance path should be from link
 * @param height - height above link camera should be
 * @param num_pts - number of points in the animation path
 *  
 * @returns {Array<number>} profile adjusted for Earth's curvature
 */
export function createTrackShappedOrbitPath(tx: [number,number], tx_h: number, rx: [number,number], rx_h: number, radius: number, height: number, num_pts=50)
: {targets: Array<[number,number, number]>, positions: Array<[number,number,number]>}
{
    const positions: Array<[number,number,number]> = [];
    const targets: Array<[number,number,number]>  = [];
    const angle = Math.atan2((tx[1] - rx[1]), (tx[0] - rx[0]))

    function calculateTransitionArea(t: number): [number,number,number] {
        if(t < Math.PI) {
            const norm_t = (t - Math.PI * 3. / 4.) / (Math.PI / 4) * Math.PI + Math.PI / 2.;
            const x_8 = radius * Math.cos(norm_t);
            const y_8 = radius * Math.sin(norm_t);
            return [
                rx[0] + x_8 * Math.cos(angle) - y_8 * Math.sin(angle),
                rx[1] + x_8 * Math.sin(angle) + y_8 * Math.cos(angle),
                rx_h + height
            ];
        } else {
            const norm_t = (t - Math.PI * 7. / 4.) / (Math.PI / 4) * Math.PI +  3. * Math.PI / 2.;
            const x_8 = radius * Math.cos(norm_t);
            const y_8 = radius * Math.sin(norm_t);
            return [
                tx[0] + x_8 * Math.cos(angle) - y_8 * Math.sin(angle),
                tx[1] + x_8 * Math.sin(angle) + y_8 * Math.cos(angle),
                tx_h + height
            ];
        }
    }

    function getNormalizedPos(t: number): number{
        if(t < Math.PI * 3.0 / 4.0){
            return t * 4.0 / (3.0 * Math.PI);
        } else if (t < Math.PI) {
            return 1;
        } else if (t < Math.PI * 7. / 4.) {
            return -1 + (t - Math.PI) * 4.0 / (3.0 * Math.PI);
        } else if (t < Math.PI * 2.0) {
            return -0;
        } else {
            return  getNormalizedPos( t % (2*Math.PI));
        }
    }

    function inTransitionArea(t: number): boolean{
        if(t < Math.PI * 3.0 / 4.0){
            return false;
        } else if (t < Math.PI) {
            return true;
        } else if (t < Math.PI * 7. / 4.) {
            return false;
        } else if (t < Math.PI * 2.0){
            return true;
        } else {
            return inTransitionArea(t % (2. * Math.PI));
        }
    }

    for(let i = 0; i <= num_pts; i++) {
        const t =  2 * Math.PI * i / num_pts;
        
        const norm_pos = getNormalizedPos(t);
        const {location, lookAt} = calculateLookVector(tx, tx_h, rx, rx_h, norm_pos);
        if (inTransitionArea(t)) {
            positions.push(calculateTransitionArea(t));
        } else {
            positions.push(location);
        }
        targets.push(lookAt);
    }

    return {targets, positions};
}

export function createLinkGeometry(tx: [number, number], rx: [number, number], tx_h : number, rx_h: number, max_fresnel_radius: number = 1.0)
{
    var linkSize = calcLinkLength(tx, rx, tx_h, rx_h);
    var geometry = new THREE.SphereGeometry(1.0, 32, 32);
    geometry.scale(max_fresnel_radius, max_fresnel_radius, linkSize / 2.0);
    var material = new THREE.MeshBasicMaterial( {color: 0x4ADEFF, opacity: 0.8, transparent: true} );
    var linkLine = new THREE.Mesh( geometry, material );
    linkLine.position.set((tx[0] + rx[0] )/ 2.0, (tx[1] + rx[1] )/ 2.0, (tx_h + rx_h)/ 2.0);
    linkLine.lookAt(tx[0], tx[1], tx_h);
    return linkLine;
}

export function createHoverPoint(location : [number, number, number], lookAt: [number, number, number]) 
{
    var geometry = new THREE.BoxGeometry(3 , 3, 3);
    var material = new THREE.MeshBasicMaterial( {color: 0x4e95cf, polygonOffset: true, polygonOffsetFactor: -1000, polygonOffsetUnits: -1000} );
    var pt = new THREE.Mesh(geometry, material);
    pt.position.set(location[0], location[1], location[2]);
    pt.lookAt(new THREE.Vector3(lookAt[0], lookAt[1], lookAt[2]));
    return pt;
}

export function createHoverVoume(location: [number, number, number], scale: [number, number, number], lookAt: [number, number, number])
{
    const hoverVolume = new Potree.BoxVolume();
    hoverVolume.name = "Visible Clipping Volume";
    hoverVolume.scale.set(scale[0], scale[1], scale[2]);
    hoverVolume.position.set(location[0], location[1], location[2]);
    hoverVolume.lookAt(new THREE.Vector3(lookAt[0], lookAt[1], lookAt[2]));
    hoverVolume.clip = true;
    return hoverVolume;
}

export function calcLinkLength(tx: [number, number], rx: [number, number], tx_h : number, rx_h: number) : number {
    return Math.sqrt(Math.pow(tx[0] - rx[0], 2.0) + Math.pow(tx[1] - rx[1], 2.0) + Math.pow(tx_h - rx_h, 2.0));
}

export function generateClippingVolume(bb : Array<number>, buffer : number  = 25.) :
{position: Array<number>, scale : Array<number>, camera : Array<number>} 
{
    const position = [(bb[0] + bb[2]) / 2.0, (bb[1] + bb[3]) / 2.0, (bb[4] + bb[5]) / 2.0];
    const scaleY = Math.sqrt(Math.pow(bb[0]- bb[2], 2.0) + Math.pow(bb[1] - bb[3], 2.0));
    const scale = [ Math.abs(bb[4] - bb[5]) * 4.0, buffer * 3.0,scaleY + buffer];

    const camera_height = Math.max(scale[0], scale[1]) / (2.0 * Math.tan(Math.PI / 12)) + bb[4];
    const camera = [position[0], position[1], camera_height];

    return { position, scale, camera };
}

