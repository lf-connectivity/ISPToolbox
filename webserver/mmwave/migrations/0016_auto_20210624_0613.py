# Generated by Django 3.1.12 on 2021-06-24 06:13
# (c) Meta Platforms, Inc. and affiliates. Copyright

from django.db.migrations.operations.models import RenameModel
import IspToolboxApp.util.s3
from django.db import migrations, models
import django.db.models.deletion
import mmwave.models.usgs_metadata_models
import storages.backends.s3boto3


class Migration(migrations.Migration):

    dependencies = [
        ('mmwave', '0015_lidartilemodel_tile'),
    ]

    operations = [
        migrations.RenameModel('LidarTileModel', 'LidarDSMTileModel'),
    ]
