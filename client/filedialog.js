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

//goog.provide('filedrop.FileDialog');
var filedrop = filedrop || {};


/**
 * Service for creating an "open file" dialog.
 * @param {!angular.JQLite} $document
 * @param {!angular.$q} $q
 * @param {!angular.$log} $log
 * @constructor
 * @ngInject
 */
filedrop.FileDialog = function($document, $q, $log) {
  /** @private {!angular.JQLite} */
  this.doc_ = $document;
  /** @private {!angular.$q} */
  this.q_ = $q;
  /** @private {!angular.$log} */
  this.log_ = $log;
  /** @private {?angular.JQLite} */
  this.inputEl_ = null;
  /** @private {?angular.$q.Deferred.<!FileList>} */
  this.currDefer_ = null;
};


/**
 * Display a file picker dialog.  The promise is not guaranteed to resolve,
 * since browsers don't give any indication of a cancel.
 *
 * @return {!angular.$q.Promise.<!FileList>}
 */
filedrop.FileDialog.prototype.open = function() {
  this.log_.log('FileDialog: open()');
  var el = this.initInputEl_();
  this.currDefer_ = this.q_.defer();
  var p = this.currDefer_.promise;

  var e = new MouseEvent('click');
  el[0].dispatchEvent(e);

  return p;
};


/**
 * @return {!angular.JQLite}
 * @private
 */
filedrop.FileDialog.prototype.initInputEl_ = function() {
  if (this.inputEl_ === null) {
    this.log_.log('FileDialog: creating new <input>');
    this.inputEl_ = angular.element('<input type="file" style="position:fixed;top:-20em">');
    this.doc_.append(this.inputEl_);
    this.inputEl_.on('change', angular.bind(this, this.onUpload_));
  }
  return this.inputEl_;
};


/**
 * @param {Event} e
 * @private
 */
filedrop.FileDialog.prototype.onUpload_ = function(e) {
  var d = this.currDefer_;
  var f = this.inputEl_[0].files;
  this.log_.log('FileDialog: received ' + f.length + ' file(s)');

  this.log_.log('FileDialog: destroying input');
  this.inputEl_.remove();
  this.inputEl_ = null;
  this.currDefer_ = null;

  this.log_.log('FileDialog: resolving promise');
  d.resolve(f);
};
