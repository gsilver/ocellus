'use strict';
/* global ocellus, leafletize */
ocellus.factory('Bof', function($http, $log) {
  return {
    // post an event
    PostBof : function(url, data) {
      return $http.post(url, data).then(
          function success(result) {
            return result;
          },
          function error(result) {
            // do some error things
          });
    },
    // get events
    // TODO: at this point it is all - we will need to use this factory
    // to get current and upcoming
    GetBofs : function(url) {
      return $http.get(url, {
        cache : false
      }).then(
          function success(result) {
            // use util function to transform the result for leaflet
            return leafletize(result);
          },
          function error(result) {
            // do some error things
          });
    }
  };
});
