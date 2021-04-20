export function isBeta() : boolean{
    const contents = document.getElementById('los_beta')?.textContent;
    if(typeof contents !== "string"){
        return false
    }
    return JSON.parse(contents);
}
