var path = require("path");
var fs = require("fs");
var Q =  require("q");
var Bacon = require("baconjs");

module.exports = function(grunt) {
  "use strict";

  var util = require("./util.js")(grunt);
  var shell = require("./shell.js")(grunt);
  var profiler = require("./profiling.js")(grunt);
  var webApp = require("./webapp.js")(grunt);
  var nativeApp = require("./nativeapp.js")(grunt);
  var _ = grunt.util._;

  var tasks = {
    clean: function() {
      if (util.isBuildDirectory(getProjectFilePath(""), getConfig().buildPath) ||
        (grunt.file.exists(getConfig().buildPath) && util.isEmptyDirectory(getConfig().buildPath))) {
        grunt.log.writeln("Removing " + getConfig().buildPath);
        return shell.removeDirectory(getConfig().buildPath);
      } else if (grunt.file.exists(getConfig().buildPath)) {
        grunt.fail.fatal("Path " + getConfig().buildPath + " does not contain current project " + getConfig().fullAppId);
      } else
        return util.resolvedPromise();
    },

    targetImage: function() {
      return shell.execSdbShell("cat /etc/zypp/repos.d/slp-release.repo").then(function(output) {
        var regexp = /.*?(20\d\d)(\d\d)(\d\d)\D/;
        var groups = regexp.exec(output);
        if (groups) {
          grunt.log.writeln("Target image updated: " + new Date(groups[1], groups[2], groups[3]).toDateString());
        } else {
          grunt.log.writeln("Target image: " + output);
        }
      });
    },

    build: function () {
      return tasks.clean()
          .then(function () {
            var app = getAppTypeSpecificTasks();
            return app.build(getConfig().sourceDir);
          })
          .then(function () {
            executeAllTasks();
          });
    },

    start: function() {
      return getAppTypeSpecificTasks().start();
    },

    stop: function() {
      return getAppTypeSpecificTasks().stop();
    },

    restart: function() {
      return tasks.stop().then(tasks.start);
    },

    sign: function() {
      var app = getAppTypeSpecificTasks();
      return app.sign();
    },

    package: function() {
      var app = getAppTypeSpecificTasks();
      return app.package();
    },

    install: function() {
      return getAppTypeSpecificTasks().install();
    },

    uninstall: function() {
      return getAppTypeSpecificTasks().uninstall();
    },

    watch: function() {
      var config = getConfig();
      var srcPaths = _.flatten([
        config.watch,
        excludeBuildFolderFilter(config),
        config.watchExclude
      ]);

      grunt.config.set("watch.tizendev.files", srcPaths);
      grunt.config.set("watch.tizendev.options.cwd", config.sourceDir);
      grunt.config.set("watch.tizendev.options.spawn", false);

      if (config.liveReload && grunt.option("debug")) {
        grunt.config.set("watch.livereload.files", [getProjectFilePath("index.html")]);
        grunt.config.set("watch.livereload.options.livereload", true);
      }

      grunt.task.run("tizendev:restart");
      grunt.task.run("watch");
    },

    develop: function() {
      grunt.task.run("tizendev:connect");
      grunt.task.run("tizendev:targetImage");
      grunt.task.run("tizendev:build");
      grunt.task.run("tizendev:sign");
      grunt.task.run("tizendev:package");
      grunt.task.run("tizendev:uninstall");
      grunt.task.run("tizendev:install");
      grunt.task.run("tizendev:watch");
    },

    connect: function() {
      return startSdbServer().then(searchForDevice);
    },

    refreshBrowser: function() {
      if (grunt.option("debug"))
        util.triggerLiveReload();
    },

    profile: function() {
      return shell.enablePlatformLevelLoggingIfDisabled()
        
        .then(function(){
          return util.execTimes(tasks.profileOnce, getConfig().profilingTimes, getConfig().profilingSleep * 1000);
        })
        .then(profiler.printProfilingResult);
    },

    profileOnce: function() {
      return shell.clearDlog()
        .then(function() {
          tasks.stop().done(function() {
            shell.sdbDebug(getConfig().fullAppId);
          });
          return profiler.waitDLogEvents();
        })
        .then(profiler.printProfilingRow);
    },

    setDate: function() {
      return shell.execSdb(["root", "on"]).then(function() { shell.sdbDate(new Date()); });
    },

    setupWatchers: function() {
      return getAppTypeSpecificTasks().setupWatcher(tasks);
    },

    console: function() {
      shell.clearDlog().done(function() {
        var child = shell.getDlogProcess();
        var startEvent = profiler.getStartEventName();

        function isConsoleMessage(line) { return line.indexOf("ConsoleMessage") >= 0; };
        function isStartEvent(line) { return line.indexOf(startEvent) >= 0; };
        function yellow(text) { return '\u001b[33m' + text + '\u001b[0m'; }

        function printRowItem(item) {
          var prev = item.prev;
          var current = item.current;
          var diffFromPrev = (prev != null) ? " (Δ "+ (current.time.getTime() - prev.time.getTime()) + " ms)" : ""; 
          var timeDiff = item.start  ? current.time.getTime() - item.start.time.getTime() : "?";
          console.log(timeDiff + " ms" + diffFromPrev + ": " + yellow(current.message));
        }

        function printStartTime() {
          console.log("\n0ms: " + yellow("Application launched"));
        }

        var events = shell.readChildProcessOutput(child).scan({}, function(data, current) {
          if (isStartEvent(current)) {
            var item = util.parseDlogRow(current);
            return {
              start: item,
              current: item
            };
          } else if (isConsoleMessage(current))
            return {
              start: data.start,
              prev: data.current,
              current: util.parseDlogConsoleMessage(current)
            }
          else
            return data;
        }).skipDuplicates().changes();

        events.filter(function(item) { return item.prev == null; }).onValue(printStartTime);
        events.filter(function(item) { return item.prev != null; }).onValue(printRowItem);
      });

      return Q.defer().promise;
    }
  };

  function startSdbServer() {
    return shell.startDaemon("sdb", ["start-server"]);
  }

  function searchForDevice() {
      var deferred = Q.defer();
      grunt.log.writeln("Searching for connected devices...");

      (function check() {
        shell.exec("sdb", ["devices"])
          .fail(function(e) { deferred.reject(e); })
          .done(function(t) {
            var lines = t.split("\n");
            if (lines.length < 2) {
              grunt.log.writeln("Device not found...");
              setTimeout(check, 2000);
            } else {
              grunt.log.writeln("Device found: " + lines[1]);
              deferred.resolve();
          }
        });
      })();

      return deferred.promise;
  }

  function executeAllTasks() {
    var tasks = getConfig().tasks;
    for (var taskName in tasks) {
      grunt.task.run(taskName);
    }
  }

  function getAppType(rootPath) {
    if (util.existingPath(rootPath, "config.xml")) {
      return "WEB"
    }
    else if (util.existingPath(rootPath, "manifest.xml")) {
      return "NATIVE";
    }
    else {
      grunt.fail.warn("Tizendev should be run from folder with either config.xml or manifest.xml");
    }
    ;
  }

  function getAppTypeSpecificTasks() {
    var sourceDir = getConfig().sourceDir;
    switch (getAppType(sourceDir)) {
      case "NATIVE" :
        return nativeApp
      default :
        return webApp;
    }
  }

    // SETTINGS
  function getConfig() {
    return grunt.config("tizendev");
  }

  function getProjectFilePath(file) {
    return path.join(getConfig().sourceDir, file);
  }

  function excludeBuildFolderFilter(config) {
    return "!" + path.join(path.relative(config.sourceDir, config.buildPath), "/**");
  }

  return tasks;
};