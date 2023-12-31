# Generated by Django 3.1.12 on 2021-06-30 22:14
# (c) Meta Platforms, Inc. and affiliates. Copyright

from django.conf import settings
import django.contrib.gis.db.models.fields
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('sessions', '0001_initial'),
        ('workspace', '0028_auto_20210630_2152'),
    ]

    operations = [
        migrations.CreateModel(
            name='MultipolygonCoverageArea',
            fields=[
                ('uneditable', models.BooleanField(default=False)),
                ('uuid', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('last_updated', models.DateTimeField(auto_now=True)),
                ('geojson', django.contrib.gis.db.models.fields.MultiPolygonField(srid=4326)),
                ('map_session', models.ForeignKey(db_column='session', default=None, null=True, on_delete=django.db.models.deletion.CASCADE, to='workspace.workspacemapsession')),
                ('owner', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
                ('session', models.ForeignKey(db_column='django_session', help_text='This is a django session - different than map session', null=True, on_delete=django.db.models.deletion.SET_NULL, to='sessions.session')),
            ],
            options={
                'abstract': False,
            },
        ),
    ]
