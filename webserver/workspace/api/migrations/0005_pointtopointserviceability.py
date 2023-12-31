# Generated by Django 3.1.14 on 2022-04-08 21:51
# (c) Meta Platforms, Inc. and affiliates. Copyright

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('workspace', '0105_delete_pointtopointserviceability'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('api', '0004_auto_20220407_1157'),
    ]

    operations = [
        migrations.CreateModel(
            name='PointToPointServiceability',
            fields=[
                ('task_id', models.CharField(blank=True, default=None, help_text='Celery ID for the Task that was run', max_length=255, null=True, unique=True, verbose_name='Task ID')),
                ('uuid', models.UUIDField(default=uuid.uuid4, primary_key=True, serialize=False)),
                ('serviceable', models.CharField(choices=[('UNKNOWN', 'Unknown'), ('SERVICEABLE', 'Serviceable'), ('UNSERVICEABLE', 'Unserviceable')], default='UNKNOWN', max_length=20)),
                ('number_of_obstructions', models.PositiveIntegerField(blank=True, default=None, null=True)),
                ('owner', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
                ('ptp', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to='workspace.pointtopointlink')),
            ],
            options={
                'abstract': False,
            },
        ),
    ]
