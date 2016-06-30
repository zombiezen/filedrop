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

//goog.provide('filedrop.module');

//goog.require('filedrop.Controller');
//goog.require('filedrop.FileDialog');
//goog.require('filedrop.Files');
//goog.require('filedrop.dropDirective');
var filedrop = filedrop || {};


//goog.scope(function() {

filedrop.module = angular.module('FileDropApp', [
    'ngAnimate',
    'ngMaterial',
    'ngMessages']);

filedrop.module
    .controller('Controller', filedrop.Controller)
    .directive('filedropDrop', filedrop.dropDirective)
    .service('FileDialog', filedrop.FileDialog)
    .service('UploadManager', filedrop.UploadManager)
    .service('Files', filedrop.Files);

/**
 * @param {md.$mdIconProvider} $mdIconProvider
 * @param {md.$mdThemingProvider} $mdThemingProvider
 * @ngInject
 */
var config = function($mdIconProvider, $mdThemingProvider) {
  $mdIconProvider
      .iconSet('action', '/icons/action.svg')
      .iconSet('file', '/icons/file.svg')
      .iconSet('navigation', '/icons/navigation.svg');
  $mdThemingProvider.theme('default')
      .primaryPalette('teal');
};
filedrop.module.config(config);

//});
