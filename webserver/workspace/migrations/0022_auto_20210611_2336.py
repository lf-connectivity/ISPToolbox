# Generated by Django 3.1.10 on 2021-06-11 23:36

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workspace', '0021_auto_20210610_2227'),
    ]

    operations = [
        migrations.AlterField(
            model_name='workspacemapsession',
            name='name',
            field=models.CharField(default='untitled workspace', max_length=63),
        ),
    ]