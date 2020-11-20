
const speed_of_light = 299792458; // m/s
const earth_radius_km = 6371; // km
const earth_radius_m = earth_radius_km * 1000; // m
/**
 * 
 * @param link_len - number of points in link profile
 * @param resolution - resolution of link profile [meteres]
 * @param freq_ghz - center frequency of link [GHz]
 * @param fresnel_zone_number - fresnel zone number 
 */
export function createFresnelZone(link_len : number, resolution : number = 1.0, freq_ghz : number = 60.0, fresnel_zone_number : number = 1.0){
    const freq = freq_ghz * (10 ** 9); // GHz to Hz
    const wavelength =  speed_of_light / freq; // m
    const fresnel_zone_hgt : Array<number> = [];
    for(let i = 0; i < link_len; i++)
    {
        const d1 = resolution * i;
        const d2 = (link_len - i) * resolution;
        const d_total = link_len * resolution;
        const fresnel = Math.sqrt(fresnel_zone_number * d1 * d2 * wavelength / (d_total));
        fresnel_zone_hgt.push(fresnel);
    }
    return fresnel_zone_hgt;
};

/**
 * @param tx_hgt_m - transmitting radio height above mean sea level in meters
 * @param rx_hgt_m - receiving radio height above mean sea level in meters
 * @param link_len - number of points in the profile
 * @param resolution - distance between pts in profile in meters 
 *  
 * @returns {Array<number>} profile adjusted for Earth's curvature
 */
export function adjustProfileCurvatureEarth(tx_hgt_m : number, rx_hgt_m : number, link_len: number, resolution : number = 1.0): Array<number>
{
    // Compute Link in Polar coordinates
    const r1 = earth_radius_m + tx_hgt_m;
    const r2 = earth_radius_m + rx_hgt_m;
    const theta1 = 0;
    const theta2 = (link_len* resolution) / earth_radius_m;
    const y1 = r1 * Math.sin(theta1);
    const x1 = r1 * Math.cos(theta1);
    const y2 = r2 * Math.sin(theta2);
    const x2 = r2 * Math.cos(theta2);
    const m = (y2 - y1) / (x2 - x1);
    const b = y2 - (m * x2);
    // Solve For Link Projected Radially
    const earth_curvature: Array<number> = [];
    for(let i = 0; i < link_len; i++)
    {
        const theta = (i * resolution) / earth_radius_m;
        const h = (b / (Math.sin(theta) - m * Math.cos(theta))) - earth_radius_m;
        earth_curvature.push(h);
    }
    return earth_curvature;
}

/**
 * 
 * @param elevation elevation profile above mean sea level
 * @param tx_h_m transmit height above elevation profile
 * @param rx_h_m receive height above elevation profile
 * @param resolution_m spacing between points in elevation profile
 * @param frequency_ghz center frequency of link
 */
export function createLinkProfile(
    elevation : Array<number>,
    tx_h_m : number, rx_h_m : number,
    resolution_m: number = 1.0,
    frequency_ghz : number = 0.0): Array<number>
{
    const tx_hgt_m = tx_h_m + elevation[0];
    const rx_hgt_m = rx_h_m + elevation[elevation.length - 1];
    const profile = adjustProfileCurvatureEarth(tx_hgt_m, rx_hgt_m, elevation.length, resolution_m);
    if(frequency_ghz !== 0.0)
    {
        const fresnel_zone = createFresnelZone(elevation.length, resolution_m, frequency_ghz);
        return fresnel_zone.map((v, idx) => {return profile[idx] - v});
    } else {
        return profile;
    }

}