# Generated by Django 3.1.8 on 2021-05-12 17:44

import django.contrib.gis.db.models.fields
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gis_data', '0002_tl2019uscounty_tl2019uszcta510'),
    ]

    operations = [
        migrations.CreateModel(
            name='Tl2020UsCensusBlocks',
            fields=[
                ('gid', models.AutoField(primary_key=True, serialize=False)),
                ('statefp20', models.CharField(blank=True, max_length=2, null=True)),
                ('countyfp20', models.CharField(blank=True, max_length=3, null=True)),
                ('tractce20', models.CharField(blank=True, max_length=6, null=True)),
                ('blockce20', models.CharField(blank=True, max_length=4, null=True)),
                ('geoid20', models.CharField(blank=True, max_length=15, null=True)),
                ('name20', models.CharField(blank=True, max_length=10, null=True)),
                ('mtfcc20', models.CharField(blank=True, max_length=5, null=True)),
                ('ur20', models.CharField(blank=True, max_length=1, null=True)),
                ('uace20', models.CharField(blank=True, max_length=5, null=True)),
                ('uatype20', models.CharField(blank=True, max_length=1, null=True)),
                ('funcstat20', models.CharField(blank=True, max_length=1, null=True)),
                ('aland20', models.FloatField(blank=True, null=True)),
                ('awater20', models.FloatField(blank=True, null=True)),
                ('intptlat20', models.CharField(blank=True, max_length=11, null=True)),
                ('intptlon20', models.CharField(blank=True, max_length=12, null=True)),
                ('geom', django.contrib.gis.db.models.fields.MultiPolygonField(blank=True, null=True, srid=4326)),
            ],
            options={
                'db_table': 'tl_2020_us_census_blocks',
                'managed': False,
            },
        ),
    ]