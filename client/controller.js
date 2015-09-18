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
filedrop.Controller = function(Files, FileDialog, $mdDialog, $mdToast, $scope, $q, $window) {
  /** @private {!filedrop.Files} */
  this.filesService_ = Files;

  /** @private {!filedrop.FileDialog} */
  this.fileDialog_ = FileDialog;

  /** @private {!md.$dialog} */
  this.dialog_ = $mdDialog;

  /** @private {!md.$toast} */
  this.toast_ = $mdToast;

  /** @private {!angular.Scope} */
  this.scope_ = $scope;

  /** @private {!angular.$q} */
  this.q_ = $q;

  /** @private {!angular.$window} */
  this.window_ = $window;

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
  var fs = this.filesService_;

  var toUpload = Array.prototype.slice.call(files);
  var fn = angular.bind(this, function() {
    var d = this.q_.defer();

    fs.uploadFiles(toUpload).then(angular.bind(this, function(files) {
      this.files.push.apply(this.files, files.uploaded);

      var okText = 'Uploaded ' + files.uploaded.length + ' file(s)';
      d.resolve({ okText: okText });
    }), angular.bind(this, function(files) {
      this.files.push.apply(this.files, files.uploaded);
      toUpload = files.failed;

      var failText = 'Uploaded ' + files.uploaded.length + ' file(s), ' + files.failed.length + ' failed';
      d.reject({ failText: failText });
    }));

    return d.promise;
  });

  return this.retriableAction_(null, null, fn);
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
  return fn().then(angular.bind(this, function(response) {
    okText = response && response.okText ? response.okText : okText;
    if (okText) {
      this.toast_.showSimple(okText);
    }
    return response;
  }), angular.bind(this, function(response) {
    failText = response && response.failText ? response.failText : failText;
    var t = this.toast_.simple()
        .content(failText)
        .action('Retry');
    return this.toast_.show(t).then(angular.bind(this, function(toastResolution) {
      // User clicked "Retry".
      // NOTE Promise resolves "ok" if user clicked and true if toast times out (https://github.com/angular/material/issues/3745)
      // Is a dialog a more appropriate component here?
      if (toastResolution === "ok") {
        return this.retriableAction_(okText, failText, fn);
      } else {
        throw response;
      }
    }), function() {
      // Toast "failed".  This means that the toast was dismissed,
      // whether by user action or age.  Fail with original error.
      // NOTE Not sure that a user can ever trigger this state. See note above.
      throw response;
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
