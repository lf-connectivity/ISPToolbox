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
        setInvalidValue(id, true);
        return [lat, lng];
    } catch(error){
        setInvalidValue(id, false);
        return null;
    }
}

function setInvalidValue(id: string, valid: boolean){
    valid? $(id).removeClass('is-invalid') : $(id).addClass('is-invalid');
}