from django.test import TestCase, Client


class TestHealthCheckEndpoint(TestCase):
    def test_healthcheck(self):
        client = Client()
        response = client.get('/')
        self.assertEqual(response.status_code, 301)


class TestHealthELBHealthCheck(TestCase):
    def test_healthcheck(self):
        client = Client()
        response = client.get('/elb-status/')
        self.assertIs(response.status_code, 200)
