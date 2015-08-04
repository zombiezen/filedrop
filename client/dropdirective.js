//goog.provide('filedrop.dropDirective');
var filedrop = filedrop || {};


/**
 * Attribute for registering a file drop event handler.
 *
 * @param {!angular.$parse} $parse
 * @param {!angular.$log} $log
 * @return {Object}
 * @ngInject
 */
filedrop.dropDirective = function($parse, $log) {
  /**
   * @param {!angular.JQLite} element
   * @param {!Object.<string, string>} attrs
   */
  var compile = function(element, attrs) {
    var fn = $parse(attrs['filedropDrop']);
    /**
     * @param {!angular.Scope} scope
     * @param {!angular.JQLite} element
     * @param {!Object.<string, string>} attrs
     */
    var link = function(scope, element, attrs) {
      element.on('dragenter dragover drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
      });
      element.on('drop', function(e) {
        var callback = function() {
          fn(scope, {'$event': e});
        };
        $log.log('Dropped ' + e.dataTransfer.files.length + ' files');
        scope.$apply(callback);
      });
    };
    return link;
  };
  return {
    'restrict': 'A',
    'compile': compile
  };
};
