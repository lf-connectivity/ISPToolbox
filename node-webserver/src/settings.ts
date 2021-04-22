export const settings = {
    REDIS_BACKEND : (
        process.env.REDIS_BACKEND ?
            process.env.REDIS_BACKEND : 'redis://localhost:6379'),
}