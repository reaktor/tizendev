var path = require("path");
var fs = require("fs");
var Q = require("Q");

module.exports = function (grunt) {
  "use strict";

  var _ = grunt.util._;
  var util = require("./util.js")(grunt);
  var shell = require("./shell.js")(grunt);
  var nativeApp = require("./nativeApp.js")(grunt);
  var gruntTizenInitialized = false;


  function getConfig() {
    return grunt.config("tizendev");
  }

  var webApp = {

    build: function () {
      return buildNativeAppIfNecessary().then(buildWidget);
    },

    package: function () {
      removeWgtFile();
      return shell.package(getWgtName(), getConfig().buildPath);
    },

    sign: function () {
      var config = getConfig();
      util.removeDsStoreFiles(getConfig().buildPath);

      if (!config.profilePath || config.profilePath.length === 0)
        grunt.fail.warn("profilePath must be specified.");

      return util.getSigningProfileName(config.profilePath, config.profile).then(function (profileName) {
        grunt.log.writeln("Signing " + config.buildPath + " using profile '" + profileName + "'");
        return shell.sign(profileName, getConfig().profilePath, getConfig().buildPath);
      });
    },

    install: function() {
      return shell.installWidget(getWgtName());
    },

    uninstall: function() {
      return shell.uninstallWidget(getConfig().fullAppId).then(grunt.log.writeln);
    },

    start: function() {
      var action = grunt.option("debug") ? "debug" : "start";
      grunt.config.set("tizen." + action, {
        action: action,
        localPort: 9090,
        stopOnFailure: true
      });
      gruntTizenTask(action);
    },

    stop: function() {
      function waitForStop() {
        return util.execUntilTrue(function() {
          return shell.isWidgetStopped(getConfig().fullAppId);
        });
      }
      return shell.sdbKill(getConfig().fullAppId).then(waitForStop);
    }

  };

  function buildNativeAppIfNecessary() {
    var nativeAppPath = getConfig().nativePath;

    if (nativeAppPath.length > 0) {
      if (!util.isAbsolutePath(nativeAppPath))
        nativeAppPath = getProjectFilePath(nativeAppPath);

      grunt.log.writeln("Linking native application: " + nativeAppPath);
      return nativeApp.build(nativeAppPath).then(function () {
        return shell.nativeAppToBuildPath(nativeAppPath, getConfig().buildPath, getProjectFilePath(""));
      });
    } else
      return util.resolvedPromise();
  }

  function buildWidget() {
    var config = getConfig();
    var srcPaths = _.flatten([
      config.copy,
      excludeBuildFolderFilter(config),
      config.copyExclude
    ]);

    var widgetDirectory = getConfig().nativePath.length > 0 ? path.join(getConfig().buildPath, "/res/wgt") : getConfig().buildPath;
    console.log("Building widget to directory: " + widgetDirectory);

    grunt.config.set("copy.tizendev.expand", true);
    grunt.config.set("copy.tizendev.cwd", getProjectFilePath(""));
    grunt.config.set("copy.tizendev.src", srcPaths);
    grunt.config.set("copy.tizendev.dest", widgetDirectory);
    grunt.task.run("copy:tizendev");
    return util.resolvedPromise();
  }

  function getProjectFilePath(file) {
    return path.join(getConfig().sourceDir, file);
  }

  function excludeBuildFolderFilter(config) {
    return "!" + path.join(path.relative(config.sourceDir, config.buildPath), "/**");
  }

  function removeWgtFile() {
    var wgtFile = getWgtName();
    if (grunt.file.isFile(wgtFile)) {
      grunt.log.writeln("Removing old widget: " + wgtFile);
      fs.unlink(wgtFile);
    }
  }

  function getWgtName() {
    var parts = getConfig().fullAppId.split(".");
    return path.join(getConfig().sourceDir, parts[1] + ".wgt");
  }

  function initGruntTizen() {
    if (!gruntTizenInitialized) {
      gruntTizenInitialized = true;
      grunt.task.run("tizen_prepare");
    }
  }

  function gruntTizenTask(action) {
    initGruntTizen();
    grunt.task.run("tizen:"+action);
  }

  function isCopyMatch(filepath) {
    var sourceRelativePath = path.relative(getConfig().sourceDir, filepath);
    var filter = _.flatten([getConfig().copy, getConfig().copyExclude]);
    return grunt.file.match(filter, sourceRelativePath).length > 0;
  }

  function executeTasks(filepath) {
    var sourceRelativePath = path.relative(getConfig().sourceDir, filepath);
    var tasks = getConfig().tasks;
    for (var taskName in tasks) {
      if (grunt.file.match(tasks[taskName], sourceRelativePath).length > 0)
        grunt.task.run(taskName);
    }
  }

  function copySrcFileToBuild(sourcePath) {
    var sourceFileRelativePath = path.relative(getConfig().sourceDir, sourcePath);
    var targetPath = path.join(getConfig().buildPath, sourceFileRelativePath);
    grunt.file.copy(sourcePath, targetPath);
    grunt.log.writeln("Copied " + sourcePath + " to " + targetPath);
  }

  return webApp;
};