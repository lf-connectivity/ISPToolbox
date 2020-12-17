// @ts-ignore
const THREE = window.THREE;

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

export function createLinkGeometry(tx: [number, number], rx: [number, number], tx_h : number, rx_h: number)
{
    var linkSize = calcLinkLength(tx, rx, tx_h, rx_h);
    var geometry = new THREE.BoxGeometry(1 , 1, linkSize);
    var material = new THREE.MeshBasicMaterial( {color: 0x3bb2d0} );
    var linkLine = new THREE.Mesh( geometry, material );
    linkLine.position.set((tx[0] + rx[0] )/ 2.0, (tx[1] + rx[1] )/ 2.0, (tx_h + rx_h)/ 2.0);
    linkLine.lookAt(tx[0], tx[1], tx_h);
    return linkLine;
}

export function calcLinkLength(tx: [number, number], rx: [number, number], tx_h : number, rx_h: number) : number {
    return Math.sqrt(Math.pow(tx[0] - rx[0], 2.0) + Math.pow(tx[1] - rx[1], 2.0) + Math.pow(tx_h - rx_h, 2.0));
}

export function generateClippingVolume(bb : [number, number, number, number, number, number], buffer : number  = 25.) :
{position: Array<number>, scale : Array<number>, camera : Array<number>} 
{
    const position = [(bb[0] + bb[2]) / 2.0, (bb[1] + bb[3]) / 2.0, (bb[4] + bb[5]) / 2.0];
    const scaleY = Math.sqrt(Math.pow(bb[0]- bb[2], 2.0) + Math.pow(bb[1] - bb[3], 2.0));
    const scale = [ Math.abs(bb[4] - bb[5]) * 4.0, buffer,scaleY + buffer];

    const camera_height = Math.max(scale[0], scale[1]) / (2.0 * Math.tan(Math.PI / 12)) + bb[4];
    const camera = [position[0], position[1], camera_height];

    return { position, scale, camera };
}

