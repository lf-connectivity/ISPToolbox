export function hasCookie(key: string): boolean {
    if (document.cookie.split(';').some(item => {
        return item.trim().indexOf(key + '=') == 0
    })) {
        return true
    }
    return false
}
