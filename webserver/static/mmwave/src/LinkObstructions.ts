export function updateObstructionsData(obstructions: Array<[number, number]>) {
    if(obstructions.length > 0)
    {
        $("#link-status--status").html('Failed&nbsp;').css('color','#D82020');
        $("#link-status--obstructions").text(`(${obstructions.length} Obstructions)`);
    } else {
        $("#link-status--status").html('Passed&nbsp;').css('color','#288F13');
        $("#link-status--obstructions").text('(No Obstructions)');
    }
}