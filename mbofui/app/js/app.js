'use strict';
/* global angular */

var ocellus = angular.module( 'ocellus', [ 'ui-leaflet', 'ocellusFilters'] );

ocellus.run(function($rootScope) {
  $rootScope.server = '';
  $rootScope.currentView="Current";
    $rootScope.user = {};
    $rootScope.pollInterval = 15000;
    $rootScope.strings = {
      'app_name': 'Ocellus',
      'app_action':'Ocellize it',
      'app_categories':'Categories',
      'modal_title':'Event details',
      'modal_description':'Event description',
      'modal_starttime':'Start time',
      'modal_endtime':'End time',
      'modal_post':'Add Event'
    };
    $rootScope.event_categories = [
      {'label':'Study/Discussion'},
      {'label':'Course/Class'},
      {'label':'Practice/Rehearsal'},
      {'label':'Social Gathering'},
      {'label':'Business/Networking'},
      {'label':'Public Ceremony'},
      {'label':'Family'},
      {'label':'Sports'},
      {'label':'Political/Rally'}
    ];
    $rootScope.time_format = 'YYYY-MM-DDTHH:mm:ssZ';
    $rootScope.baselayers = {
      googleRoadmap: {
        name: 'Google Streets',
        layerType: 'ROADMAP',
        type: 'google',
        layerParams: {
          showOnSelector: true
        }
      },
      googleHybrid: {
        name: 'Google Hybrid',
        layerType: 'HYBRID',
        type: 'google'
      },
      googleTerrain: {
        name: 'Google Terrain',
        layerType: 'TERRAIN',
        type: 'google'
      },

      mapbox_light: {
        name: 'Mapbox Light',
        url: 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}',
        type: 'xyz',
        layerOptions: {
          id: 'gsilver.pk8alhme',
          accessToken: 'pk.eyJ1IjoiZ3NpbHZlciIsImEiOiJjaW1xYmxianowMGZsdXJra2FjbXhpYjE4In0.LL9yfFdOwvatCyCbxBDW_A',
        },
        layerParams: {
          showOnSelector: true
        }
      },
      osm: {
        name: 'OpenStreetMap',
        url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        type: 'xyz'
      },
      terrain: {
        name: 'Terrain',
        url: 'http://stamen-tiles-{s}.a.ssl.fastly.net/terrain-background/{z}/{x}/{y}.png',
        type: 'xyz',
      },
      osmh: {
        name: 'OpenStreetMap Hot',
        type: 'xyz',
        url: 'http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
      },
      esriwsm: {
        name: 'Esri World StreetMap',
        type: 'xyz',
        url: 'http://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
      },
      esrisatellite: {
        name: 'Esri Satellite',
        type: 'xyz',
        url: 'http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      }
    };
});
