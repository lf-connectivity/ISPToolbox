
export type style = {
    id: string
}
/**
 * 
 * @returns the combination of style1 and style2 where style 1 takes prescendence
 * over style 2 in the event of an id conflict. the first styles in the order will be
 * placed first on the map
 * 
 * @param style1 - array of styles
 * @param style2 - array of styles
 */
export function combineStyles(style1: Array<style>, style2: Array<style>) {
    const style1ids = style1.map((s) =>s.id);
    const outputstyles = style1.map((s)=>s);
    style2.forEach((s)=>{
        const idx = outputstyles.findIndex((style) => style.id === s.id);
        if(idx === -1){
            outputstyles.push(s);
        } else {
            outputstyles.splice(idx, 1, s);
        }
    });
    return outputstyles
}