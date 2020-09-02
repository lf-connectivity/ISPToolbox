from django.db import models
import uuid
import secrets
import datetime
import pytz
from django.contrib.gis.db import models as gis_models
from IspToolboxApp.Tasks.MarketEvaluatorHelpers import getQueryTemplate
from django.db import connections

def createTokenDefault():
    return secrets.token_urlsafe(32)

class ServiceProvider(models.Model):
    logrecno = models.IntegerField(primary_key=True)
    techcode = models.IntegerField(blank=True, null=True)
    maxaddown = models.FloatField(blank=True, null=True)
    maxadup = models.FloatField(blank=True, null=True)
    providername = models.CharField(max_length=255, blank=True, null=True)

class MarketEvaluatorPipeline(models.Model):
    uuid = models.UUIDField(primary_key=True, default = uuid.uuid4, editable=False)
    task = models.CharField(max_length=100, db_index=True, blank=True, null=True)
    token = models.CharField(max_length=50,  default=createTokenDefault, editable=False)

    created = models.DateTimeField(auto_now_add=True)
    include_geojson = gis_models.GeometryField()
    exclude_geojson = gis_models.GeometryField(null=True, blank=True)
    
    # Metadata
    incomeServiceProvidersAvailable = models.BooleanField(default=True)

    # Building Outputs
    buildingPrecomputed = models.BooleanField(default=True)
    buildingPolygons = gis_models.GeometryCollectionField(blank=True, null=True)
    buildingCount = models.BigIntegerField(default=0)
    buildingCompleted = models.DateTimeField(blank=True, null=True)
    buildingError = models.CharField(max_length=100, blank=True, null=True)

    # Income Outputs
    averageMedianIncome = models.FloatField(default=0)
    incomeComplete = models.DateTimeField(blank=True, null=True)
    incomeError = models.CharField(max_length=100, blank=True, null=True)

    #Service Provider Outputs
    serviceProvidersLogRecNos = models.ManyToManyField(ServiceProvider)
    serviceProviderComplete = models.DateTimeField(blank=True, null=True)
    serviceProviderError = models.CharField(max_length=100, blank=True, null=True)

    # Overall Pipeline
    completed = models.DateTimeField(blank=True, null=True)
    error = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        ordering = ('created', )

    def genMarketEvaluatorIncome(self):
        include = self.include_geojson
        exclude = self.exclude_geojson
        offset = 0

        precomputedAvailable = self.buildingPrecomputed
        query_skeleton = income_skeleton_simple
        if precomputedAvailable:
            query_skeleton = income_skeleton
        else:
            exclude = None
    
        try:
            query_skeleton = getQueryTemplate(query_skeleton, exclude != None, False)
            while True:
                with connections['gis_data'].cursor() as cursor:
                    query_arguments = [include.json, exclude.json] if exclude != None else [include.json]
                    if precomputedAvailable:
                        query_arguments.append(offset)
                    cursor.execute(query_skeleton, query_arguments)
                    results = cursor.fetchone()
                    if precomputedAvailable:
                        num_buildings = float(results[2])
                        if num_buildings > 0:
                            averageMedianIncomeSelection = float(results[0])
                            self.averageMedianIncome = (self.averageMedianIncome * offset + averageMedianIncomeSelection * num_buildings) / ( offset + num_buildings)
                            self.save(update_fields = ['averageMedianIncome'])
                            offset += num_buildings
                        else:
                            break
                    else:
                        self.averageMedianIncome = results[0]
                        self.save(update_fields=['averageMedianIncome'])
                        break
        except:
            self.averageMedianIncome = 0.0
            self.save(update_fields=['averageMedianIncome'])
    
    def genServiceProviders(self, offset):
        include = self.include_geojson
        exclude = self.exclude_geojson

        query_skeleton = getQueryTemplate(provider_skeleton, exclude != None, False)
        with connections['gis_data'].cursor() as cursor:
            cursor.execute(query_skeleton, [include.json, exclude.json, offset] if exclude != None else [include.json, offset])
            rows = [row for row in cursor.fetchall()]
            competitors = [row[0] for row in rows]
            maxdown = [row[1] for row in rows]
            maxup = [row[2] for row in rows]
            tech = [row[3] for row in rows]
            resp = {'error': 0, 'competitors': competitors,
                    "down_ad_speed": maxdown, "up_ad_speed": maxup, "tech_used": tech}
            return resp

    def genBroadbandNow(self):
        include = self.include_geojson
        with connections['gis_data'].cursor() as cursor:
            a = broadbandnow_skeleton.format(include.json)
            cursor.execute(broadbandnow_skeleton, [include.json])
            column_names = cursor.description
            rows = [row for row in cursor.fetchall()]
            return {col.name : [row[idx] for row in rows]  for idx, col in enumerate(column_names)}

    def isAccessAuthorized(self, request):
        return request.META['HTTP_AUTHORIZATION'].replace('Token ', '') == self.token and ((datetime.datetime.utcnow().replace(tzinfo=pytz.utc) - self.created).total_seconds() < 604800)


broadbandnow_skeleton = """
SELECT * FROM
    (
        SELECT geoid FROM tl_2019_us_county  WHERE St_intersects(geog, St_geomfromgeojson(%s))
    ) as intersect_county
    JOIN broadband_data_bbn
        ON "COUNTY ID" = CAST(geoid AS numeric)
;
"""

income_skeleton = """
SELECT Avg(avgbuildingvalues.avgincome2018building) AS avgincome2018, 
	Avg(avgbuildingvalues.avgerror2018building)  AS avgerror2018, COUNT(*) as numbuildings
FROM   (SELECT unnested_intersecting_footprints.gid, 
			Avg(tract.income2018) AS avgincome2018building, 
			Avg(tract.error2018)  AS avgerror2018building 
	 FROM   (SELECT intersecting_footprints.*, 
					Unnest(microsoftfootprint2tracts.tractgids) AS tractgid 
			 FROM   (SELECT * 
					 FROM   microsoftfootprints 
					 WHERE  {}
					 LIMIT  10001 OFFSET %s) AS intersecting_footprints 
					LEFT JOIN microsoftfootprint2tracts 
						   ON intersecting_footprints.gid = 
							  microsoftfootprint2tracts.footprintgid) AS 
			unnested_intersecting_footprints 
			LEFT JOIN tract 
				   ON tract.gid = unnested_intersecting_footprints.tractgid 
	 GROUP  BY unnested_intersecting_footprints.gid) AS avgbuildingvalues;
"""

income_skeleton_simple = """
SELECT AVG(median_household_income) AS avgincome2018
FROM acs2018_median_income
JOIN tl_2019_tract ON acs2018_median_income.geoid = tl_2019_tract.geoid WHERE {};
"""

provider_skeleton = """
SELECT providername, 
	Max(maxaddown)               AS maxdown, 
	Max(maxadup)                 AS maxadup, 
	Array_agg(DISTINCT techcode) AS tech 
FROM   form477jun2019 
	JOIN tl_2019_blocks_census 
	  ON tl_2019_blocks_census.geoid10 = form477jun2019.blockcode 
WHERE  {}
	AND consumer > 0
GROUP  BY providername 
ORDER  BY maxdown DESC 
LIMIT  3 OFFSET %s;
"""