/*jshint strict:false */
/* global angular, ocellus, $, L,  resolveIcon, moment, validate, _, popupLink, checkTimeSlice */

ocellus.controller('mapController', ['$compile', '$scope', '$rootScope','$filter', '$timeout', '$log', '$location', '$window', 'leafletData', 'Bof', function($compile, $scope, $rootScope, $filter, $timeout, $log, $location, $window, leafletData, Bof) {
  // ping Google geolocation, if over quota fall back to openstreet
  Bof.GetAddress('https://maps.googleapis.com/maps/api/geocode/json?latlng=42.2698111,-83.74706599999999').then(function(result) {
    if(result.status ==='OVER_QUERY_LIMIT'){
      $rootScope.currentMapAPI ='openstreet';
    }
  });
  // find out if user is authenticated - temporary
  Bof.LoggedIn('/api/').then(function(loggedInResult) {
    if (loggedInResult.status===403){
      // set a variable to lockand hide elements of the UI
      $rootScope.loggedin=false;
    } else {
      // set a variable to unlock/show elements of the UI
      $rootScope.loggedin=true;
      // it fires after we have a user so that we can determine
      // which belong to the current user - temporary
      $rootScope.currentView = $location.search().currentView;

      if ($rootScope.currentView) {
        getEvents('/api/events/' + $rootScope.currentView + '/');
        $rootScope.currentViewUrl = '/api/events/' + $rootScope.currentView + '/';
      }
      else {
        $rootScope.currentView = 'current';
        $rootScope.currentViewUrl = '/api/events/' + $rootScope.currentView + '/';
        getEvents('/api/events/' + $rootScope.currentView + '/');
      }
    }
  });

  // this variable will be true if user is in the text only view
  if($('#text_only').length){
    $scope.textOnly = true;
  }

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
    minZoom: 2,
    maxZoom: 4,
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
  $scope.createEventCurrentlocation = function(origin) {
    if(origin ==='text'){
      navigator.geolocation.getCurrentPosition(function(position) {
        $('#bofModal').attr('data-coords', [position.coords.latitude, position.coords.longitude]);
        $('#bofModal').modal('show');
      });
    }
    else {
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
    }
  };


  // handles tap and hold on mobile and control-click on other devices
  // opens a popup invitation and passess the modal the lat and long
  $scope.$on("leafletDirectiveMap.contextmenu", function(event, args) {
    if($rootScope.loggedin) {
      leafletData.getMap().then(function(map) {
        var leafEvent = args.leafletEvent;
        $('#bofModal').attr('data-coords', [leafEvent.latlng.lat, leafEvent.latlng.lng]);
        L.popup()
          .setLatLng(leafEvent.latlng)
          .setContent(popupLink)
          .openOn(map);
      });
    }
  });

  // handles click on "Add Event" button on modal
  $scope.postEvent = function() {
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
      'title':  $scope.newEventTitle,
      'startTime': startTime,
      'address':$scope.newEventAddress,
      'hashtag':$scope.newEventHashtag,
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
        $scope.newEventText ='';
        $scope.newEventTitle ='';
        // examine event and return a message to the user if
        // the event's timeframe is the NOT current view's timeframe
        $scope.alert = checkTimeSlice(result.data.startTime, result.data.endTime, $rootScope.currentViewUrl);
        $timeout(function () { $scope.alert = false; }, 5000);
        // reload events
        getEvents($rootScope.currentViewUrl);
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
      $scope.validationFailuresCreate = true;
      _.each(validationFailures, function(failure){
         $('.' + failure).addClass('has-error').show();
      });
    }
  };

  $scope.filter_category = function(key){
    if (key === 'All Events') {
      // set marker to unfiltered list
      $scope.markers = $scope.markersAll;
      // note: on text only
      if($scope.textOnly) {
        $scope.textEvents = $scope.textEventsAll;
      }
    } else {
      $scope.selectedCategory = key;
      // use a filter to only show the selected category
      $scope.markers = $filter('filter')($scope.markersAll, {
        category: key
      });
      // note: on text only
      if($scope.textOnly) {
        $scope.textEvents = $filter('filter')($scope.textEventsAll, {
          category: key
        });
      }
    }
    $rootScope.category=key;
    $rootScope.alert=true;
    $rootScope.alert={'type':'alert-info','message':'Showing ' + key};
    $timeout(function () {
       $rootScope.alert = false;
     }, 2000);
  };


  // get events
  var getEvents = function(url) {
    $scope.markersAll = [];
    $scope.markers = [];
    // note: only text only
    if($scope.textOnly) {
      $scope.textEvents = [];
      $scope.textEventsAll =[];
    }

    var bofsUrl = url;
    // use a promise factory to do request
    Bof.GetBofs(bofsUrl).then(function(eventsList) {
      Bof.GetIntentions($rootScope.urls.intentions + '?username=self').then(function(intentionsList) {
        $scope.intentions=intentionsList;
        if($scope.textOnly) {
          // use intentionIncluded function to add to each event whatever intention is germane
          var intentionsAdded = intentionIncluded(eventsList, $scope.intentions);
          $scope.textEventsAll = intentionsAdded;
          $scope.textEvents = intentionsAdded;
        }
      });
      // note: only for the text - only
      $rootScope.events=eventsList;


      // wish there was a better way to display a collection
      // TODO: align property names (db, json response and marker definition) so that we are not doing so much reformating
      for (var i = 0; i < eventsList.length; i++) {
        var newMarker = {
          lat: parseFloat(eventsList[i].lat),
          lng: parseFloat(eventsList[i].lng),
          url: eventsList[i].url,
          category: eventsList[i].category,
          title: eventsList[i].title,
          messageSearch: eventsList[i].category + ' ' + eventsList[i].message + ' ' +eventsList[i].title,
          message: "<popup event='events[" + i + "]'></popup>",
          layer: 'events',
          icon: Bof.resolveIcon(eventsList[i].category)
        };
        $scope.markersAll.push(newMarker);
        $scope.markers.push(newMarker);
      }
    });
  };
(function(){
  //if the marker dissapears from view (because of a change
  // of orientation in a small device), correlate popup dissapears as well.

  $('.detector:visible').each(function() {
    //examines the visibility of 4 bootstrapped
    // reponsive utility classed spans (lg, md, sm, xs)
    // and sets $rootScope.vp to the one that is visible
    $rootScope.vp = $( this ).attr('id');
  });
  //if the variable says it is a small viewport
  // change the popup options to avoid popup dissapearing
  if($rootScope.vp === 'vp_xs'){
    leafletData.getMap().then(function(map) {
      map.on('popupopen', function(e) {
        var marker = e.popup._source;
        e.popup.options.maxWidth=230;
        e.popup.options.autoPan=false;
      });
    });
  }
})();

  // watch for alerts produced by XHR errors and close any modal that may be open
  $scope.$watch("alert", function(text) {
    $timeout(function() {
      if($rootScope.alert){
        $('#bofModal').modal('hide');
        $('#bofModalEdit').modal('hide');
        $('#coordsLookUpModal').modal('hide');
      }
    });
  });


  // watch on changes to marker (event) collection and text input so that only events with
  // the searched for text appear
  $scope.$watch("markers", function() {
    $scope.$watch('markerFilter', function(text) {
      $scope.markersFiltered = $filter('filter')($scope.markers, {
        messageSearch: text
      });
    });
  }, true);


  // watch on changes to text only view  collection and text input so that only events with
  // the searched for text appear
  $scope.$watch("textEventsAll", function() {
    $scope.$watch('textEventsFilter', function(text) {
      $scope.textEvents = $filter('filter')($scope.textEventsAll, {
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
    leafletData.getMap().then(function(map) {
      map.closePopup();
    });
    $scope.selected_category ='';
    $scope.newEventText =undefined;
    $scope.newEventTitle =undefined;
    $scope.addressDirty = false;
    $scope.newEventAddress=undefined;
    $scope.newEventHashtag= undefined;
    $('#bofModal .alert-inline').hide();
    $scope.validationFailuresCreate = false;
    $('.form-group').removeClass('has-error');
    $('#eventText, #startTime, #endTime').val('');
  });

  $('#bofModalEdit').on('hide.bs.modal', function () {
    $scope.editEvent = null;
    leafletData.getMap().then(function(map) {
      map.closePopup();
    });
  });

    // handler for modal opening
  $('#bofModal').on('show.bs.modal', function () {
    $scope.lookUpAddress($rootScope.currentMapAPI);
    leafletData.getMap().then(function(map) {
      map.closePopup();
    });
    reinitTimeFields();
  });

  $scope.showMyEvents = function () {
    $rootScope.currentView= 'My Events';
    $('#myEventsModal').modal({});
  };

  $scope.switchModes = function (mode) {
    if(mode ==='text') {
      $window.location='/text-only.html' + '?currentView=' + $rootScope.currentView;
    }
    else {
      $window.location='/index.html'  + '?currentView=' + $rootScope.currentView;
    }
  };

  $scope.switchViews = function (url, title, hash) {
    $rootScope.category = 'All Events';
    $rootScope.currentView= title;
    $rootScope.currentViewUrl = url;
    $location.search({'currentView':$rootScope.currentView});
    getEvents(url);
  };

  //DOM event listener for editing an intention. Launches an Angular function
  $(document).on('click','.declareIntentPut', function(e){
    var thisEvent  =  _.findWhere($scope.textEventsAll, {url: $(this).attr('data-event')});
    if($(this).attr('data-intention')==='declinedConfirm') {
      $timeout(function () { thisEvent.confirmDeclined = true;}, 0);
    } else {
    if($scope.textOnly) {
      $timeout(function () { thisEvent.confirmDeclined = false;}, 0);
    }
     $scope.intendPut($(this).attr('data-intention'), $(this).attr('data-event'),$(this).attr('data-respondent'), $(this).attr('data-intention-url')  );
    }
  });
  //DOM event listener for creating an intention. Launches an Angular function
  $(document).on('click','.declareIntentPost', function(e){
    $scope.intendPost($(this).attr('data-intention'), $(this).attr('data-event'));
  });

  // PUT an intention
  $scope.intendPut = function (intention, targetEvent, respondent, intentionUrl) {
    //data to send to endpoint
    data = {
      'intention': intention,
      'event': targetEvent,
      'respondent': respondent
    };
    $scope.putIntention(intentionUrl, data);
  };

  $scope.putIntention  = function(intentionUrl, data){
    // use factory to handle the PUT
    Bof.IntendPut(intentionUrl, data).then(function(result) {
      //close popup
      leafletData.getMap().then(function(map) {
        map.closePopup();
      });

      Bof.GetBof(data.event).then(function(result) {
        var listToUpdate ='';
        var eventPos;
        if($scope.textOnly){
          eventPos = _.findIndex($scope.textEventsAll , {url: data.event});
          listToUpdate = $scope.textEventsAll;
        }
        else {
          eventPos= _.findIndex($rootScope.events, {url: data.event});
          listToUpdate = $rootScope.events;
        }
        listToUpdate[eventPos].maybe=result.data.maybe;
        listToUpdate[eventPos].definitely=result.data.definitely;
        listToUpdate[eventPos].guests=result.data.guests;
      });
      //reload intentions
      Bof.GetIntentions($rootScope.urls.intentions + '?username=self').then(function(intentionsList) {
        $scope.intentions=intentionsList;
        if($scope.textOnly){
          // peer events with intentions for text only view
          var intentionsAdded = intentionIncluded($scope.textEventsAll, $scope.intentions);
          $scope.textEventsAll = intentionsAdded;
          $scope.textEvents = intentionsAdded;
        }
      });
    });
  };

  // POST an intention
  $scope.intendPost = function (intent, eventUrl) {
    //data to send to endpoint
    data = {
        'intention': intent,
        'event':eventUrl
    };

    var thisEventPos = _.findIndex($rootScope.events, {url: eventUrl});
    var intentionsUrl = $rootScope.urls.intentions;
    // use a factory to post new intent
    Bof.IntendPost(intentionsUrl, data).then(function(result) {
      // close popup
      leafletData.getMap().then(function(map) {
        map.closePopup();
      });
      // get the event again - and change the values of the event in $rootScope.events[thisEventPos]
      // or $scope.textEventsAll to update the counts
      Bof.GetBof(eventUrl).then(function(result) {
        var listToUpdate ='';
        var eventPos;
        if($scope.textOnly){
          eventPos = _.findIndex($scope.textEventsAll , {url: eventUrl});
          listToUpdate = $scope.textEventsAll;
        }
        else {
          eventPos= _.findIndex($rootScope.events, {url: eventUrl});
          listToUpdate = $rootScope.events;
        }
        listToUpdate[eventPos].maybe=result.data.maybe;
        listToUpdate[eventPos].definitely=result.data.definitely;
        listToUpdate[eventPos].guests=result.data.guests;
      });
      // update the intention list for this user
      Bof.GetIntentions($rootScope.urls.intentions + '?username=self').then(function(intentionsList) {
        $scope.intentions=intentionsList;
        if($scope.textOnly){
          // peer events with intentions for text only view
          var intentionsAdded = intentionIncluded($scope.textEventsAll, $scope.intentions);
          $scope.textEventsAll = intentionsAdded;
          $scope.textEvents = intentionsAdded;
        }
      });
    });

  };

  $(document).on('click','.editEvent',function(e) {

    var event = JSON.parse($(this).attr('data-event'));

    $scope.editEvent = {};
    // clone the event so that no edits will affect the listed event
    var thisEvent = _.clone(_.findWhere($rootScope.events, {url: event.url}));

    if($scope.textOnly) {
      // clone the event so that no edits will affect the listed event
      thisEvent =  _.clone(_.findWhere($scope.textEventsAll, {url: event.url}));
    }

    $timeout(function () { $scope.editEvent = thisEvent; }, 0);
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
      $('#bofModalEdit #startTimeEdit').val(moment(thisEvent.startTime).format($rootScope.time_format_polyfill));
      $('#bofModalEdit #endTimeEdit').val(moment(thisEvent.endTime).format($rootScope.time_format_polyfill));
      $('#bofModalEdit #eventTextEdit').val(thisEvent.message);
      //$('#bofModalEdit #eventTitleEdit').val(thisEvent.title);

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
    if (window.confirm("Are you sure you want to cancel this event?")) {
      $scope.editEvent.status = 'canceled';
      $scope.removeEvent($scope.editEvent);
      $scope.eventEditPost();
    }
  };

  // handler for event edit PUT
  $scope.eventEditPost = function(){
    if ($scope.editEvent.status) {
      status = $scope.editEvent.status;
    }
    else {
      status = 'active';
    }
    // use the editEvent model for the data for this PUT
    // only wrinkle is the time, that we had to populate via jQuery
    var startTimeP = $('#bofModalEdit #startTimeEdit').val();
    var endTimeP = $('#bofModalEdit #endTimeEdit').val();
    var data = {
      'eventText': $scope.editEvent.message,
      'title':$scope.editEvent.title,
      'startTime': startTimeP,
      'endTime': endTimeP,
      'address':  $scope.editEvent.address,
      'hashtag':  $scope.editEvent.hashTag,
      'latitude': $scope.editEvent.lat,
      'status':  status,
      'longitude': $scope.editEvent.lng,
      'category':$scope.editEvent.category,
      // status field is not available in the end point/db at this point
      //'status':$scope.editEvent.status,
      'altitudeMeters': 266.75274658203125, //placeholder - we will be using altitude
      'postingTime':  moment().format($rootScope.time_format)
    };
    var validationFailures = validate(data);
    //if there were no validation failures, post it
    // and construct a new marker to add to map
    if(!validationFailures.length) {
      Bof.PutBof($scope.editEvent.url, data).then(function(result) {
        // examine event and return a message to the user if
        // the event's timeframe is NOT the current view's timeframe
        $scope.alert = checkTimeSlice(result.data.startTime, result.data.endTime, $rootScope.currentViewUrl);
        $timeout(function () { $scope.alert = false; }, 5000);
        //reload events
        getEvents($rootScope.currentViewUrl);
        // clear the form controls in the modal and then hide it
        $('#eventTextEdit, #newStartTimeEdit, #newEndTimeEdit').val('');
        $('#bofModalEdit').modal('hide');
      });
    } else {
      // there were validation failures, add an 'has-error' class to
      // the offending element's parent
      $scope.validationFailuresEdit = true;
      _.each(validationFailures, function(failure){
         $('.' + failure).addClass('has-error').show();
      });
    }
  };
  //Given coordinates, lookup address
  //used in Create and Edit Event modals
  //logic will be radically simplified when we decide what service to use

  $scope.lookUpAddress = function(mode){
    var coords = $('#bofModal').attr('data-coords').split(',');
    var addressUrl ='';
    if (mode==="google") {
      addressUrl='https://maps.googleapis.com/maps/api/geocode/json?latlng=' + $('#bofModal').attr('data-coords').split(',').join(',');
    }
    else {
      addressUrl ='https://nominatim.openstreetmap.org/reverse?format=xml&lat=' + coords[0] + '&lon=' + coords[1] + '&zoom=18&addressdetails=1';
    }
    Bof.GetAddress(addressUrl).then(function(result) {
      if (mode==="google") {
        //google parsing
        $scope.newEventAddress = result.data.results[0].formatted_address;
      }
      else {
        //openstreet parsing
        $scope.newEventAddress =  $(result.data).find("result")[0].innerText;
      }
    });
  };

  $scope.addressEdited = function(){
    $scope.addressDirty = true;
  };
  $scope.lookUpNewCoords = function(mode, origin){
    if(origin ==='create') {
      $scope.origin= 'create';
      $scope.coordsLookUp = $scope.newEventAddress;
    } else {
      $scope.origin= 'edit';
      $scope.coordsLookUp = $scope.editEvent.address;
    }
   $scope.lookUpCoords(mode, origin);
  };


  //used to create an event given a textual address
  // flow:
  // 1. user specifies address in coordsLookUpModal modal and searches (lookUpCoords)
  // 2. if service returned one address, open Create Event modal (bofModal) with that address and that adress coordinates
  // 3. if service returned more than one, populate lookup address modal (coordsLookUpModal) with the choices
  // 4. user then selects one of the choices via selectLocation and then Create Event modal (bofModal) opens with that address and that adress coordinates

  $scope.lookUpCoords = function(mode, origin){
    // ermove any previpus search results
    $scope.addressLookupResults =null;
    // if address supplied is too short, let user know
    if($scope.coordsLookUp.length < 5) {
      $scope.addressTooShort = true;
    } else {
      $scope.addressTooShort = false;
      var coordsUrl ='';
      if (mode==="google") {
        coordsUrl = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURIComponent($scope.coordsLookUp);
      }
      else {
        coordsUrl = 'https://nominatim.openstreetmap.org/search?q='  + encodeURIComponent($scope.coordsLookUp) + '&format=json';
      }

      Bof.GetAddress(coordsUrl).then(function(result) {
        if (mode==="google") {
          if (result.data.results.length === 1){
            $scope.newEventLoc =result.data.results[0].geometry.location;
            // pass the object to the create event dialog
            if((origin ==='create' || origin ==='specifiedAddress') && ($scope.origin=== 'create' || !$scope.origin)){
              $('#bofModal').attr('data-coords', [result.data.results[0].geometry.location.lat, result.data.results[0].geometry.location.lng]);
              $scope.newEventAddress = result.data.results[0].formatted_address;
              $('#coordsLookUpModal').modal('hide');
              $('#bofModal').modal('show');
            } else if ($scope.origin=== 'edit') {
              $scope.editEvent.lat = result.data.results[0].geometry.location.lat;
              $scope.editEvent.lng = result.data.results[0].geometry.location.lng;
              $scope.editEvent.address = result.data.results[0].formatted_address;
              $('#coordsLookUpModal').modal('hide');
              $('#bofModalEdit').modal('show');
            }
            if(!$scope.textOnly){
              $scope.panMap($scope.newEventLoc);
            }
          } else {
            $scope.addressLookupResults = normalizeaddressLookupResults(result.data.results);
            $('#coordsLookUpModal').modal('show');
          }
        }
        else {
          if (result.data.length === 1){
            // pass the object to the create event dialog
            $('#bofModal').attr('data-coords', [parseFloat(result.data[0].lat), parseFloat(result.data[0].lon)]);
             $scope.newEventLoc = {lat:parseFloat(result.data[0].lat),lng:parseFloat(result.data[0].lon)};
             $scope.newEventAddress = result.data[0].display_name;
             if(!$scope.textOnly){
               $scope.panMap($scope.newEventLoc);
             }
             $('#coordsLookUpModal').modal('hide');
             $('#bofModal').modal('show');

          } else {
            $scope.addressLookupResults = normalizeaddressLookupResults(result.data);
            $('#coordsLookUpModal').modal('show');
          }
        }
      });
    }
  };

  // handles user selecting one of the locations after and address search that returned more than one choice
  // results get passed to create or edit event modal depending on what workflow is active
  // 1. Creating on map and then editing the address to something abiguous before saving the event (results get passed to create modal)
  // 2. Editing an event from map (results het passed to edit modal)
  // 3. Creating an event by typing address (results get passed to create modal)
  $scope.selectLocation = function(location){
    if($scope.newEventAddress){
      // user is in the act of creating an event and edited the address to
      // something ambiguous
      $scope.newEventAddress = location.locationName;
      $('#bofModal').attr('data-coords', [location.lat,location.lng]);
      $('#bofModal').modal('show');
    } else if($scope.editEvent) {
      // user is in the act of editing an event and edited the address to
      // something ambiguous
      $scope.editEvent.lat = location.lat;
      $scope.editEvent.lng = location.lng;
      $scope.editEvent.address = location.locationName;
    } else {
      // user is in the act of creating an event by typing address
      $scope.newEventAddress = location.locationName;
      $('#bofModal').attr('data-coords', [location.lat,location.lng]);
      $('#bofModal').modal('show');
    }
    // pan map to new location of event
    $scope.newEventLoc = {lat:location.lat,lng:location.lng};
    $('#coordsLookUpModal').modal('hide');
    if(!$scope.textOnly){
      $scope.panMap($scope.newEventLoc);
    }

  };

  //clean up coordsLookUpModal after it is dismissed
  $('#coordsLookUpModal').on('hide.bs.modal', function () {
    $timeout(function () {
      $scope.addressLookupResults =undefined;
      $scope.coordsLookUp=undefined;
      $scope.addressTooShort = false;
     }, 0);
  });

  $scope.$on('leafletDirectiveMarker.click', function(e, args){
    // TODO:  might need to check if event is "mine" and omit the lookups below
    var thisEvent =_.findWhere($rootScope.events, {url: args.model.url});
    var correlateIntention = _.findWhere($scope.intentions, {event: args.model.url});
    if(correlateIntention){
      thisEvent.intention=correlateIntention;
    }
  });

  // generic function to pan map to a specified set of coordinates
  $scope.panMap = function(loc){
    leafletData.getMap().then(function(map) {
      map.panTo(loc);
    });
  };

//watch for connections and disconnections (rest of this runs in app.js)
$scope.$watch('online', function(newStatus) {
  if (newStatus ===true && $rootScope.prevOnlineStatus !==undefined){
    $log.info('could reload the app on reconnected status');
  }
  $rootScope.prevOnlineStatus = newStatus;
});

$scope.logout = function(){
  $window.location.href='/user/logout/';
};

$scope.dismissAlert  = function(){
  $rootScope.alert =undefined;
};

}]);
