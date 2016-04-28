'use strict';
/* global angular, ocellus, $, L, resolveCategory, resolveIcon, moment, validate, _, popupLink */

ocellus.controller('mapController', ['$scope', '$rootScope','$filter', '$timeout', '$log', 'leafletData', 'Bof', function($scope, $rootScope, $filter, $timeout, $log, leafletData, Bof) {

  // setting up init values
  // setting the category filter to none
  $scope.categories = null;
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
    //get coords from data-coords attr of the modal
    var coords = $('#bofModal').attr('data-coords').split(',');
    var url = '/api/messages/';
    //set starttime/endtime to the value of the field in the format specified in the settings in app.js
    var startTime = moment($('#startTime').val()).format($rootScope.time_format);
    var endTime = moment($('#endTime').val()).format($rootScope.time_format);
    var postingTime = moment().format($rootScope.time_format);
    // construct the object that is going to be submitted
    var data = {
      "messageText": $scope.newMessageText,
      "startTime": startTime,
      "endTime": endTime,
      "latitude": coords[0],
      "longitude": coords[1],
      //TODO: need to work on getting altitude
      "altitudeMeters": 266.75274658203125,
      "postingTime": postingTime
    };
    // use function in utils.js to see if the data validates
    var validationFailures = validate(data);
    //if there were no validation failures, post it
    // and construct a new marker to add to map based on values returned by the servlet
    if(!validationFailures.length) {
      Bof.PostBof(url, data).then(function(result) {
        var newMarker = {
          lat: result.data.latitude,
          lng: result.data.longitude,
          category: 'cat1',
          message: result.data.messageText,
          layer: 'events',
          icon: {
            type: 'awesomeMarker',
            icon: 'record',
            markerColor: 'blue'
          }
        };
        // add the message marker to both filtered and unfiltered collections
        // TODO: puzzle this out - maybe just add to unfiltered
        $scope.markersAll.push(newMarker);
        $scope.markers.push(newMarker);
        $scope.totalBofs = $scope.totalBofs + 1;
        // close the popup
        leafletData.getMap().then(function(map) {
          map.closePopup();
        });
        // clear the form controls in the modal
        $('#messageText, #newStartTime, #newEndTime').val('');
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

  // handles category filtering
  $('#categories a').on('click', function(e) {
    // use the id of the link
    // TODO: this needs to change - will need to have categories that will not validate as ids (spaces, etc.)
    var category = $(this).attr('id');
    if (category === 'all') {
      // set marker to unfiltered list
      $scope.markers = $scope.markersAll;
    } else {
      // reset to unfiltered list (voids previous filters)
      $scope.markers = $scope.markersAll;
      // use a filter to only show the selected category
      $scope.markers = $filter('filter')($scope.markers, {
        category: category
      });
    }
  });

  // get events
  // TODO: needs to change to get only current
  var getEvents = function() {
    var bofsUrl = '/api/messages/';
    // use a promise factory to do request
    Bof.GetBofs(bofsUrl).then(function(events) {
      // whish there was a better way
      // TODO: align property names (db, json response and marker definition) so that we are not doing so much reformating
      for (var i = 0; i < events.length; i++) {
        var newMarker = {
          lat: parseFloat(events[i].lat),
          lng: parseFloat(events[i].lng),
          category: events[i].category,
          message: events[i].category + '<br> ' + events[i].message,
          layer: 'events',
          icon: events[i].icon
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
        message: text
      });
    });
  }, true);

  // placeholder for now - one of the requirements
  // involves changing the location of the marker
  // this listens for the end of a marker drag and we can use it to set
  // the events new location
  $scope.$on("leafletDirectiveMarker.dragend", function(event, args) {
    //removed Firebase save - leave this as placeholder
  });

  // clean up modal's form elems when modal closes
  $('#bofModal').on('hide.bs.modal', function () {
    $('.form-group').removeClass('has-error');
    $('#messageText, #startTime, #endTime').val('');
  });

  getEvents();

}]);
