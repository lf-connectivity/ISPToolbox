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
    tx_h: number,
    rx: [number, number],
    rx_h: number,
    pos: number,
    offset_camera: number = 50.0
): { location: [number, number, number]; lookAt: [number, number, number] } {
    const start: [number, number, number] = [tx[0], tx[1], tx_h];
    const end: [number, number, number] = [rx[0], rx[1], rx_h];
    const abs_pos = Math.abs(pos);
    const lookAt: [number, number, number] = position_along_segment(start, end, abs_pos);
    let perpVec: [number, number, number] = [rx[1] - tx[1], tx[0] - rx[0], 0];
    const perpVecLen = Math.sqrt(perpVec[0] * perpVec[0] + perpVec[1] * perpVec[1]);
    const sign_pos = Math.sign(pos) === 0 ? 1 : Math.sign(pos);
    const scaledperpVec = perpVec.map((x) => {
        return (sign_pos * offset_camera * x) / perpVecLen;
    });
    scaledperpVec[2] = offset_camera;
    //@ts-ignore
    const location: [number, number, number] = lookAt.map((x, idx) => {
        return x + scaledperpVec[idx];
    });
    return { location, lookAt };
}

function position_along_segment(
    start: [number, number, number],
    end: [number, number, number],
    weight: number
): [number, number, number] {
    let vec: [number, number, number] = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
        vec[i] = start[i] + weight * (end[i] - start[i]);
    }
    return vec;
}

export function calculateLinkNormal(
    tx: [number, number],
    rx: [number, number]
): [number, number, number] {
    return [rx[1] - tx[1], tx[0] - rx[0], 0];
}

export function calculateLinkProfileFresnelPosition(
    target: any,
    tx: [number, number],
    rx: [number, number],
    xAxisMax: number,
    minX: number = 0,
    maxX: number = xAxisMax
): number {
    // Find weight (k) by solving equation tx + k(rx - tx) = target
    let weight = (target.x - tx[0]) / (rx[0] - tx[0]);

    // Limit position to between 0 and xAxisMax.
    if (weight > 1) {
        return xAxisMax;
    } else if (weight < minX) {
        return minX;
    } else {
        return Math.round(weight * xAxisMax);
    }
}
