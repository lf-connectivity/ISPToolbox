# Generated by Django 3.1.12 on 2021-08-04 23:16
# (c) Meta Platforms, Inc. and affiliates. Copyright

import django.contrib.gis.db.models.fields
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gis_data', '0004_triballands'),
    ]

    operations = [
        migrations.CreateModel(
            name='HrslUsa15',
            fields=[
                ('rid', models.AutoField(primary_key=True, serialize=False)),
                ('rast', django.contrib.gis.db.models.fields.RasterField(blank=True, null=True, srid=4326)),
            ],
            options={
                'db_table': 'hrsl_usa_1_5',
                'managed': False,
            },
        ),
    ]
