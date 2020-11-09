from django.db import IntegrityError
from django.test import TestCase
from dataUpdate.models import Source
from datetime import date


class TestSource(TestCase):
    def setUp(self):
        Source.objects.create(
            source_id='MLAB',
            source_country='US',
            last_updated=date.fromisoformat('2020-11-06')
        )
        Source.objects.create(
            source_id='MLAB',
            source_country='CA',
            last_updated=date.fromisoformat('2020-11-06')
        )
        Source.objects.create(
            source_id='RDOF',
            source_country='US',
            last_updated=date.fromisoformat('2020-11-06')
        )

    def test_source_get(self):
        '''
            Tests basic fields of a Source object
        '''
        test_source = Source.objects.filter(source_id='MLAB', source_country='US').first()
        self.assertEqual(test_source.source_id, 'MLAB')
        self.assertEqual(test_source.source_country, 'US')
        self.assertEqual(test_source.last_updated.strftime("%b"), 'Nov')
        self.assertEqual(str(test_source.last_updated.year), '2020')

    def test_sources_same_id(self):
        '''
            Tests that a Source object can have the same ID as another source object
        '''
        test_sources = Source.objects.filter(source_id='MLAB')
        self.assertEqual(len(test_sources), 2)

    def test_sources_same_country(self):
        '''
            Tests that a Source object can have the same country as another source object
        '''
        test_sources = Source.objects.filter(source_country='US')
        self.assertEqual(len(test_sources), 2)

    def test_sources_id_country_unique(self):
        '''
            Tests that a Source object can not have both the same country AND same ID as another source object
        '''
        with self.assertRaises(IntegrityError):
            Source.objects.create(
                source_id='RDOF',
                source_country='US',
                last_updated=date.fromisoformat('2020-11-10')
            )
