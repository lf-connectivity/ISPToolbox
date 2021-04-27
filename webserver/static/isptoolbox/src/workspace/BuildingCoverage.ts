import {Polygon, Feature} from 'geojson';

// Have to use a string JSON key for map
function toKey(building: Polygon): string{
    return JSON.stringify(building);
};

export enum BuildingCoverageStatus {
    SERVICEABLE = 'serviceable',
    UNSERVICEABLE = 'unserviceable',
    UNKNOWN = 'unknown'
}

export class BuildingCoverage {
    private buildings: Map<string, [Polygon, BuildingCoverageStatus]>;

    constructor(coverageResponse: Array<Feature<Polygon, any>>) {
        this.buildings = new Map();
        coverageResponse.forEach((feat: Feature<Polygon, any>) => {
            let key = toKey(feat.geometry);

            let status = BuildingCoverageStatus.UNKNOWN;
            if (feat.properties.serviceable) {
                status = feat.properties.serviceable as BuildingCoverageStatus;
            }
            this.buildings.set(key, [feat.geometry, status]);
        });
    }

    getCoverageStatus(building: Polygon): BuildingCoverageStatus {
        let key = toKey(building);
        if (this.buildings.has(key)) {
            // @ts-ignore
            return this.buildings.get(key)[1] as BuildingCoverageStatus;
        }
        else {
            return BuildingCoverageStatus.UNKNOWN;
        }
    }

    toFeatureArray(): Array<Feature<Polygon, any>> {
        let arr: Array<Feature<Polygon, any>> = [];
        this.buildings.forEach(([building, status]: [Polygon, BuildingCoverageStatus], key: string) => {
            arr.push({
                'type': 'Feature',
                'geometry': building,
                'properties': {
                    'serviceable': status
                }
            })
        });

        return arr;
    }

    /**
     * Returns a BuildingCoverage object representing the union of all given
     * BuildingCoverage objects, according to the following rules:
     * 
     * 1. If a building is marked as servicable by any building coverage, it is marked as servicable
     * 2. If a building is marked as unservicable by all building coverages, it is marked as unservicable.
     * 3. Otherwise, it is marked as unknown.
     * 
     * @param coverages Building Coverage object representing the union
     */
    static union(coverages: Array<BuildingCoverage>): BuildingCoverage {
        let union = new BuildingCoverage([]);
        coverages.forEach((coverage: BuildingCoverage) => {
            coverage.buildings.forEach(([building, status]: [Polygon, BuildingCoverageStatus], key: string) => {
                if (!union.buildings.has(key)) {
                    union.buildings.set(key, [building, status]);
                }
                else {
                    let result = union.buildings.get(key) as [Polygon, BuildingCoverageStatus];
                    let unionStatus = result[1];
                    let newStatus = BuildingCoverageStatus.UNKNOWN;
                    switch(unionStatus) {
                        case BuildingCoverageStatus.SERVICEABLE:
                            newStatus = BuildingCoverageStatus.SERVICEABLE;
                            break;
                        case BuildingCoverageStatus.UNSERVICEABLE:
                            // unserviceable + unservicable -> unservicable
                            // unserviceable + unknown -> unknown
                            // unservicaeable + serviceable -> serviceable
                            newStatus = status;
                            break;
                        case BuildingCoverageStatus.UNKNOWN:
                            newStatus = (status === BuildingCoverageStatus.SERVICEABLE) ? 
                                BuildingCoverageStatus.SERVICEABLE : BuildingCoverageStatus.UNKNOWN;
                            break;
                    }
                    union.buildings.set(key, [building, newStatus]);
                }
            });
        });
        return union;
    }
}

export const EMPTY_BUILDING_COVERAGE = new BuildingCoverage([]);