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
