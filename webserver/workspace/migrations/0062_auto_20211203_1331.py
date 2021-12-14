# Generated by Django 3.1.13 on 2021-12-03 21:31

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('workspace', '0061_auto_20211203_1329'),
    ]

    operations = [
        migrations.AlterField(
            model_name='cpelocation',
            name='ap',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='workspace.accesspointlocation'),
        ),
        migrations.AlterField(
            model_name='cpelocation',
            name='sector',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='workspace.accesspointsector'),
        ),
    ]