# Generated by Django 3.1.8 on 2021-04-20 22:52
# (c) Meta Platforms, Inc. and affiliates. Copyright

import IspToolboxApp.util.s3
from django.conf import settings
import django.contrib.gis.db.models.fields
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('mmwave', '0008_auto_20210420_2026'),
    ]

    operations = [
        migrations.AddField(
            model_name='dsmconversionjob',
            name='resolution',
            field=models.DecimalField(decimal_places=2, default=0.5, max_digits=5),
        ),
        migrations.CreateModel(
            name='ViewShedJob',
            fields=[
                ('uuid', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, unique=True)),
                ('observer', django.contrib.gis.db.models.fields.PointField(srid=4326)),
                ('observer_height', models.FloatField()),
                ('target_height', models.FloatField()),
                ('radius', models.FloatField()),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            bases=(models.Model, IspToolboxApp.util.s3.S3PublicExportMixin),
        ),
    ]
