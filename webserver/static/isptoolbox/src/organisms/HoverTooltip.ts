export function addHoverTooltip(selector: string, placement: string = 'top') {
    // @ts-ignore
    $(selector).tooltip({
        delay: { show: 500, hide: 100 },
        placement: placement
    });
}
