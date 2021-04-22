import AutoMerge from 'automerge';
import Redis from 'ioredis';
import {settings} from '../settings';

const redis = new Redis(settings.REDIS_BACKEND);

export async function initAutoMergeMap(session: string) {
    const feature_collection = {type: "FeatureCollection", features: []};
    const init = AutoMerge.from(feature_collection);
    return redis.set(`map-automerge-isptoolbox-${session}`, AutoMerge.save(init));
}

export async function loadAutoMergeMap(session: string){
    return redis.get(`map-automerge-isptoolbox-${session}`);
}

export async function deleteAutoMergeMap(session: string) {
    return redis.del(`map-automerge-isptoolbox-${session}`);
}

export async function updateAutoMergeMap(session: string, update: string) {
    const redis_val = await redis.get(`map-automerge-isptoolbox-${session}`);
    if(redis_val){
        const parsed_update = JSON.parse(update);
        const new_doc = AutoMerge.applyChanges(AutoMerge.load(redis_val), parsed_update);
        return redis.set(`map-automerge-isptoolbox-${session}`, AutoMerge.save(new_doc));
    }
}