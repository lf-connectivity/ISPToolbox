from django.test import TestCase, Client

class TestHealthCheckEndpoint(TestCase):
    def test_healthcheck(self):
        client = Client()
        response = client.get('/')
        self.assertIs(response.status_code, 200)

class TestKMZEndpoints(TestCase):
    def test_kmz_endpoint(self):
        client = Client()
        response = client.post('/market-evaluator/kmz/')
        print(response)
        self.assertIs(response.status_code, 200)
        
