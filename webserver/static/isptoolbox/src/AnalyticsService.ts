type Event = {
    sessionId: string;
    eventType: string;
    url: string;
};

console.log('analytics service available');

export const saveAnalyticsEvent = async (event: Event) => {
    const response = await fetch('/analytics/events', {
        method: 'POST',
        mode: 'same-origin',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
    });
    return response.json();
};
