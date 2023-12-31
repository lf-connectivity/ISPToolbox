# Generated by Django 3.1.1 on 2021-03-23 04:02
# (c) Meta Platforms, Inc. and affiliates. Copyright

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workspace', '0003_auto_20210309_1705'),
    ]

    operations = [
        migrations.AlterField(
            model_name='accesspointlocation',
            name='default_cpe_height',
            field=models.FloatField(default=2),
        ),
        migrations.AlterField(
            model_name='accesspointlocation',
            name='no_check_radius',
            field=models.FloatField(default=0.01),
        ),
    ]
