# Generated by Django 3.1.12 on 2021-06-24 06:36
# (c) Meta Platforms, Inc. and affiliates. Copyright

from django.db import migrations, models
import mmwave.models.usgs_metadata_models
import storages.backends.s3boto3


class Migration(migrations.Migration):

    dependencies = [
        ('mmwave', '0016_auto_20210624_0613'),
    ]

    operations = [
        migrations.AlterField(
            model_name='lidardsmtilemodel',
            name='tile',
            field=models.FileField(storage=storages.backends.s3boto3.S3Boto3Storage(bucket_name='isptoolbox-export-file', location=''), upload_to=mmwave.models.usgs_metadata_models.LidarDSMTileModel.upload_to_path),
        ),
    ]
