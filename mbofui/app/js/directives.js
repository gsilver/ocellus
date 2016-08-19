/*jshint strict:false */
ocellus.directive('popup', [function() {
    return {
        restrict: 'E',
        scope: {
          event: '=event'
        },
        templateUrl: '../views/popup.html'
      };
}]);
