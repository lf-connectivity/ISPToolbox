// (c) Meta Platforms, Inc. and affiliates. Copyright
// Removes single quotes from a string
export function sanitizeString(str: string) {
    return str.replace(/'/g, '&#39;');
}

// Truncates the string if it's beyond a certain length. Also corrects input field if given.
export function validateString(maxlen: number, str: string, inputId?: string) {
    let truncated = str.length <= maxlen ? str : str.slice(0, maxlen - 3) + '...';
    if (inputId) {
        $(`#${inputId}`).val(sanitizeString(truncated));
    }
    return truncated;
}

// Bound number between min and max
export function validateNumber(min: number, max: number, num: number, inputId?: string) {
    let corrected;
    if (num > max || isNaN(num)) {
        corrected = max;
    } else if (num < min) {
        corrected = min;
    } else {
        corrected = num;
    }

    if (inputId) {
        $(`#${inputId}`).val(corrected);
    }
    return corrected;
}

export function validateNumberMarkInvalid(min: number, max: number, num: number, inputId?: string) {
    let validated: number | null;
    if (num > max || isNaN(num)) {
        validated = null;
    } else if (num < min) {
        validated = null;
    } else {
        validated = num;
    }

    if (inputId) {
        validated == null
            ? $(inputId).addClass('is-invalid')
            : $(inputId).removeClass('is-invalid');
    }

    return validated;
}
