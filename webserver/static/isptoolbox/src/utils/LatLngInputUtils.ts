export function parseLatitudeLongitude(id: string) : [number, number] | null {
    const val = String($(id).val())
    try{
        let coords = val.split(',');
        if(coords.length !== 2){
            coords = val.split(' ');
        }
        if(coords.length !== 2){
            setInvalidValue(id, false);
            return null;
        }
        const lat = parseFloat(coords[0]);
        const lng = parseFloat(coords[1]);
        if(!validateCoordinates(lat, lng)){
            setInvalidValue(id, false);
            return null;
        }
        setInvalidValue(id, true);
        return [lat, lng];
    } catch(error){
        setInvalidValue(id, false);
        return null;
    }
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