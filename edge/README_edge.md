# NodeJS Lambda Edge Software

### Purpose:

#### Viewer Request:
Lambda function called when URL hits edge servers. This should only be run on certain paths (e.g. viewshed/*.png). This allows us to prevent caching on viewshed results and restrict access based on an accesstoken. We can also use it to enable caching for public tilesets.

#### Origin Response:
Lambda function called when s3 returns response. We want to return an empty tile if it doesn't exist in S3. This lambda function checks for a 404 status code and returns a transparent tile if that's the case.

### How it works:

The lambda functions receives incoming `viewer requests` and checks for an `access_token` in the query string.

The `access_token` is a JSON web token (JWT). The JWT contains which tileset they are trying to access and an expiration date that is automatically checked by JWT libraries.

A valid JWT is one that was signed cryptographically with a secret that only the server knows. If the JWT is valid the request is forwarded to cloudfront and if the data exists, it is served to the client. Otherwise a 401 or 403 error is returned to the client.