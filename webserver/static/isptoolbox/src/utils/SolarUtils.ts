const DAYS_IN_YEAR = 365;

export function sunriseTime(latitude: number, day_of_year: number): number{
    console.log(latitude);
    const lat = Math.PI * latitude / 180.0;
    console.log(lat);
    const angle = (-Math.sin(lat) * Math.sin(day_of_year / DAYS_IN_YEAR)) /
        (-Math.cos(lat) * Math.cos(day_of_year / DAYS_IN_YEAR));
    return 12 - (1 / 15.0) * Math.acos(angle)
}

export function sunsetTime(latitude: number, day_of_year: number) : number {
    const lat = Math.PI * latitude / 180.0;
    const angle = (-Math.sin(lat) * Math.sin(day_of_year / DAYS_IN_YEAR)) /
        (-Math.cos(lat) * Math.cos(day_of_year / DAYS_IN_YEAR));
    return 12 + (1 / 15.0) * Math.acos(angle)
}

export function number_solar_hours(latitude: number, day_of_year: number){
    return sunsetTime(latitude, day_of_year) - sunriseTime(latitude, day_of_year);
}