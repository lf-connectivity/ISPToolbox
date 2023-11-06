// (c) Meta Platforms, Inc. and affiliates. Copyright
export function getCookie(name: string) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === name + '=') {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    if(cookieValue === null)
    {
        cookieValue = (document.querySelector('[name=csrfmiddlewaretoken]') as HTMLInputElement)?.value;
    }
    return cookieValue;
}

export function hasCookie(key: string): boolean {
    if (
        document.cookie.split(';').some((item) => {
            return item.trim().indexOf(key + '=') == 0;
        })
    ) {
        return true;
    }
    return false;
}
