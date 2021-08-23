export function getToolURL() {
    return window.location.pathname.includes('market') ? '/pro/market/' : '/pro/network/edit/';
}
