var Q = require("q");
var path = require("path");
var Bacon = require("baconjs");
var spawn = require('child_process').spawn;
var fs = require('fs');

module.exports = function(grunt) {
  "use strict";

  var _ = grunt.util._;
  var util = require("./util.js")(grunt);

  function getBinPath(cmd) {
    return path.join(grunt.config("tizendev").binPath, cmd);
  }

  var shell = {
    exec: function(cmd, args, opts) {
      var deferred = Q.defer();

      this.spawn({
        cmd: cmd,
        args: args,
        opts: opts
      }, function(error, output) {
        if (error)
          deferred.reject(output);
        else
          deferred.resolve(output);
      });
      return deferred.promise;
    },

    execVerbose: function(cmd, args, opts) {
      var optsWithStdout = _.extend({}, { stdio: ['ignore', 1, 2]}, opts);
      return this.exec(cmd, args, optsWithStdout);
    },

    startDaemon: function(cmd, args) {
      var deferred = Q.defer();
      var proc = spawn(cmd, args, { stdio: ['ignore', 1, 2]});
      proc.on('close', deferred.resolve);
      return deferred.promise;
    },

    execSdbShell: function(cmd) {
      return this.exec("sdb", ["shell", cmd])
        .fail(grunt.fail.warn);
    },

    execSdb: function(args) {
      return this.exec("sdb", args)
        .fail(grunt.fail.warn);
    },

    sdbKill: function(appId) {
      return this.execSdbShell("wrt-launcher -k " + appId);
    },

    sdbDebug: function(appId) {
      return shell.exec(
        "sdb",
        ["shell", "wrt-launcher", "-d -s", appId]
      );
    },

    sdbDate: function(date) {
      if (date == null) {
        return shell.execSdbShell("date -R").then(function(output) {
          return new Date(output);
        });
      } else {
        var formattedDate = util.shellDateFormat(date);
        return shell.execSdb(["root", "on"]).then(function() { shell.execSdbShell("date -u " + formattedDate); });
      }
    },

    generateMakeFile: function(nativeAppPath) {
      return this.execVerbose(
        grunt.config("tizendev.binPath") + "native-gen" ,
        ["makefile", "-t", "app"],
        {cwd: nativeAppPath}
      );
    },

    buildNativeProject: function(nativeAppPath) {

      var makeFilePath = path.join(nativeAppPath, "CommandLineBuild");
      console.log(makeFilePath);
      if (!fs.existsSync(makeFilePath))
        grunt.fail.warn("Path not found: " + makeFilePath + ". Run generate make file first");
      else {
        return this.execVerbose(
          grunt.config("tizendev.binPath") + "native-make" ,
          ["-a", grunt.config("tizendev.nativeTarget")],
          {cwd: makeFilePath}
        );
      }
    },

    nativeAppToBuildPath: function(nativePath, buildPath, cwd) {
      return shell.exec(
        getBinPath("web-build"),
        [".", "-rp", nativePath, "--output", buildPath],
        {cwd: cwd}
      ).then(function() {
        return shell.removeDirectory(path.join(buildPath, "/res/wgt"));
      });
    },

    sign: function(profileName, profilePath, buildDir) {
      return this.execVerbose(
        getBinPath("web-signing"),
        ["-n", "-p", profileName + ":" + profilePath],
        {cwd: buildDir});
    },

    package: function(wgtName, buildPath) {
      var dsStoreFiles = grunt.file.expand(path.join(buildPath, "**/.DS_Store"));
      if (dsStoreFiles.length > 0)
        grunt.log.warn("Found .DS_Store files. Don't open build directory in Finder as it may change directory contents after signing. " +
          "(" + dsStoreFiles.join() + ")");

      return this.exec(
        getBinPath("webtizen"),
        ["-p", "-n", wgtName, buildPath]).then(grunt.log.writeln);
    },

    nativePackage: function(profileData, buildPath) {
        if(!util.existingPath(buildPath, "")){
            grunt.fail.warn("Build folder should exist already. Run build task first.");
        }
        return shell.execVerbose(
            getBinPath("native-packaging"),
            ["-ak", profileData.authorKeyPath, "-ap", profileData.authorKeyPassword,
            "-dc", profileData.distributorCAPath,
            "-dk", profileData.distributorKeyPath,
            "-dp", profileData.distributorPassword,
            "-dr", profileData.distributorRootCertificatePath],
            {cwd: buildPath})
    },

    nativeInstall: function(buildPath) {
        var tpkFiles = grunt.file.expand(path.join(buildPath, "**.tpk"));
        if(tpkFiles.length == 0){
            grunt.fail.warn("*.tpk package doesn't exist in build folder. You have to package the application first");
        }
        var tpkPackagePath = _.first(tpkFiles);

        return shell.execSdb(["root", "on"])
            .then(function() {
              return shell.execVerbose(

                  getBinPath("native-install"),
                  ["-p", tpkPackagePath],
                  {cwd: buildPath})
            });
    },

    nativeUninstall: function(appId) {
      return this.execSdbShell("pkgcmd -q -u -n " + appId);
    },

    nativeStart: function(appId) {
        return shell.execVerbose(
            getBinPath("native-run"),
            ["-p", appId]);
    },

    nativeStop: function(appId) {
        return this.execSdbShell("pkgcmd -k -n " + appId);
    },

    isWidgetStopped: function(appId) {
      return shell.exec(
        "sdb",
        ["shell", "wrt-launcher", "-r", appId]
      )
      .fail(grunt.fail.warn)
      .then(function(output) {
        return output.indexOf("result: running") < 0;
      });
    },

    installWidget: function(wgtName) {
      function install() {
        return shell.execVerbose(getBinPath("webtizen"), ["-i", "-w", wgtName]);
      }

      function isCorrectDate(targetDate) {
        return Math.abs(new Date().getTime() - targetDate.getTime()) < 1000*60*5;
      }

      function resetDateAndInstall() {
        return shell.sdbDate().then(function(targetDate) {
          if (!isCorrectDate(targetDate)) {
            grunt.log.warn("Target device's clock is not set correctly. Syncing target device's clock with host and trying again...");
            return shell.sdbDate(new Date()).then(install);
          }
        });
      }

      return install().fail(function(output) {
        grunt.log.error(output);
        return resetDateAndInstall().fail(function() {
            throw new Error("Installation failed.");
        });
      });
    },

    uninstallWidget: function(appId) {
      return shell.exec(
        "sdb",
        ["shell", "wrt-installer", "-un", appId]
      );
    },

    spawn: function(args, done) {
      return grunt.util.spawn(args, function(error, result, code) {
        done(error, result.stdout + (result.stderr.length > 0 ? "\n" + result.stderr : ""));
      });
    },

    readChildProcessOutput: function(childProcess) {
      var rl = require('readline');
      var reader = rl.createInterface(childProcess.stdout, childProcess.stdin);
      var bus = new Bacon.Bus();
      reader.on("line", function(data) { bus.push(data); });
      return bus;
    },

    removeDirectory: function(dir) {
      return shell.exec("rm", ["-rf", dir]);
    },

    clearDlog: function() {
      return shell.exec(
        "sdb",
        ["dlog", "-c"]
      );
    },

    getDlogProcess: function() {
      return shell.spawn({
        cmd: "sdb",
        args: ["dlog", "-v", "time", "EFL", "ConsoleMessage", "WRT", "WEBKIT", "AUL"]
      }, function(error, output) {
      });
    },

    getPlatformLevelLogging: function() {
      return shell.exec(
        "sdb",
        ["shell", "dlogctrl", "get",  "platformlog"]
      );  
    },

    setPlatformLevelLogging: function(enable) {
      return shell.exec(
        "sdb",
        ["shell", "dlogctrl", "set",  "platformlog", enable ? "1" : "0"]
      );  
    },

    enablePlatformLevelLoggingIfDisabled: function() {
      var that = this;
      var deferred = Q.defer();
      this.getPlatformLevelLogging()
      .then(function(result) {
        var enabled = result == "1"
        if(enabled) {
          deferred.resolve();
        }
        else {
          that.setPlatformLevelLogging(true)
          .then(function(){
            deferred.reject("Enabled platform level logging for profiling, please restart the target device");
          });
        }

      });
      return deferred.promise;
    }
  };

  return shell;
};