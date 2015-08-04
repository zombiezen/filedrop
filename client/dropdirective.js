/*
 * @license Apache-2.0
 *
 * Copyright 2015 Google Inc. All rights reserved.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
