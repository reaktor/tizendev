var Q = require("q");
var path = require("path");
var fs = require('fs');

module.exports = function (grunt) {
  "use strict";

  var util = require("./util.js")(grunt);
  var shell = require("./shell.js")(grunt);

  function getConfig() {
    return grunt.config("tizendev");
  }

  var nativeApp = {

    build: function (nativeAppPath) {
      if (nativeAppPath) {

        if (!fs.existsSync(nativeAppPath))
          grunt.fail.warn("Path not found: " + nativeAppPath);
        else {
          return  shell.generateMakeFile(nativeAppPath)
              .then(function () {
                return shell.buildNativeProject(nativeAppPath);
              });
        }
      }
    },

    package: function () {
      var config = getConfig();
      if (!config.profilePath || config.profilePath.length === 0) {
        grunt.fail.warn("profilePath must be specified.");
      }
      return util.getSigningProfileName(config.profilePath, config.profile).then(function (profileName) {

        var profileData = util.getProfileData(profileName, getConfig().profilePath, getConfig().libPath);
        return shell.nativePackage(profileData ,getConfig().buildPath);
      });
    },

    sign: function () {
      console.log("Signing is done by packaging task when developing native application");
      return util.resolvedPromise();
    },

    install: function () {
      return shell.nativeInstall(getConfig().buildPath);
    },

    uninstall: function () {
      return shell.nativeUninstall(getConfig().fullAppId);
    },

    start: function () {
      return shell.nativeStart(getConfig().fullAppId);
    },

    stop: function () {
      return shell.nativeStop(getConfig().fullAppId);
    },

    setupWatcher: function () {

      grunt.event.on('watch', function (action, filepath, target) {
        grunt.task.run("tizendev:stop");
        grunt.task.run("tizendev:build");
        grunt.task.run("tizendev:package");
        grunt.task.run("tizendev:uninstall");
        grunt.task.run("tizendev:install");
        grunt.task.run("tizendev:start");

      });
      return util.resolvedPromise();
    }

  };

  return nativeApp;
};