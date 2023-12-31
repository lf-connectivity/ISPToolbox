# Generated by Django 3.1.8 on 2021-04-26 18:51
# (c) Meta Platforms, Inc. and affiliates. Copyright

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mmwave', '0009_auto_20210420_2252'),
    ]

    operations = [
        migrations.AddField(
            model_name='eptlidarpointcloud',
            name='noisy_data',
            field=models.BooleanField(default=False, help_text='\n            dataset is noisy and requires outlier filtering for it to be usable\n        '),
        ),
    ]
