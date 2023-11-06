// (c) Meta Platforms, Inc. and affiliates. Copyright
import { Polygon, Feature } from 'geojson';

export enum BuildingCoverageStatus {
    SERVICEABLE = 'serviceable',
    UNSERVICEABLE = 'unserviceable',
    UNKNOWN = 'unknown'
}

export function updateCoverageStatus(
    currentStatus: BuildingCoverageStatus,
    newStatus: BuildingCoverageStatus
): BuildingCoverageStatus {
    switch (currentStatus) {
        case BuildingCoverageStatus.SERVICEABLE:
            return BuildingCoverageStatus.SERVICEABLE;
        case BuildingCoverageStatus.UNSERVICEABLE:
            // unserviceable + unservicable -> unservicable
            // unserviceable + unknown -> unknown
            // unservicaeable + serviceable -> serviceable
            return newStatus;
        case BuildingCoverageStatus.UNKNOWN:
            return newStatus === BuildingCoverageStatus.SERVICEABLE
                ? BuildingCoverageStatus.SERVICEABLE
                : BuildingCoverageStatus.UNKNOWN;
    }
}

export class BuildingCoverage {
    private buildings: Map<number, [Feature<Polygon, any>, BuildingCoverageStatus]>;

    constructor(coverageResponse: Array<Feature<Polygon, any>>) {
        this.buildings = new Map();
        coverageResponse.forEach((feat: Feature<Polygon, any>) => {
            let key = feat.properties.msftid;
            let status = BuildingCoverageStatus.UNKNOWN;
            if (feat.properties.serviceable) {
                status = feat.properties.serviceable as BuildingCoverageStatus;
            }
            this.buildings.set(key, [feat, status]);
        });
    }

    getCoverageStatus(buildingId: number): BuildingCoverageStatus {
        if (this.buildings.has(buildingId)) {
            // @ts-ignore
            return this.buildings.get(buildingId)[1] as BuildingCoverageStatus;
        } else {
            return BuildingCoverageStatus.UNKNOWN;
        }
    }

    includes(buildingId: number): boolean {
        return this.getCoverageStatus(buildingId) !== BuildingCoverageStatus.UNKNOWN;
    }

    toFeatureArray(): Array<Feature<Polygon, any>> {
        let arr: Array<Feature<Polygon, any>> = [];
        this.buildings.forEach(
            ([building, status]: [Feature<Polygon, any>, BuildingCoverageStatus], id: number) => {
                arr.push(building);
            }
        );

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
            coverage.buildings.forEach(
                ([building, status]: [Feature<Polygon, any>, BuildingCoverageStatus], id: number) => {
                    if (!union.buildings.has(id)) {
                        union.buildings.set(id, [building, status]);
                    } else {
                        let result = union.buildings.get(id) as [Feature<Polygon, any>, BuildingCoverageStatus];
                        let unionStatus = result[1];
                        union.buildings.set(id, [
                            building,
                            updateCoverageStatus(unionStatus, status)
                        ]);
                    }
                }
            );
        });
        return union;
    }
}

export const EMPTY_BUILDING_COVERAGE = new BuildingCoverage([]);
