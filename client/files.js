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

//goog.provide('filedrop.Files');
var filedrop = filedrop || {};


/**
 * Service for handling files.
 * @param {!angular.$http} $http
 * @param {!angular.$window} $window
 * @constructor
 * @ngInject
 */
filedrop.Files = function($http, $window) {
  /** @private {!angular.$http} */
  this.http_ = $http;
  /** @private {!Array.<string>} */
  this.permissions_ = $window['permissions'];
};

/**
 * @return {!angular.$q.Promise.<!Array.<!Object>>}
 */
filedrop.Files.prototype.list = function() {
  return this.http_.get('/file/').then(function(response) {
    var entries = response.data['entries'];
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      e['url'] = this.getFileUrl_(e['name']);
    }
    return entries;
  });
};


/**
 * Upload a file.
 * @param {!File} file
 * @return {!angular.$q.Promise.<!Object>} the created file object
 */
filedrop.Files.prototype.upload = function(file) {
  var url = this.getFileUrl_(file.name);
  return this.http_.put(url, file, {
    transformRequest: filedrop.Files.transformFile_
  }).then(function() {
    return {'name': file.name, 'url': url};
  });
};


/**
 * Delete a file.
 * @param {string} name
 * @return {!angular.$q.Promise}
 */
filedrop.Files.prototype.remove = function(name) {
  return this.http_.delete(this.getFileUrl_(name));
};


/**
 * Build the URL for a file name.
 * @param {string} name
 * @return {string} the server-relative URL
 */
filedrop.Files.prototype.getFileUrl_ = function(name) {
  return '/file/' + encodeURI(name);
};


/**
 * Report whether the user can read files.
 * @return {boolean}
 */
filedrop.Files.prototype.canRead = function() {
  return this.hasPerm_('read');
};


/**
 * Report whether the user can upload files.
 * @return {boolean}
 */
filedrop.Files.prototype.canWrite = function() {
  return this.hasPerm_('write');
};


/**
 * Report whether the user can delete files.
 * @return {boolean}
 */
filedrop.Files.prototype.canDelete = function() {
  return this.hasPerm_('delete');
};


/**
 * Report whether the user has a named permission.
 * @param {string} name
 * @return {boolean}
 * @private
 */
filedrop.Files.prototype.hasPerm_ = function(name) {
  for (var i = 0; i < this.permissions_.length; i++) {
    if (this.permissions_[i] == name) {
      return true;
    }
  }
  return false;
};


/**
 * Transform request data for a file body.
 *
 * @param {!File} data
 * @param {function(): Object.<string, string>} headersGetter
 * @return {!File} the data as passed in
 * @private
 */
filedrop.Files.transformFile_ = function(data, headersGetter) {
  var h = headersGetter();
  h['Content-Type'] = 'application/octet-stream';
  return data;
};
