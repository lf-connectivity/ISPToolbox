"""
Django settings for webserver project.

Generated by 'django-admin startproject' using Django 3.0.8.

For more information on this file, see
https://docs.djangoproject.com/en/3.0/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/3.0/ref/settings/
"""

import os

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/3.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
ALLOWED_HOSTS = ['.facebook.com', '.isptoolbox.io', '.fbctower.com']

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False
if "DEBUG" in os.environ and os.environ.get("DEBUG").lower() == 'true':
    DEBUG = True
    ALLOWED_HOSTS = ['*']

PROD = False
if "PROD" in os.environ and os.environ.get("PROD").lower() != 'false':
    PROD = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    # Static Files S3
    AWS_DEFAULT_ACL = 'public-read'
    AWS_STORAGE_BUCKET_NAME = 'isptoolbox-static'
    AWS_S3_OBJECT_PARAMETERS = {
        'CacheControl': 'max-age=86400',
    }
    AWS_LOCATION = 'static'
    AWS_CLOUDFRONT_DOMAIN = 'static.isptoolbox.io'
    AWS_S3_CUSTOM_DOMAIN = AWS_CLOUDFRONT_DOMAIN
    STATICFILES_STORAGE = 'isptoolbox_storage.storage.S3ManifestStorage'

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/3.0/howto/static-files/
STATIC_URL = '/static/'


# Application definition
INSTALLED_APPS = [
    # Async / Websockets
    'channels',
    # Django
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.gis',
    'corsheaders',
    # ISP Toolbox Apps
    'IspToolboxApp',
    'mmwave',
    'Overlay',
    'NetworkComparison',
    'cms',
    'dataUpdate',
    'isptoolbox_storage',
    'workspace',
    # S3 Static File Storage
    'storages',
    # Social Auth
    'django.contrib.sites',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.facebook',
    # REST API
    'rest_framework',
    # Wagtail CMS
    'wagtail.contrib.forms',
    'wagtail.contrib.redirects',
    'wagtail.embeds',
    'wagtail.sites',
    'wagtail.users',
    'wagtail.snippets',
    'wagtail.documents',
    'wagtail.images',
    'wagtail.search',
    'wagtail.admin',
    'wagtail.core',
    'django.contrib.humanize',
    'modelcluster',
    'taggit',
]

STATIC_ROOT = os.path.join(BASE_DIR, 'static_collect')
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static/potree/build/'),
    os.path.join(BASE_DIR, 'static/potree/libs/'),
    os.path.join(BASE_DIR, 'static/isptoolbox/build/')
]

MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
MEDIA_URL = '/media/'

WAGTAIL_SITE_NAME = 'Help Center'

CSP_EXCLUDE_URL_PREFIXES = ('cms/', 'pages/',)

REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': ('rest_framework.permissions.DjangoModelPermissions',),
    'PAGINATE_BY': 10
}

SITE_ID = 2
if 'POSTGRES_DB' in os.environ:
    SITE_ID = 3

AUTHENTICATION_BACKENDS = (
    'allauth.account.auth_backends.AuthenticationBackend',
    'django.contrib.auth.backends.ModelBackend',
)

LOGIN_REDIRECT_URL = "/pro"
ACCOUNT_LOGOUT_REDIRECT_URL = "/pro"

# facebook
SOCIALACCOUNT_PROVIDERS = {
    'facebook': {
        'METHOD': 'js_sdk',
        'SDK_URL': '//connect.facebook.net/en_US/sdk.js',
        'SCOPE': ['email', 'public_profile'],
        'AUTH_PARAMS': {'auth_type': 'reauthenticate'},
        'INIT_PARAMS': {'cookie': True},
        'FIELDS': [
            'id',
            'email',
            'name',
            'first_name',
            'last_name',
            'verified',
            'locale',
            'timezone',
            'link',
            'gender',
            'updated_time',
        ],
        'EXCHANGE_TOKEN': True,
        'VERIFIED_EMAIL': False,
        'VERSION': 'v8.0',
    }
}

MAPBOX_ACCESS_TOKEN_PUBLIC = 'pk.eyJ1IjoiaXNwdG9vbGJveCIsImEiOiJja2p5eHd1aGcwMjhoMm5wcGkxdnl4N2htIn0.cLO8vp0k2kXclp4CNzwWhQ'

MIDDLEWARE = [
    'IspToolboxApp.middleware.HealthCheckMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # Wagtail CMS
    'wagtail.contrib.redirects.middleware.RedirectMiddleware',
]

CSP_INCLUDE_NONCE_IN = [
    'default-src',
    'script-src',
    'style-src',
]

CORS_ORIGIN_REGEX_WHITELIST = [
    r"^https://(.+\.)?facebook\.com$",
]

ROOT_URLCONF = 'webserver.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'webserver.wsgi.application'
# Channels
ASGI_APPLICATION = 'webserver.asgi.application'
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [os.environ.get('REDIS_BACKEND', 'redis://localhost:6379')],
        },
    },
}


# Database
# https://docs.djangoproject.com/en/3.0/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': os.environ.get('DB_NAME', 'django_test'),
        'USER': os.environ.get('DB_USERNAME', 'postgres'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'password'),
        'HOST': os.environ.get('POSTGRES_DB', 'localhost'),
        # for migrations : POSTGRES_DB=isptoolbox-db-prod.cahmkzzberpf.us-west-1.rds.amazonaws.com
        'PORT': '5432',
    },
    # This DB is not managed by Django ORM, therefore we hardcode parameters
    # Contains static GIS data: microsoft buildings dataset, income data, fcc broadband availablility
    'gis_data': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': 'postgres',
        'USER': 'fbcmasteruser',
        'HOST': 'isptoolbox-db-prod.cahmkzzberpf.us-west-1.rds.amazonaws.com',
        'PORT': '5432',
    }
}


# Password validation
# https://docs.djangoproject.com/en/3.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/3.0/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True


CELERY_BROKER_URL = os.environ.get('REDIS_BACKEND', 'redis://localhost:6379')
CELERY_RESULT_BACKEND = os.environ.get('REDIS_BACKEND', 'redis://localhost:6379')
CELERY_ACCEPT_CONTENT = ['application/json']
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TASK_SERIALIZER = 'json'
CELERY_TIMEZONE = 'America/Los_Angeles'
