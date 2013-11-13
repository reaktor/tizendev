var Q = require("q");
var fs = require("fs");
var path = require("path");
var http = require("http");
var url = require("url");
var ET = require("elementtree");

module.exports = function(grunt) {
  "use strict";

  var _ = grunt.util._;

  var util = {
    getModifiedDates: function(dir) {
      var files = {};
      grunt.file.recurse(dir, function(path) {
        var stat = fs.statSync(path);
        files[path] = stat.mtime.getTime();
      });
      return files;
    },

    diffModifiedDates: function(files1, files2) {
      var added = [];
      var modified = [];

      _.each(files2, function(modified2, path2) {
        var modified1 = files1[path2];
        if (modified1) {
          if (modified1 != modified2)
            modified.push(path2);
        } else {
          added.push(path2);
        }
      });

      return {
        added: added,
        modified: modified
      };
    },

    isAbsolutePath: function(dirName) {
      var trimmed = dirName.trim();
      return trimmed.length > 0 && trimmed.charAt(0) == "/";
    },

    shellDateFormat: function(date) {
      function f(num) {
        return num < 10 ? "0" + num : num+"";
      }
      return f(date.getUTCMonth()+1) + f(date.getUTCDate()) + f(date.getUTCHours()) + f(date.getUTCMinutes()) + date.getUTCFullYear();
    },

    execUntilTrue: function(deferredFunc) {
      var deferred = Q.defer();

      var exec = function() {
        deferredFunc()
          .fail(grunt.fail.warn)
          .done(function(isTrue) {
            if (isTrue)
              deferred.resolve();
            else
              exec();
          });
      };
      exec();

      return deferred.promise;
    },

    execTimes: function(deferredFunc, times, sleep) {
      var deferred = Q.defer();
      var allResults = [];
      (function exec() {
        deferredFunc()
          .fail(grunt.fail.warn)
          .done(function(results) {
            allResults.push(results);
            if (allResults.length >= times)
              deferred.resolve(allResults);
            else
              setTimeout(exec, sleep);
          });
      })();
      return deferred.promise;
    },

    existingPath: function(base, fileName) {
      var file = path.join(base, fileName);
      if (grunt.file.exists(file))
        return file;
      else
        return null;
    },

    isBuildDirectory: function(rootPath, buildDir) {
      var webAppConfig = this.existingPath(buildDir, "config.xml");
      var hybridAppConfig = this.existingPath(buildDir, "res/wgt/config.xml");
      var nativeAppConfig = this.existingPath(buildDir, "../manifest.xml");

      if (nativeAppConfig){
        return true;
      }

      var configFile = webAppConfig || hybridAppConfig

      if (configFile) {
        var buildAppId = this.getAppId(path.dirname(configFile));
        var projectAppId = this.getAppId(rootPath);
        return buildAppId === projectAppId;
      } else {
        return false;
      }
    },

    removeDsStoreFiles: function(baseDir) {
      var dsStoreFiles = grunt.file.expand(path.join(baseDir, "**/.DS_Store"));
      dsStoreFiles.forEach(function(filepath) {
        grunt.log.warn("Removing " + filepath);
        fs.unlink(filepath);
      });
    },

    isEmptyDirectory: function(dir) {
      return fs.readdirSync(dir).length === 0;
    },

    getAppId: function(configurationXmlPath) {
        console.log(configurationXmlPath);
        if(this.existingPath(configurationXmlPath, "config.xml")){
            return getWebAppId(path.join(configurationXmlPath, "config.xml"))
        }else if(this.existingPath(configurationXmlPath, "manifest.xml")){
            return getNativeAppId(path.join(configurationXmlPath, "manifest.xml"))
        }
        else{
            grunt.fail.warn("Tizendev should be run in a folder with either config.xml or manifest.xml");
        }
    },

    getSigningProfileName: function (profilesXmlPath, profileName) {
      var deferred = Q.defer();
      var parse = require('xml2js').parseString;

      if (profileName) {
        deferred.resolve(profileName);
      } else {
        parse(grunt.file.read(profilesXmlPath), {attrkey: "attr"}, function (err, result) {
          if (err)
            deferred.reject("Can't parse " + profilesXmlPath);
          else {
            try {
              deferred.resolve(_.first(result.profiles.profile).attr.name);
            } catch (e) {
              deferred.reject("Can't find profile in " + profilesXmlPath);
            }
          }
        });
      }
      return deferred.promise;
    },

    applyGruntTemplate: function(array) {
      return _.map(array, function(str) {
        return grunt.template.process(str, { data: grunt.config("tizendev")});
      });
    },

    resolvedPromise: function() {
      return Q.fcall(function() { return true; });
    },

    triggerLiveReload: function() {
      util.httpPost("http://localhost:35729/changed", {
        files: "http://localhost:9090/inspector.html"
      });
    },

    parseDlogRow: function(row) {
      var regexp = /^([^a-zA-Z]+)/;
      var match = regexp.exec(row);
      if (match != null) 
        return { row: row, time: new Date(match[1]) };
      else
        return null;
    },

    parseDlogConsoleMessage: function(row) {
      var regexp = /^([^a-zA-Z]+).*?:(.*)/;
      var match = regexp.exec(row);
      if (match != null)
        return { row: row, time: new Date(match[1]), message: match[2].trim() };
      else
        return null;
    },

    httpPost: function(uri, data) {
      var uri = url.parse(uri);
      var options = {
        hostname: uri.hostname,
        port: uri.port,
        path: uri.pathname,
        method: 'POST'
      };

      var req = http.request(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
          grunt.verbose.writeln('BODY: ' + chunk);
        });
      });

      req.on('error', function(e) {
        grunt.verbose.writeln('Problem with request: ' + e.message);
      });

      req.write(JSON.stringify(data));
      req.end();
    }
  };

  return util;

  function getWebAppId(configXmlPath) {
      var configXml = grunt.file.read(configXmlPath);
      var regexp = new RegExp("<tizen:application[^>]*?id=['\"](.*?)['\"]","i");
      var matches = regexp.exec(configXml);
      if (matches.length > 0) {
          var appId =  matches[1];
          if (appId.indexOf(".") < 0)
              grunt.fail.fatal("AppId is in unsupported format: " + appId);
          return appId;
      } else {
          grunt.fail.warn("application id not found in config.xml");
      }
  }

  function getNativeAppId(manifestXmlPath) {
      var manifestXml = grunt.file.read(manifestXmlPath);
      var xml = ET.parse(manifestXml);
      var appId =  xml.getroot().find("./Id").text;
      if(!appId){
          grunt.fail.warn("application id not found in manifest.xml");
      }
      return appId;
  }
};
