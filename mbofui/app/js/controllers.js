/*jshint strict:false */
/* global angular, ocellus, $, L,  resolveIcon, moment, validate, _, popupLink, checkTimeSlice */

ocellus.controller('mapController', ['$compile', '$scope', '$rootScope','$filter', '$timeout', '$log', 'leafletData', 'Bof' , function($compile, $scope, $rootScope, $filter, $timeout, $log, leafletData, Bof) {
  // setting up init values
  // get user
  Bof.GetUser('/api/me/').then(function(userResult) {
    $rootScope.user = userResult;
    // only function inmediately invoked - get current events on page load,
    // it fires after we have a user so that we can determine
    // which belong to the current user
    getEvents('/api/events/current/');
    $rootScope.currentViewUrl = '/api/events/current/';
  });


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
    layers: {
      baselayers: $rootScope.baselayers,
      overlays: {
        events: {
          name: "Events",
          type: "markercluster",
          visible: true
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

  $scope.eventEditPost = function (){

  };


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
      category = $scope.selected_category;
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
      // status field is not available in the end point/db at this point
      //'status':'active',
      'postingTime': postingTime
    };

    // hide previous validation alerts
    $('#bofModal .alert-inline').hide();
    $('.form-group').removeClass('has-error');
    // use function in utils.js to see if the data validates
    var validationFailures = validate(data);
    //if there were no validation failures, post it
    // and construct a new marker to add to map
    if(!validationFailures.length) {
      Bof.PostBof(url, data).then(function(result) {
        // examine event and return a message to the user if
        // the event's timeframe is the NOT current view's timeframe
        $scope.alert = checkTimeSlice(result.data.startTime, result.data.endTime, $rootScope.currentViewUrl);
        $timeout(function () { $scope.alert = false; }, 3000);
        // reload events
        getEvents($rootScope.currentViewUrl);
        // close the popup
        leafletData.getMap().then(function(map) {
          map.closePopup();
        });
        // clear the form controls in the modal
        $('#eventText, #newStartTime, #newEndTime, #address').val('');
        $('#bofModal').modal('hide');
      });
    } else {
      // there were validation failures, add an 'has-error' class to
      // the offending element's parent
      _.each(validationFailures, function(failure){
         $('.' + failure).addClass('has-error').show();
      });
    }
  });

  $scope.filter_category = function(key){
    if (key === 'all') {
      // set marker to unfiltered list
      $scope.markers = $scope.markersAll;
      $scope.textEvents = $scope.textEventsAll;
    } else {
      // use a filter to only show the selected category
      $scope.markers = $filter('filter')($scope.markersAll, {
        category: key
      });
      $scope.textEvents = $filter('filter')($scope.textEventsAll, {
        category: key
      });
    }


  };

  // get events
  var getEvents = function(url) {
    $scope.markersAll = [];
    $scope.markers = [];
    $scope.textEvents = [];
    $scope.textEventsAll =[];
    var bofsUrl = url;
    // use a promise factory to do request
    Bof.GetBofs(bofsUrl).then(function(eventsList) {
      $scope.textEventsAll = eventsList;
      $scope.textEvents = eventsList;
      $rootScope.events=eventsList;
      // wish there was a better way to display a collection
      // TODO: align property names (db, json response and marker definition) so that we are not doing so much reformating
      for (var i = 0; i < eventsList.length; i++) {
        var newMarker = {
          lat: parseFloat(eventsList[i].lat),
          lng: parseFloat(eventsList[i].lng),
          url: eventsList[i].url,
          category: eventsList[i].category,
          messageSearch: eventsList[i].category + ' ' + eventsList[i].message,
          messagePlain: eventsList[i].message,
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
    $scope.selected_category ='';
    $scope.newEventText =undefined;
    $('#bofModal .alert-inline').hide();
    $('.form-group').removeClass('has-error');
    $('#eventText, #startTime, #endTime, #address').val('');
  });

    // handler for modal opening
  $('#bofModal').on('show.bs.modal', function () {
    reinitTimeFields();
  });

  $scope.showMyEvents = function () {
    $rootScope.currentView= 'My Events';
    $('#myEventsModal').modal({});
  };

  $scope.switchViews = function (url, title) {
    $rootScope.currentView= title;
    $rootScope.currentViewUrl = url;
    getEvents(url);
  };

  $(document).on('click','.editEvent',function(e) {
    console.log('am edt');
    var event = JSON.parse($(this).attr('data-event'));
    var thisEvent = _.findWhere($rootScope.events, {url: event.url});
    // the event is stale (it has expired while user was looking at it)
    if(moment(event.endTime).isBefore()){
      //remove the event
      $scope.removeEvent(event);
      // alert the user that event expired
      $scope.alert={'type':'alert-danger','message':'Sorry - event has finished and you can no longer edit it.'};
      // hide alert after 3 seconds
      $timeout(function () { $scope.alert = false; }, 3000);
      //remove popup
      leafletData.getMap().then(function(map) {
        map.closePopup();
      });
    }
    else {
      //populate the bofModalEdit modal and show it
      thisEvent.startTime = new Date(thisEvent.startTime);
      thisEvent.endTime = new Date(thisEvent.endTime);
      $('#bofModalEdit #startTimeEdit').val(moment(thisEvent.startTime).format('YYYY-M-DThh:mm'));
      $('#bofModalEdit #endTimeEdit').val(moment(thisEvent.endTime).format('YYYY-M-DThh:mm'));
      $('#bofModalEdit #eventTextEdit').val(thisEvent.message);
      $scope.editEvent = thisEvent;
      $('#bofModalEdit').modal('show');
      // close the popup
      leafletData.getMap().then(function(map) {
        map.closePopup();
      });
    }
  });

  $scope.removeEvent = function(event){
    // get position of this event in the 3 collections
    var thisEvent = _.findWhere($rootScope.events, {url: event.url});
    var thisEventPos = $rootScope.events.indexOf(_.findWhere($rootScope.events, {url: event.url}));
    var thisEventPosMF = $scope.markersFiltered.indexOf(_.findWhere($rootScope.events, {url: event.url}));
    var thisEventPosM = $scope.markersAll.indexOf(_.findWhere($rootScope.events, {url: event.url}));
    // remove the event from the three collections
    $rootScope.events.splice(thisEventPos, 1);
    $scope.markersFiltered.splice(thisEventPosMF, 1);
    $scope.markersAll.splice(thisEventPosM, 1);
  };

  $scope.eventEditCancel = function(){
    $scope.editEvent.status = 'cancelled';
    $scope.removeEvent($scope.editEvent);
    $scope.eventEditPost();

  };

  // handler for event edit PUT
  $scope.eventEditPost = function (){
    // use the editEvent model for the data for this PUT
    // only wrinkle is the time
    var startTimeP = $('#bofModalEdit #startTimeEdit').val();
    if (startTimeP ==='') {
      startTimeP = $scope.editEvent.startTime;
    }
    var endTimeP = $('#bofModalEdit #endTimeEdit').val();
    if (endTimeP ==='') {
      endTimeP = $scope.editEvent.endTime;
    }
    var data = {
      'eventText': $scope.editEvent.message,
      'startTime': startTimeP,
      'endTime': endTimeP,
      'latitude': $scope.editEvent.lat,
      'longitude': $scope.editEvent.lng,
      'category':$scope.editEvent.category,
      // status field is not available in the end point/db at this point
      //'status':$scope.editEvent.status,
      'altitudeMeters': 266.75274658203125, //placeholder - we will be using altitude
      'postingTime':  moment().format($rootScope.time_format)
    };
    Bof.PutBof($scope.editEvent.url, data).then(function(result) {
      // examine event and return a message to the user if
      // the event's timeframe is NOT the current view's timeframe
      $scope.alert = checkTimeSlice(result.data.startTime, result.data.endTime, $rootScope.currentViewUrl);
      $timeout(function () { $scope.alert = false; }, 3000);
      //reload events
      getEvents($rootScope.currentViewUrl);
      // clear the form controls in the modal and then hide it
      $('#eventTextEdit, #newStartTimeEdit, #newEndTimeEdit').val('');
      $('#bofModalEdit').modal('hide');
    });
  };

  $scope.lookUpAddress = function(mode){
    var coords = $('#bofModal').attr('data-coords').split(',');
    var addressUrl ='';
    if (mode==="google") {
      addressUrl='https://maps.googleapis.com/maps/api/geocode/json?latlng=' + $('#bofModal').attr('data-coords').split(',').join(',') + '&key=AIzaSyCW4R3mnwONsDfsZWfdSXDlnUtqKOoI50k';
    }
    else {
      addressUrl ='https://nominatim.openstreetmap.org/reverse?format=xml&lat=' + coords[0] + '&lon=' + coords[1] + '&zoom=18&addressdetails=1';
    }
    Bof.GetAddress(addressUrl).then(function(result) {
      if (mode==="google") {
        //google parsing
        $('#address').val(result.data.results[0].formatted_address);
      }
      else {
        //openstreet parsing
        $('#address').val($(result.data).find("result")[0].innerText);
      }
    });
  };
}]);
