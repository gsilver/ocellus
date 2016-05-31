'use strict';
/* global angular, ocellus, $, L,  resolveIcon, moment, validate, _, popupLink */

ocellus.controller('mapController', ['$compile', '$scope', '$rootScope','$filter', '$timeout', '$log', 'leafletData', 'Bof' , function($compile, $scope, $rootScope, $filter, $timeout, $log, leafletData, Bof) {
  // setting up init values
  // setting the markers to an empty array
  // markers array represents the filtered events
  // markersAll represents the prefiltered events
  $scope.markers = [];
  $scope.markersAll = [];

  // map configuration object by object:
  // center: zoom level and autoDiscover(set to user location)
  // TODO: need to deal with users/devices that refuse to share location
  // events: initial event object
  // controls: added (but not enabled: draw)
  // layers: get baselayers (tiling options) from app.js, set overlays and draw options
  // awesomeMarkerIcon: set a default. We will be setting different color/icons based on type of event later on
  angular.extend($scope, {
    center: {
      zoom: 16,
      autoDiscover: true
    },
    events: {},
    controls: {
      draw: {}
    },
    layers: {
      baselayers: $rootScope.baselayers,
      overlays: {
        events: {
          name: "Events",
          type: "markercluster",
          visible: true
        },
        draw: {
          name: 'draw',
          type: 'group',
          visible: true,
          layerParams: {
            showOnSelector: false
          }
        }
      },
      awesomeMarkerIcon: {
        type: 'awesomeMarker',
        markerColor: 'blue'
      },
    }
  });
$scope.myEvents = leafletize([{
    "url": "http://localhost:18000/api/events/103/",
    "eventText": "now",
    "latitude": 42.273339529351894,
    "longitude": -83.74736309051514,
    "altitudeMeters": 266.75274658203125,
    "owner": "http://localhost:18000/api/users/bjensen/",
    "postingTime": "2016-05-23T17:16:31.721732Z",
    "startTime": "2016-01-01T06:00:00Z",
    "endTime": "2016-12-31T17:59:00Z",
    "hashtag": null,
    "votes": 0,
    "category": "Course/Class"
  }, {
    "url": "http://localhost:18000/api/events/105/",
    "eventText": "qwsqwsqws",
    "latitude": 42.27246626192837,
    "longitude": -83.75167608261108,
    "altitudeMeters": 266.75274658203125,
    "owner": "http://localhost:18000/api/users/bjensen/",
    "postingTime": "2016-05-23T17:18:04.183616Z",
    "startTime": "2016-05-24T05:00:00Z",
    "endTime": "2016-12-31T17:59:00Z",
    "hashtag": null,
    "votes": 0,
    "category": "Public Ceremony"
  }, {
    "url": "http://localhost:18000/api/events/108/",
    "eventText": "qwdqwdqwd",
    "latitude": 42.2708943500754,
    "longitude": -83.74656915664673,
    "altitudeMeters": 266.75274658203125,
    "owner": "http://localhost:18000/api/users/bjensen/",
    "postingTime": "2016-05-24T14:31:32.577580Z",
    "startTime": "2016-05-24T14:31:00Z",
    "endTime": "2016-05-29T02:00:00Z",
    "hashtag": null,
    "votes": 0,
    "category": "Business/Networking"
  }, {
    "url": "http://localhost:18000/api/events/109/",
    "eventText": "qwqwd",
    "latitude": 42.2697137,
    "longitude": -83.7470777,
    "altitudeMeters": 266.75274658203125,
    "owner": "http://localhost:18000/api/users/bjensen/",
    "postingTime": "2016-05-24T14:35:21.766263Z",
    "startTime": "2016-05-24T18:00:00Z",
    "endTime": "2016-05-25T18:00:00Z",
    "hashtag": null,
    "votes": 0,
    "category": "Practice/Rehearsal"
  }]
);
  // displays a popup invitation on current location regardless of where the map viewport is at
  // viewport will shift to center on user current location and open a popup invitation
  $scope.createEventCurrentlocation = function() {
    leafletData.getMap().then(function(map) {
      map.locate({
        setView: true,
        maxZoom: 16
      });

      function onLocationFound(e) {
        var radius = e.accuracy / 2;
        $('#bofModal').attr('data-coords', [e.latlng.lat, e.latlng.lng]);
        L.popup()
          .setLatLng(e.latlng)
          .setContent(popupLink)
          .openOn(map);
      }
      map.on('locationfound', onLocationFound);
    });
  };

  // handles tap and hold on mobile and control-click on other devices
  // opens a popup invitation and passess the modal the lat and long
  $scope.$on("leafletDirectiveMap.contextmenu", function(event, args) {
    leafletData.getMap().then(function(map) {
      var leafEvent = args.leafletEvent;
      $('#bofModal').attr('data-coords', [leafEvent.latlng.lat, leafEvent.latlng.lng]);
      L.popup()
        .setLatLng(leafEvent.latlng)
        .setContent(popupLink)
        .openOn(map);
    });
  });

  // handles click on "Add Event" button on modal
  $('#postBof').on('click', function() {
    // handles click on "Add Event" button on modal
    var coords = $('#bofModal').attr('data-coords').split(',');
    var url = '/api/events/';
    //set starttime/endtime to the value of the field in the format specified in the settings in app.js
    var startTime = moment($('#startTime').val()).format($rootScope.time_format);
    var endTime = moment($('#endTime').val()).format($rootScope.time_format);
    var postingTime = moment().format($rootScope.time_format);
    var category;
    if ($scope.selected_category) {
      category = $scope.selected_category.label;
    }
    else {
      category='No Category';
    }
    var data = {
      'eventText': $scope.newEventText,
      'startTime': startTime,
      'endTime': endTime,
      'latitude': coords[0],
      'category':category,
      'longitude': coords[1],
      'altitudeMeters': 266.75274658203125, //placeholder - we will be using altitude
      'postingTime': postingTime
    };
    // use function in utils.js to see if the data validates
    var validationFailures = validate(data);
    //if there were no validation failures, post it
    // and construct a new marker to add to map
    if(!validationFailures.length) {

      Bof.PostBof(url, data).then(function(result) {
        $rootScope.newEvent = result.data;
        $rootScope.newEvent.messageSearch = result.data.category + ' ' + result.data.eventText;
        $rootScope.newEvent.message = result.data.eventText;
        var newMarker = {
          lat: result.data.latitude,
          lng: result.data.longitude,
          category: result.data.category,
          message:"<popup event=newEvent></popup>",
          layer: 'events',
          icon: Bof.resolveIcon(result.data.category)
        };

        //add the event marker to both filtered and unfiltered collections
        // TODO: puzzle this out - maybe just add to unfiltered
        $scope.markersAll.push(newMarker);
        $scope.markers.push(newMarker);
        $scope.totalBofs = $scope.totalBofs + 1;
        // close the popup
        leafletData.getMap().then(function(map) {
          map.closePopup();
        });
        // clear the form controls in the modal
        $('#eventText, #newStartTime, #newEndTime').val('');
        $('#bofModal').modal('hide');
      });
    } else {
      // there were validation failures, add an 'has-error' class to
      // the offending element's parent
      _.each(validationFailures, function(failure){
        $('.' + failure).addClass('has-error');
      });
    }
  });

  $scope.filter_category = function(key){
    if (key === 'all') {
      // set marker to unfiltered list
      $scope.markers = $scope.markersAll;
    } else {
      // use a filter to only show the selected category
      $scope.markers = $filter('filter')($scope.markersAll, {
        category: key
      });
    }


  };

  // get events
  // TODO: needs to change to get only current
  var getEvents = function(url) {
    $scope.markersAll = [];
    $scope.markers = [];
    var bofsUrl = url;
    // use a promise factory to do request
    Bof.GetBofs(bofsUrl).then(function(eventsList) {
      $rootScope.events= eventsList;
      // wish there was a better way to display a collection
      // TODO: align property names (db, json response and marker definition) so that we are not doing so much reformating
      for (var i = 0; i < eventsList.length; i++) {
        var newMarker = {
          lat: parseFloat(eventsList[i].lat),
          lng: parseFloat(eventsList[i].lng),
          category: eventsList[i].category,
          messageSearch: eventsList[i].category + ' ' + eventsList[i].message,
          message: "<popup event='events[" + i + "]'></popup>",
          //message:dateDisplayD,
          layer: 'events',
          icon: Bof.resolveIcon(eventsList[i].category)
        };
        $scope.markersAll.push(newMarker);
        $scope.markers.push(newMarker);
      }
    });
  };

  // watch on changes to marker (event) collection and text input so that only events with
  // the searched for text appear
  $scope.$watch("markers", function() {
    $scope.$watch('markerFilter', function(text) {
      $scope.markersFiltered = $filter('filter')($scope.markers, {
        messageSearch: text
      });
    });
  }, true);

  // placeholder for now - one of the requirements
  // involves changing the location of the marker
  // this listens for the end of a marker drag and we can use it to set
  // the events new location
  $scope.$on("leafletDirectiveMarker.dragend", function(event, args) {
    // update event with new coords
  });

  // clean up modal's form elems when modal closes
  $('#bofModal').on('hide.bs.modal', function () {
    $log.info('dismissing modal');
    $scope.selected_category ='';
    $rootScope.currentView = 'Current';
    getEvents('/api/events/current/');
    $('.form-group').removeClass('has-error');
    $('#eventText, #startTime, #endTime').val('');
  });
  // reset data and view to /current on myevents modal dismiss
  $('#myEventsModal').on('hide.bs.modal', function () {
    $rootScope.currentView = 'Current';
    getEvents('/api/events/current/');
  });



  getEvents('/api/events/current/');

  $scope.showMyEvents = function () {
    $rootScope.currentView= 'My Events';
    $('#myEventsModal').modal({});
  };

  $scope.switchViews = function (url, title) {
    $rootScope.currentView= title;
    getEvents(url);
  };

}]);
