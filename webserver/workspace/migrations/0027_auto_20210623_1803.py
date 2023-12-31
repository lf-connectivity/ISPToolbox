# Generated by Django 3.1.12 on 2021-06-23 18:03
# (c) Meta Platforms, Inc. and affiliates. Copyright

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('sessions', '0001_initial'),
        ('workspace', '0026_auto_20210623_1729'),
    ]

    operations = [
        migrations.AddField(
            model_name='accesspointbasedcoveragearea',
            name='session',
            field=models.ForeignKey(db_column='django_session', help_text='This is a django session - different than map session', null=True, on_delete=django.db.models.deletion.SET_NULL, to='sessions.session'),
        ),
        migrations.AddField(
            model_name='accesspointlocation',
            name='session',
            field=models.ForeignKey(db_column='django_session', help_text='This is a django session - different than map session', null=True, on_delete=django.db.models.deletion.SET_NULL, to='sessions.session'),
        ),
        migrations.AddField(
            model_name='aptocpelink',
            name='session',
            field=models.ForeignKey(db_column='django_session', help_text='This is a django session - different than map session', null=True, on_delete=django.db.models.deletion.SET_NULL, to='sessions.session'),
        ),
        migrations.AddField(
            model_name='coveragearea',
            name='session',
            field=models.ForeignKey(db_column='django_session', help_text='This is a django session - different than map session', null=True, on_delete=django.db.models.deletion.SET_NULL, to='sessions.session'),
        ),
        migrations.AddField(
            model_name='cpelocation',
            name='session',
            field=models.ForeignKey(db_column='django_session', help_text='This is a django session - different than map session', null=True, on_delete=django.db.models.deletion.SET_NULL, to='sessions.session'),
        ),
    ]
