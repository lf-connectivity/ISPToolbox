// https://gist.github.com/chrisjhoughton/7890303
export function waitForElement(selector: string, callback: any) {
    if ($(selector).length) {
        callback();
    }
    else {
        setTimeout(() => {
            waitForElement(selector, callback);
        }, 50);
    }
};
