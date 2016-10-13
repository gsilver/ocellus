"""
Django settings for hacks_mbof project.

Generated by 'django-admin startproject' using Django 1.9.
For more information on this file, see

https://docs.djangoproject.com/en/1.9/topics/settings/
For the full list of settings and their values, see
https://docs.djangoproject.com/en/1.9/ref/settings/
"""

import os
from os import getenv
from os import path
import saml2

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.9/howto/static-files/
STATIC_ROOT = os.path.join(PROJECT_ROOT, 'staticfiles')
STATIC_URL = '/static/'

# Extra places for collectstatic to find static files.
STATICFILES_DIRS = (
    os.path.join(PROJECT_ROOT, 'static'),
)

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/1.9/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = getenv('DJANGO_SECRET_KEY', 'I need to be changed!')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = getenv('DJANGO_DEBUG', True)

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

ALLOWED_HOSTS = []


# Application definition

INSTALLED_APPS = [
    'mbof.apps.MbofConfig',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
]

REST_FRAMEWORK = {
    # Comment out DEFAULT_RENDER_CLASSES to view admin style API pages
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'DEFAULT_PERMISSION_CLASSES': ('rest_framework.permissions.IsAuthenticated',),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10
}

MIDDLEWARE_CLASSES = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    # FIXME: Disabled security for dev. only.  Needs to be enabled and support code added for prod. use.
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.auth.middleware.SessionAuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'hacks_mbof.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
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

WSGI_APPLICATION = 'hacks_mbof.wsgi.application'


# Database
# https://docs.djangoproject.com/en/1.9/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': getenv('DJANGO_DB_ENGINE', 'django.db.backends.sqlite3'),
        'NAME': getenv('DJANGO_DB_NAME', os.path.join(BASE_DIR, 'db.sqlite3')),
        'USER': getenv('DJANGO_DB_USER', ''),
        'PASSWORD': getenv('DJANGO_DB_PASSWORD', ''),
        'HOST': getenv('DJANGO_DB_HOST', ''),
        'PORT': getenv('DJANGO_DB_PORT', ''),
        'OPTIONS': {
            'charset': getenv('DJANGO_DB_CHARSET', None),
        },
    }
}


# Password validation
# https://docs.djangoproject.com/en/1.9/ref/settings/#auth-password-validators

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
# https://docs.djangoproject.com/en/1.9/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'America/Detroit'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.9/howto/static-files/

STATIC_URL = '/static/'

# Logging

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'all': {
            'format': ('%(levelname)s %(asctime)s %(module)s %(process)d '
                       '%(thread)d %(message)s'),
        },
        'debug': {
            'format': ('%(asctime)s %(levelname)s %(message)s '
                       '%(pathname)s:%(lineno)d'),
        },
        'simple': {
            'format': '%(levelname)s %(name)s %(message)s'
        },
        'ocellus_formatter': {
            'format': '%(levelname)s %(asctime)s %(module)s %(message)s',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'ocellus_handler': {
            'level': getenv('DJANGO_LOGGING_LEVEL', 'DEBUG'),
            'class': 'logging.handlers.TimedRotatingFileHandler',
            'formatter': 'ocellus_formatter',
            'filename': os.path.join(PROJECT_ROOT, 'logs/' + getenv('HOSTNAME', 'localhost') + '.log'),
            'when': 'midnight',
            'interval': 1,
            'backupCount': 60,
        },
    },
    'loggers': {
        '': {
            'handlers': ['ocellus_handler'],
            'level': getenv('DJANGO_LOGGING_LEVEL', 'DEBUG'),
        },
        'django.db.backends': {
            'level': getenv('DJANGO_LOGGING_LEVEL', 'INFO'),  # Set to DEBUG to log all SQL statements
            'handlers': ['console'],
        },
    },
}

#Shib

SAML2_URL_PATH = '/accounts/'
# modify to use port request comes
SAML2_URL_BASE = getenv('DJANGO_SAML2_URL_BASE', 'http://localhost:18000/accounts/')

INSTALLED_APPS += ('djangosaml2',)
AUTHENTICATION_BACKENDS = (
    'django.contrib.auth.backends.ModelBackend',
    'djangosaml2.backends.Saml2Backend',
)
LOGIN_URL = '%slogin/' % SAML2_URL_PATH
SESSION_EXPIRE_AT_BROWSER_CLOSE = True

BASEDIR = path.dirname(path.abspath(__file__))
SAML_CONFIG = {
  'xmlsec_binary': '/usr/bin/xmlsec1',
  'entityid': '%smetadata/' % SAML2_URL_BASE,

  # directory with attribute mapping
  # 'attribute_map_dir': path.join(BASEDIR, 'attribute-maps'),
  'name': 'Ocellus',
  # this block states what services we provide
  'service': {
      # we are just a lonely SP
      'sp': {
          'name': 'Ocellus',
          'name_id_format': ('urn:oasis:names:tc:SAML:2.0:'
                             'nameid-format:transient'),
          'authn_requests_signed': 'true',
          'allow_unsolicited': True,
          'endpoints': {
              # url and binding to the assetion consumer service view
              # do not change the binding or service name
              'assertion_consumer_service': [
                  ('%sacs/' % SAML2_URL_BASE, saml2.BINDING_HTTP_POST),
                  ],
              # url and binding to the single logout service view+

              # do not change the binding or service name
              'single_logout_service': [
                  ('%sls/' % SAML2_URL_BASE, saml2.BINDING_HTTP_REDIRECT),
                  ('%sls/post' % SAML2_URL_BASE, saml2.BINDING_HTTP_POST),
                  ],
              },

          # attributes that this project need to identify a user
          'required_attributes': ['uid'],

          # attributes that may be useful to have but not required
          'optional_attributes': ['eduPersonAffiliation'],
          },
      },

  # where the remote metadata is stored
  'metadata': {
      'local': [path.join(BASEDIR, 'saml/remote-metadata.xml')],
      },

  # set to 1 to output debugging information
  'debug': 1,

  # certificate
  'key_file': path.join(BASEDIR, 'saml/ocellus-saml.key'),  'cert_file': path.join(BASEDIR, 'saml/ocellus-saml.pem'),
  }

ACS_DEFAULT_REDIRECT_URL = getenv('DJANGO_ACS_DEFAULT_REDIRECT', 'http://localhost:18000/')
LOGIN_REDIRECT_URL = getenv('DJANGO_LOGIN_REDIRECT_URL', 'http://localhost:18000/')

SAML_CREATE_UNKNOWN_USER = True

SAML_ATTRIBUTE_MAPPING = {
    'uid': ('username', ),
    'mail': ('email', ),
    'givenName': ('first_name', ),
    'sn': ('last_name', ),
}
