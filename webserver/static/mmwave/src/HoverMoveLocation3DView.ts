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
    offset_camera : number = 50.0) : { location : number[], lookAt : number[] }
{
    const lookAt = [weighted_avg(tx[0], rx[0], pos), weighted_avg(tx[1], rx[1], pos), weighted_avg(tx_h, rx_h, pos)];
    let perpVec = [rx[1] - tx[1], tx[0] - rx[0], 0];
    const perpVecLen = Math.sqrt(perpVec[0] * perpVec[0] + perpVec[1] * perpVec[1]);
    perpVec = perpVec.map(x => {return offset_camera * x / perpVecLen });
    perpVec[2] = offset_camera;
    const location = lookAt.map((x,idx) => { return x + perpVec[idx]});
    return {location, lookAt};
}

function weighted_avg(a : number, b : number, weight : number) : number
{
    return a + weight * ( b - a);
}