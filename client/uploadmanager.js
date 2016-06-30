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

//goog.provide('filedrop.UploadManager');
var filedrop = filedrop || {};


/**
 * Service for managing uploads.
 * @param {!angular.$q} $q
 * @param {!filedrop.Files} Files
 * @constructor
 * @ngInject
 */
filedrop.UploadManager = function($q, Files, $log) {
  /** @private {!angular.$q} */
  this.q_ = $q;

  /** @private {!filedrop.Files} */
  this.filesService_ = Files;

  /** @private {!angular.$log} */
  this.log_ = $log;

  /** @export {!Object} */
  this.uploads = {};

  /** @private {!Number} */
  this.id = 0;
};

/**
 * Adds promise to central upload store.
 * @param {!File} file
 * @return {string} upload object id
 */
filedrop.UploadManager.prototype.add = function(file) {
  var upload = this.filesService_.upload(file);
  var id = this.id++;
  this.uploads[id] = upload.then(angular.bind(this, function(val) {
      this.uploads[id].status = 'success';
      return val;
    }), angular.bind(this, function(failure) {
      this.uploads[id].status = 'error';
      return failure;
    }), angular.bind(this, function(progressEvent) {
      if (progressEvent.lengthComputable) {
        this.uploads[id].percentComplete = progressEvent.loaded / progressEvent.total;
      } else {
        this.uploads[id].percentComplete = undefined;
        this.log_.warn('Total size not computable for file:', file.name);
      }
    }));
  return id;
};

/**
 * Returns promise that resolves when the given batch of files is uploaded.
 * @param {!FileList} files
 * @return {!angular.$q.Promise}
 */
filedrop.UploadManager.prototype.makeUploads = function(files) {
  if (!files || !files.length) {
    this.log_.warn('No files provided to make uploads');
    return false;
  }
  var ids = [];
  angular.forEach(files, function(file) {
    ids.push(this.add(file));
  }, this);
  return this.fetch(ids);
};

/**
 * Fetch a list of queries.
 * @param {!Array} list of ids
 * @return {!angular.$q.Promise}
 */
filedrop.UploadManager.prototype.fetch = function(ids) {
  var promises = [];

  angular.forEach(ids, function(id) {
    promises.push(this.uploads[id]);
  }, this);

  return this.q_.all(promises);
};

/**
 * Fetch all queries.
 * @return {!angular.$q.Promise}
 */
filedrop.UploadManager.prototype.fetchAll = function() {
  var ids = [];

  angular.forEach(this.uploads, function(promise, id) {
    ids.push(id);
  }, this);

  return this.fetch(ids);
};
