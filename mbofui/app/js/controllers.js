'use strict';
/* global angular, ocellus, $, L, resolveCategory, resolveIcon, moment, validate, _ */

ocellus.controller('mapController', ['$scope', '$rootScope','$filter', '$timeout', '$log', 'leafletData', 'Bof', function($scope, $rootScope, $filter, $timeout, $log, leafletData, Bof) {
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

  $scope.categories = null;
  $scope.markers = [];
  $scope.markersAll = [];


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

  $('#postBof').on('click', function() {
    var coords = $('#bofModal').attr('data-coords').split(',');
    var url = '/api/events/';
    //set starttime/endtime to the value of the field in the format specified in the settings in app.js
    var startTime = moment($('#startTime').val()).format($rootScope.time_format);
    var endTime = moment($('#endTime').val()).format($rootScope.time_format);
    var postingTime = moment().format($rootScope.time_format);
    var category_key = $('#category option:selected').val();
    var category_text = $('#category option:selected').text();
    var category_object = JSON.stringify({'category_key':category_key, 'category_text':category_text});
    $log.info(category_object);
    var data = {
      "eventText": $scope.newEventText,
      "startTime": startTime,
      "endTime": endTime,
      "category":category_key,
      "latitude": coords[0],
      "longitude": coords[1],
      "altitudeMeters": 266.75274658203125, //this is being removed but the database still expects it
      "postingTime": postingTime
    };
    // use function in utils.js to see if the data validates
    var validationFailures = validate(data);
    //if there were no validation failures, post it
    // and construct a new marker to add to map
    if(!validationFailures.length) {
      Bof.PostBof(url, data).then(function(result) {
        var newMarker = {
          lat: result.data.latitude,
          lng: result.data.longitude,
          category: result.data.category,
          message: result.data.eventText,
          layer: 'events',
          icon: resolveIcon(result.data.category)
        };
        //add the event marker to both filtered and unfiltered collections
        $scope.markersAll.push(newMarker);
        $scope.markers.push(newMarker);
        $scope.totalBofs = $scope.totalBofs + 1;
        // close the popup
        leafletData.getMap().then(function(map) {
          map.closePopup();
        });
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


  $('#categories a').on('click', function(e) {
    var category = $(this).attr('id');
    if (category === 'all') {
      $scope.markers = $scope.markersAll;
    } else {
      $scope.markers = $scope.markersAll;
      $scope.markers = $filter('filter')($scope.markers, {
        category: category
      });
    }
  });

  var getEvents = function() {
    var bofsUrl = '/api/events/';
    Bof.GetBofs(bofsUrl).then(function(events) {
      for (var i = 0; i < events.length; i++) {
        var newMarker = {
          lat: parseFloat(events[i].lat),
          lng: parseFloat(events[i].lng),
          category: events[i].category,
          message: events[i].category + events[i].message,
          layer: 'events',
          icon: events[i].icon
        };

        $scope.markersAll.push(newMarker);
        $scope.markers.push(newMarker);
      }
    });
  };
  $scope.$watch("markers", function() {
    $scope.$watch('markerFilter', function(text) {
      $scope.markersFiltered = $filter('filter')($scope.markers, {
        message: text
      });
    });
  }, true);

  $scope.$on("leafletDirectiveMarker.dragend", function(event, args) {
    //removed Firebase save - leave this as placeholder
  });

  // clean up modal's form elems when modal closes
  $('#bofModal').on('hide.bs.modal', function () {
    $('.form-group').removeClass('has-error');
    $('#eventText, #startTime, #endTime').val('');
  });



  getEvents();

}]);
