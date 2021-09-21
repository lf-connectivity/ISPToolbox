/**
 * Reverse URL Lookup Utility - requires script tag
 * @param name name of url to reverse lookup url
 * @param args arguments that named url uses (uuid, string, id)
 * @returns URL endpoint string
 */
export function djangoUrl(name: string, ...args: any[]) {
    const urls = (window as any).Urls;
    if (urls !== undefined) {
        return urls[name](args);
    } else {
        throw 'reverse URLS not found';
    }
}
