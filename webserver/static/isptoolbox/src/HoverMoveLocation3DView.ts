/**
 * 
 * @param tx - location of first radio
 * @param tx_h - height of first radio
 * @param rx - location of second radio
 * @param rx_h - height of second radio
 * @param pos - position along the link
 */
export function calculateLookVector(
    tx: [number, number],
    tx_h : number,
    rx : [number, number],
    rx_h : number,
    pos : number,
    offset_camera : number = 50.0) : { location : [number,number, number], lookAt : [number,number, number] }
{
    const abs_pos = Math.abs(pos);
    const lookAt : [number, number, number] = [weighted_avg(tx[0], rx[0], abs_pos), weighted_avg(tx[1], rx[1], abs_pos), weighted_avg(tx_h, rx_h, abs_pos)];
    let perpVec: [number, number, number]  = [rx[1] - tx[1], tx[0] - rx[0], 0];
    const perpVecLen  = Math.sqrt(perpVec[0] * perpVec[0] + perpVec[1] * perpVec[1]);
    const sign_pos = Math.sign(pos) === 0 ? 1 : Math.sign(pos);
    const scaledperpVec  = perpVec.map(x => {return sign_pos * offset_camera * x / perpVecLen });
    scaledperpVec[2] = offset_camera;
    //@ts-ignore
    const location : [number, number, number] = lookAt.map((x,idx) => { return x + scaledperpVec[idx]});
    return {location, lookAt};
}

function weighted_avg(a : number, b : number, weight : number) : number
{
    return a + weight * ( b - a);
}

export function calculateLinkNormal(tx : [number, number], rx : [number, number]) : [number, number, number]{
    return [rx[1] - tx[1], tx[0] - rx[0], 0];
}