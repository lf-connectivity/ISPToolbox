export function parseLatitudeLongitude(val: string): [number, number] | null {
    try{
        let coords = val.split(',');
        if(coords.length !== 2){
            coords = val.split(' ');
        }
        if(coords.length !== 2){
            return null;
        }

        const lat = parseFloat($.trim(coords[0]));
        const lng = parseFloat($.trim(coords[1]));
        if(!validateCoordinates(lat, lng)){
            return null;
        }
        return [lat, lng];
    } catch(error){
        return null;
    }
}

export function parseSearchBarLatitudeLongitude(query: string): [number, number] | null {
    if (query.charAt(0) == '(' && query.charAt(query.length - 1) == ')' ) {
        return parseLatitudeLongitude(query.slice(1, -1));
    }
    else {
        return parseLatitudeLongitude(query);
    }
}

export function parseFormLatitudeLongitude(id: string) : [number, number] | null {
    const val = String($(id).val());
    const result = parseLatitudeLongitude(val);
    if (result === null) {
        setInvalidValue(id, false);
    }
    else {
        setInvalidValue(id, true);
    }
    return result;
}

function validateCoordinates(lat: number, lng: number){
    if(lat > 90 || lat < -90 || lng < -180 || lng > 180){
        return false;
    } else {
        return true;
    }
}

function setInvalidValue(id: string, valid: boolean){
    valid? $(id).removeClass('is-invalid') : $(id).addClass('is-invalid');
}