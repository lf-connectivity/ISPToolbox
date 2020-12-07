from IspToolboxApp.consumers import MarketEvaluatorConsumer
from django.test import TestCase
from channels.testing import WebsocketCommunicator
from collections import Counter

sample_request = {
    "request_type": "standard_polygon",
    "include": {
        "coordinates": [
            [
                [
                    -122.20547665022926,
                    37.46172253164244
                ],
                [
                    -122.18532708489278,
                    37.461337135077855
                ],
                [
                    -122.19819367480616,
                    37.44996704289551
                ],
                [
                    -122.20547665022926,
                    37.46172253164244
                ]
            ]
        ],
        "type": "Polygon"
    },
    "uuid": "5ee3e557-a3a2-4f08-bd87-a4952e354c63"
}


class TestMarketEvalWebsocket(TestCase):
    '''
        Tests basic functionality of market-evaluator websocket, auth, and requests.
    '''
    async def setup_websocket(self):
        '''
            Helper method to connect to the websocket.
            Returns: WebsocketCommunicator
        '''
        communicator = WebsocketCommunicator(MarketEvaluatorConsumer.as_asgi(), "testws/market-evaluator/")
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        return communicator

    async def get_standard_polygon_response(self, request, expectedResponseCount):
        '''
            Helper method to get a single standard polygon response from websocket for given request.
        '''
        communicator = await self.setup_websocket()

        # Authenticate with the websocket
        await communicator.send_json_to({
            'credentials': 'default',
        })
        gotNothing = await communicator.receive_nothing(timeout=1)
        self.assertFalse(gotNothing)
        auth = await communicator.receive_json_from()
        self.assertTrue(auth['type'] == 'auth.token')
        self.assertTrue(len(auth['value']['token']) > 0)

        # Send the request
        await communicator.send_json_to(request)
        # Assert that we get some response within 5 seconds
        gotNothing = await communicator.receive_nothing(timeout=1)
        self.assertFalse(gotNothing)
        resps = []
        # Gather all responses
        while (len(resps) < expectedResponseCount):
            response = await communicator.receive_json_from()
            resps.append(response)
        # Assert that we get no other responses other than the 6 expected
        gotNothing = await communicator.receive_nothing(timeout=1)
        self.assertTrue(gotNothing)
        await communicator.disconnect()
        return resps

    async def test_expected_response_types(self):
        '''
            Requests standard polygon response from websocket.
            Expects to see exactly 6 response messages in any order:
                Service Providers,
                Median Speeds,
                Broadband Now,
                Median Income,
                Building Overlays (2x),
        '''
        expectedResponseTypes = {
            'service.providers': 1,
            'median.speeds': 1,
            'broadband.now': 1,
            'median.income': 1,
            'building.overlays': 2,
        }
        resps = await self.get_standard_polygon_response(sample_request, 6)
        actualResponseTypes = Counter([i['type'] for i in resps])
        self.assertTrue(actualResponseTypes == expectedResponseTypes)

    async def test_uuid_returned(self):
        '''
            Requests standard polygon response from websocket.
            Expects to see same uuid for each response.
        '''
        expectedUUID = sample_request['uuid']
        resps = await self.get_standard_polygon_response(sample_request, 6)
        for resp in resps:
            self.assertTrue(resp['uuid'] == expectedUUID)
