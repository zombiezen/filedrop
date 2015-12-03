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

//goog.provide('filedrop.Controller');
//goog.provide('filedrop.ListState');
var filedrop = filedrop || {};


/**
 * Primary app controller.
 * @param {!filedrop.Files} Files
 * @param {!filedrop.FileDialog} FileDialog
 * @param {!md.$dialog} $mdDialog
 * @param {!md.$toast} $mdToast
 * @param {!angular.Scope} $scope
 * @param {!angular.$window} $window
 * @constructor
 * @ngInject
 */
filedrop.Controller = function(UploadManager, Files, FileDialog, $mdDialog, $mdToast, $scope, $window) {
  /** @private {!filedrop.Files} */
  this.filesService_ = Files;

  /** @private {!filedrop.FileDialog} */
  this.fileDialog_ = FileDialog;

  /** @private {!filedrop.UploadManager} */
  this.uploadManager_ = UploadManager;

  /** @private {!md.$dialog} */
  this.dialog_ = $mdDialog;

  /** @private {!md.$toast} */
  this.toast_ = $mdToast;

  /** @private {!angular.Scope} */
  this.scope_ = $scope;

  /** @private {!angular.$window} */
  this.window_ = $window

  /** @export {!Array.<!Object>} */
  this.files = [];

  /** @private {?angular.$q.Promise.<!Array.<!Object>>} */
  this.filesPromise_ = null;

  /** @private {boolean} */
  this.filesFailed_ = false;

  // TODO(light): make constructor less expensive
  this.refresh();
};


/**
 * Return the state of the controller's list of files.
 * @return {filedrop.ListState}
 * @export
 */
filedrop.Controller.prototype.listState = function() {
  if (this.filesPromise_) {
    return filedrop.ListState.LOAD;
  } else if (this.filesFailed_) {
    return filedrop.ListState.FAIL;
  } else if (this.files.length == 0) {
    return filedrop.ListState.EMPTY;
  } else {
    return filedrop.ListState.HAS_DATA;
  }
};


/**
 * Refresh the file list.
 * @return {!angular.$q.Promise}
 * @export
 */
filedrop.Controller.prototype.refresh = function() {
  if (!this.filesPromise_) {
    var fn = angular.bind(this.filesService_, this.filesService_.list);
    var failText = 'File list unavailable.';
    this.filesFailed_ = false;
    this.filesPromise_ = this.retriableAction_('', failText, fn)
        .then(angular.bind(this, function(files) {
          this.files = files;
        }), angular.bind(this, function(failure) {
          this.filesFailed_ = true;
          throw failure;
        }))
        .finally(angular.bind(this, function() {
          this.filesPromise_ = null;
        }));
  }
  return this.filesPromise_;
};


/**
 * Start upload.
 * @export
 */
filedrop.Controller.prototype.upload = function() {
  this.fileDialog_.open().then(angular.bind(this, this.processUpload_));
};


/**
 * Event handler for file drop event.
 * @param {!FileList} files
 * @export
 */
filedrop.Controller.prototype.dropFile = function(files) {
  if (this.canWrite()) {
    this.processUpload_(files);
  }
};


/**
 * Do the actual upload.
 * @param {!FileList} files
 * @return {!angular.$q.Promise}
 * @private
 */
filedrop.Controller.prototype.processUpload_ = function(files) {

  return this.uploadManager_.makeUploads(files)
      .then(angular.bind(this, function(fileObjects) {
        if (fileObjects.length > 1) {
          var okText = 'Uploaded ' + fileObjects.length + ' files';
        } else {
          var okText = 'Uploaded ' + fileObjects[0].name;
        }
        angular.forEach(fileObjects, function(fObj) {
          this.files.push(fObj);
        }, this);
        this.toast_.showSimple(okText);
      }), angular.bind(this, function() {
        var failText = 'Failed to upload a file';
        this.toast_.showSimple(failText);
      }));
};


/**
 * Start a browser download of a listed file.
 * @param {!Object} file the file from the files list
 * @export
 */
filedrop.Controller.prototype.downloadFile = function(file) {
  this.window_.location.href = file['url'];
};

/**
 * Delete a file.
 * @param {!Object} file the file from the files list
 * @return {!angular.$q.Promise}
 * @export
 */
filedrop.Controller.prototype.deleteFile = function(file) {
  var cfg = this.dialog_.confirm()
      .content('Delete ' + file.name + '?')
      .cancel('Cancel')
      .ok('Delete');
  return this.dialog_.show(cfg).then(angular.bind(this, function() {
    var fs = this.filesService_;
    var fn = function() { return fs.remove(file.name); };
    var okText = 'Deleted ' + file.name;
    var failText = 'Failed to delete ' + file.name;
    return this.retriableAction_(okText, failText, fn)
        .then(angular.bind(this, function() {
          for (var i = 0; i < this.files.length; i++) {
            if (this.files[i].name == file.name) {
              this.files.splice(i, 1);
              break;
            }
          }
        }));
  }));
};


/**
 * Perform an idempotent action and notify the user, allowing them to retry
 * the operation, if desired.
 *
 * @param {string} okText toast to display on success
 * @param {string} failText toast to display on failure
 * @param {function(): !angular.$q.Promise.<T>} fn action to perform
 * @return {!angular.$q.Promise.<T>} resolved promise
 * @template T
 * @private
 */
filedrop.Controller.prototype.retriableAction_ = function(okText, failText, fn) {
  return fn().then(angular.bind(this, function(val) {
    if (okText) {
      this.toast_.showSimple(okText);
    }
    return val;
  }), angular.bind(this, function(failure) {
    var t = this.toast_.simple()
        .content(failText)
        .action('Retry');
    return this.toast_.show(t).then(angular.bind(this, function() {
      // User clicked "Retry".
      return this.retriableAction_(okText, failText, fn);
    }), function() {
      // Toast "failed".  This means that the toast was dismissed,
      // whether by user action or age.  Fail with original error.
      throw failure;
    });
  }));
};


/**
 * Report whether the user can read files.
 * @return {boolean}
 * @export
 */
filedrop.Controller.prototype.canRead = function() {
  return this.filesService_.canRead();
};


/**
 * Report whether the user can upload files.
 * @return {boolean}
 * @export
 */
filedrop.Controller.prototype.canWrite = function() {
  return this.filesService_.canWrite();
};


/**
 * Report whether the user can delete files.
 * @return {boolean}
 * @export
 */
filedrop.Controller.prototype.canDelete = function() {
  return this.filesService_.canDelete();
};


/**
 * State of the controller's list of files.
 * @enum {string}
 */
filedrop.ListState = {
  LOAD: 'load',
  FAIL: 'fail',
  EMPTY: 'empty',
  HAS_DATA: 'hasData'
};
