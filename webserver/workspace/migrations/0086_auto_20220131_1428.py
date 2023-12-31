# Generated by Django 3.1.14 on 2022-01-31 22:28
# (c) Meta Platforms, Inc. and affiliates. Copyright

from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('workspace', '0085_cloudrfasynctaskmodel'),
    ]

    operations = [
        migrations.AddField(
            model_name='viewshed',
            name='task_id',
            field=models.CharField(blank=True, default=None, help_text='Celery ID for the Task that was run', max_length=255, null=True, unique=True, verbose_name='Task ID'),
        ),
        migrations.AlterField(
            model_name='viewshed',
            name='uuid',
            field=models.UUIDField(default=uuid.uuid4, primary_key=True, serialize=False),
        ),
    ]
