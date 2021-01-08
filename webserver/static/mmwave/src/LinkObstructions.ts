export function updateObstructionsData(obstructions: Array<[number, number]>) {
    if(obstructions.length > 0)
    {
        $("#isp-toolbox-link-status").html('Failed&nbsp;').css('color','#D82020');
        $("#isptoolbox-link-status-obstructions").text(`(${obstructions.length} Obstructions)`);
    } else {
        $("#isp-toolbox-link-status").html('Passed&nbsp;').css('color','#288F13');
        $("#isptoolbox-link-status-obstructions").text('(No Obstructions)');
    }
}