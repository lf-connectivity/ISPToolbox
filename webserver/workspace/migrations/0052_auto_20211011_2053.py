# Generated by Django 3.1.13 on 2021-10-12 03:53
# (c) Meta Platforms, Inc. and affiliates. Copyright

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workspace', '0051_analyticsevent_created_at'),
    ]

    operations = [
        migrations.AlterField(
            model_name='analyticsevent',
            name='created_at',
            field=models.CharField(default=1634010810.5403647, max_length=255),
        ),
    ]
