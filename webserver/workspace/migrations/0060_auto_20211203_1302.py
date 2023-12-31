# Generated by Django 3.1.13 on 2021-12-03 21:02
# (c) Meta Platforms, Inc. and affiliates. Copyright

from django.conf import settings
import django.contrib.gis.db.models.fields
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('sessions', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('workspace', '0059_auto_20211118_1017'),
    ]

    operations = [
        migrations.AlterField(
            model_name='accesspointlocation',
            name='default_cpe_height',
            field=models.FloatField(default=1, validators=[django.core.validators.MinValueValidator(0.1, message='Ensure this value is greater than or equal to %(limit_value)s m.'), django.core.validators.MaxValueValidator(1000, message='Ensure this value is less than or equal to %(limit_value)s. m')]),
        ),
        migrations.AlterField(
            model_name='accesspointlocation',
            name='max_radius',
            field=models.FloatField(default=2, validators=[django.core.validators.MinValueValidator(0.1, message='Ensure this value is greater than or equal to %(limit_value)s km.'), django.core.validators.MaxValueValidator(16, message='Ensure this value is less than or equal to %(limit_value)s. km')]),
        ),
        migrations.AlterField(
            model_name='cpelocation',
            name='height',
            field=models.FloatField(help_text='\n        This height value is relative to the terrain in meters. When object is first created the height field\n        is taken from the AP "default_cpe_height", it is then converted to DTM height. The following\n        saves are all relative to terrain.\n        ', validators=[django.core.validators.MinValueValidator(0.1), django.core.validators.MaxValueValidator(1000)]),
        ),
        migrations.AlterField(
            model_name='pointtopointlink',
            name='frequency',
            field=models.FloatField(default=2.437, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)]),
        ),
        migrations.CreateModel(
            name='AccessPointSector',
            fields=[
                ('uuid', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('last_updated', models.DateTimeField(auto_now=True)),
                ('name', models.CharField(default='Unnamed AP Sector', max_length=50)),
                ('heading', models.FloatField(validators=[django.core.validators.MinValueValidator(0, message='Ensure this value is greater than or equal to %(limit_value)s degrees.'), django.core.validators.MaxValueValidator(360, message='Ensure this value is less than or equal to %(limit_value)s degrees.')])),
                ('azimuth', models.FloatField(validators=[django.core.validators.MinValueValidator(0, message='Ensure this value is greater than or equal to %(limit_value)s degrees.'), django.core.validators.MaxValueValidator(360, message='Ensure this value is less than or equal to %(limit_value)s degrees.')])),
                ('height', models.FloatField(default=30, validators=[django.core.validators.MinValueValidator(0.1, message='Ensure this value is greater than or equal to %(limit_value)s m.'), django.core.validators.MaxValueValidator(1000, message='Ensure this value is less than or equal to %(limit_value)s. m')])),
                ('distance', models.FloatField(default=2, validators=[django.core.validators.MinValueValidator(0.1, message='Ensure this value is greater than or equal to %(limit_value)s km.'), django.core.validators.MaxValueValidator(16, message='Ensure this value is less than or equal to %(limit_value)s. km')])),
                ('default_cpe_height', models.FloatField(default=1, validators=[django.core.validators.MinValueValidator(0.1, message='Ensure this value is greater than or equal to %(limit_value)s m.'), django.core.validators.MaxValueValidator(1000, message='Ensure this value is less than or equal to %(limit_value)s. m')])),
                ('uneditable', models.BooleanField(default=True)),
                ('frequency', models.FloatField(default=2.437, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)])),
                ('cloudrf_coverage_geojson', django.contrib.gis.db.models.fields.GeometryCollectionField(null=True, srid=4326)),
                ('ap', models.ForeignKey(editable=False, on_delete=django.db.models.deletion.CASCADE, to='workspace.accesspointlocation')),
                ('map_session', models.ForeignKey(db_column='session', default=None, null=True, on_delete=django.db.models.deletion.CASCADE, to='workspace.workspacemapsession')),
                ('owner', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
                ('session', models.ForeignKey(db_column='django_session', help_text='This is a django session - different than map session', null=True, on_delete=django.db.models.deletion.SET_NULL, to='sessions.session')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AddField(
            model_name='cpelocation',
            name='sector',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='workspace.accesspointsector'),
        ),
    ]
