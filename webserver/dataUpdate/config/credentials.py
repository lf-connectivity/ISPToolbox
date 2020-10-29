PROD_GIS_DB = {
    'NAME': 'postgres',
    'USER': 'fbcmasteruser',
    'HOST': 'isptoolbox-db-prod.cahmkzzberpf.us-west-1.rds.amazonaws.com',
    'PORT': '5432',
}

# Playground DB cloned from prod DB snapshot Oct 23.  Not guaranteed to be up to up to date with prod GIS db.
TEST_GIS_DB = {
    'NAME': 'postgres',
    'USER': 'fbcmasteruser',
    'HOST': 'dev-justin-db-oct-23.cahmkzzberpf.us-west-1.rds.amazonaws.com',
    'PORT': '5432',
}

CLIENT_EMAIL = {
    'EMAIL': 'isptoolboxmlab@gmail.com',
}

NOTIFY_EMAIL = 'achong@fb.com'
