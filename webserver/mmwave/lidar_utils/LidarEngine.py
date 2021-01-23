import re
from mmwave.models import EPTLidarPointCloud
from mmwave.lidar_utils.pdal_templates import getLidarPointsAroundLink
from enum import IntEnum
from django.contrib.gis.geos import MultiLineString, LineString, Point
from geopy.distance import distance as geopy_distance
from geopy.distance import lonlat
import logging
import numpy as np


class LidarResolution(IntEnum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    ULTRA = 4


LIDAR_RESOLUTION_DEFAULTS = {
    LidarResolution.LOW: 10,
    LidarResolution.MEDIUM: 5,
    LidarResolution.HIGH: 1,
    LidarResolution.ULTRA: 0.5
}

LIDAR_RESOLUTION_MAX_LINK_LENGTH = {
    LidarResolution.LOW: 100000,
    LidarResolution.MEDIUM: 50000,
    LidarResolution.HIGH: 2000,
    LidarResolution.ULTRA: 1000,
}

DEFAULT_BB_BUFFER = 3


class LidarEngine:
    """
    A class to run LiDAR Queries using PDAL

    ...

    Attributes
    ----------
    link : LineString
        GEOS LineString used to represent the area we are interested in querying
    Methods
    -------
    TODO: write documentation lol
    """
    def __init__(self, link, resolution, num_samples):
        self.link = link
        self.link.srid = 4326
        self.resolution = resolution
        self.num_samples = num_samples
        # TODO: all clouds must have same SRS
        self.link_T = self.link.transform(3857, clone=True)
        self.segments = self.__getRelevantPointClouds()
        self.lidar_profile = self.__calculateLidarProfileMultiPointCloud()

    def getUrls(self):
        return [cloud.url for gc, cloud in self.segments]

    def getSources(self):
        return [cloud.name for gc, cloud in self.segments]

    def getProfile(self):
        return self.lidar_profile

    def getBoundingBox(self):
        height_bounds = (min(self.lidar_profile), max(self.lidar_profile))
        return self.link_T.extent + height_bounds

    def getTxLidarCoord(self):
        return self.link_T[0]

    def getRxLidarCoord(self):
        return self.link_T[1]

    def getSegmentProfile(self, link, cloud, resolution):
        return []

    def combineResultingProfiles(self):
        """
        """
        return []

    def __selectLatestProfile(self, clouds):
        pattern_year = re.compile(r'2[0-9][0-9][0-9]')
        """
        Returns the most recent lidar dataset
        """
        # Search for year in URL data
        years = [[int(yr) for yr in pattern_year.findall(cloud.url)] for cloud in clouds]
        max_years = [max(year) if len(year) > 0 else 0 for year in years]
        return clouds[max_years.index(max(max_years))]

    def __calculateLinkDistance(self, link=None):
        if link is None:
            link = self.link
        return geopy_distance(lonlat(link[0][0], link[0][1]), lonlat(link[1][0], link[1][1])).meters

    def __helperSortingFunction(self, profile):
        geometry, _ = profile
        return Point(self.link[0]).distance(geometry)

    def __calculateLidarProfileMultiPointCloud(self):
        """
        Uses all segments that have point clouds and combines the results of these segments into a single profile
        """
        total_link_dist = self.__calculateLinkDistance()
        profiles = []
        for geometry, cloud in self.segments:
            if isinstance(geometry, LineString):
                num_samples = int(self.__calculateLinkDistance(geometry) / total_link_dist * self.num_samples)
                try:
                    profile = self.__getProfileForLinkCloud(geometry, cloud, num_samples)
                    profiles.append((geometry, profile))
                except Exception as e:
                    logging.error(f'failed to get profile for link {geometry.json}')
                    logging.error(str(e))
                    profile = [float('nan')] * num_samples
                    profiles.append((geometry, profile))

            elif isinstance(geometry, MultiLineString):
                for line in geometry:
                    num_samples = int(self.__calculateLinkDistance(line) / total_link_dist * self.num_samples)
                    try:
                        profile = self.__getProfileForLinkCloud(line, cloud, num_samples)
                        profiles.append((line, profile))
                    except Exception as e:
                        logging.error(f'failed to get profile for link {geometry.json}')
                        logging.error(str(e))
                        profile = [float('nan')] * num_samples
                        profiles.append((line, profile))

            else:
                logging.error(f'LidarEngine: Geometry - not linestring or multistring: {geometry.json}')
        # Combine Profiles into single profile
        profiles = sorted(profiles, key=self.__helperSortingFunction)
        combined_profile = [hgt for geometry, subprofile in profiles for hgt in subprofile]
        # Convert NaN to closest value
        data = np.asarray(combined_profile)
        mask = np.isnan(data)
        if np.all(mask):
            return [0] * self.num_samples
        else:
            data[mask] = np.interp(np.flatnonzero(mask), np.flatnonzero(~mask), data[~mask])
            return data.tolist()

    def __getProfileForLinkCloud(self, link, cloud, num_samples=None):
        if num_samples is None:
            num_samples = self.num_samples
        lidar_profile, _, _, _ = getLidarPointsAroundLink(
            cloud.url, link, cloud.srs, resolution=self.resolution, num_samples=num_samples)
        return lidar_profile

    def __calculateLidarProfileSinglePC(self):
        """
        Returns a list of lidar points between tx and rx and number of points between the two

        Tuple: (List, Int, String)

        """
        # Combine samples, maintain spaces where there is no lidar data
        query = (
            EPTLidarPointCloud.objects.filter(
                high_resolution_boundary__isnull=True,
                boundary__intersects=self.link
            ) |
            EPTLidarPointCloud.objects.filter(
                high_resolution_boundary__isnull=False,
                high_resolution_boundary__intersects=self.link
            )
        )
        pt_clouds = query.all()
        if len(pt_clouds) == 0:
            raise Exception('Lidar data not available')

        cloud = self.__selectLatestProfile(pt_clouds)

        profile = self.__getProfileForLinkCloud(self.link, cloud, self.num_samples)
        return profile

    def __pointCloudNameSortingFunction(self, cloud):
        pattern_year = re.compile(r'2[0-9][0-9][0-9]')
        years = [int(yr) for yr in pattern_year.findall(cloud.url)]
        return max(years) if len(years) > 0 else 0

    def __getRelevantPointClouds(self):
        """
        Use the LineString between tx and rx to determine which point clouds to compose the link of
        """
        query = (
            EPTLidarPointCloud.objects.filter(
                high_resolution_boundary__isnull=True,
                boundary__intersects=self.link
            ) |
            EPTLidarPointCloud.objects.filter(
                high_resolution_boundary__isnull=False,
                high_resolution_boundary__intersects=self.link
            )
        )
        pt_clouds = query.all()
        sorted_pt_clouds = sorted(pt_clouds, key=self.__pointCloudNameSortingFunction, reverse=True)

        segments = []

        remaining_segments = [self.link]
        for cloud in sorted_pt_clouds:
            segment = remaining_segments.pop()
            boundary = cloud.high_resolution_boundary
            if boundary is None:
                boundary = cloud.boundary
            geometry = segment.intersection(boundary)
            if geometry.dims > 0:
                segments.append((geometry, cloud))
            remaining_segments.append(segment.difference(boundary))

        return segments
