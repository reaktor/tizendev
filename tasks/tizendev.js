var path = require("path");
var fs = require("fs");
var Q =  require("q");

module.exports = function(grunt) {
   "use strict";

  var tasks = require("./lib/tasks.js")(grunt);
  var util = require("./lib/util.js")(grunt);
  var _ = grunt.util._;
  var config = null;
  var firstRun = true;

  var defaultConfig = {
    watch: ["**", "!node_modules/**"], // Files that trigger tizendev tasks. Should include all files that are monitored by copy and task filters. Build path is excluded automatically.
    watchExclude: [], // This is appended to watch - useful for excluding files in project's gruntfile
    copy: ["**", "!node_modules/**", "!*.wgt"], // What files to copy to build folder (and sync to phone).
    copyExclude: [], // This is appended to copy - useful for excluding files in project's gruntfile
    tasks: {}, // tasks to run after file change. for example: tasks: { "uglify": ["js/*.js", "otherfolder/**/*.js"] }
    sdkPath: "~/tizen-sdk",
    binPath: "<%=tizendev.sdkPath%>/tools/ide/bin/", // location of CLI tools
    libPath: "<%=tizendev.sdkPath%>/tools/ide/lib/", // location of CLI java libraries
    nativeTarget: "armel", //specify an architecture ("armel" | "i386")
    profile: "", // the name of the profile used for signing. If empty, profile name is parsed from profiles.xml
    profilePath: "", // location of profiles.xml
    sourceDir: ".", // root folder, ie. folder where config.xml is located
    buildPath: "CommandLineBuild", // build folder, must NOT be project root.
    fileChanged: undefined, // custom function to execute after file change. Receives file name as argument.
    remoteAppLocation: "/opt/usr/apps/<%=tizendev.appId%>/res/wgt/", // Application directory on tizen device. appId is determined runtime.
    profilingEvents: ["launch request : <%=tizendev.fullAppId%>", "getUri(): default uri", "E_PARSED", "E_LOADED"], // Log events that trigger profiling
    profilingTimes: 1, // number of profiling attempts
    profilingSleep: 5, // seconds between profiling rounds
    nativePath: "", // native project that should be linked to a hybrid app
    liveReload: true, // enable livereload server when in debug mode
    tizenAppScriptDir: "/" //Folder where grunt-tizen dependency puts its' helper script tizen-app.sh
  };

  function getConfig() {
    function replaceHomeDir(dir) {
      return dir.replace(/^~\//, process.env.HOME + '/');
    }

    if (!config) {
      var cmdLineConfig = getCmdLineConfig();

      config = _.extend(defaultConfig, grunt.config.get("tizendev"), cmdLineConfig);
      config.sdkPath = replaceHomeDir(config.sdkPath);
      config.binPath = replaceHomeDir(config.binPath);
      config.libPath = replaceHomeDir(config.libPath);
      config.profilePath = replaceHomeDir(config.profilePath);
      config.sourceDir = replaceHomeDir(config.sourceDir);
      config.fullAppId = util.getAppId(config.sourceDir);
      config.appId = config.fullAppId.split(".")[0];

      if (!util.isAbsolutePath(config.buildPath))
        config.buildPath = path.join(config.sourceDir, config.buildPath);

      if (path.resolve(config.sourceDir) == path.resolve(config.buildPath))
        grunt.fail.fatal("Build folder must not be the same as source folder");
    }

    return config;
  }

  function getCmdLineConfig() {
    return  _.reduce(defaultConfig, function(memo, value, key) {
      var arg = grunt.option(key);

      if (arg != null) {
        if (_.isString(value))
          memo[key] = arg;
        else if (_.isNumber(value)) {
          memo[key] = parseInt(arg, 10);
        } else if (_.isArray(value)) {
          memo[key] = arg.split(",");
        } else if (_.isBoolean(value)) {
          memo[key] = arg;
        }
      }
      return memo;
    }, {});
  }

  grunt.registerTask("tizendev", function(cmd) {
    grunt.config("tizendev", getConfig());
    grunt.config.set("tizen_configuration.configFile", path.join(getConfig().sourceDir, "config.xml"));
    grunt.config.set("tizen_configuration.tizenAppScriptDir", getConfig().tizenAppScriptDir);
    if (!cmd) {
      grunt.fail.warn("Tizendev task parameter not specified. Possible options: " + Object.keys(tasks).join(", ") + "\n");
    }

    if (firstRun) {
      console.log("Configuration:", config);
      console.log("\nStarting task: " + cmd);
      firstRun = false;
      tasks.setupWatchers();
    }

    var taskFunc = tasks[cmd];
    if (taskFunc) {
      var deferred = taskFunc.apply(this, arguments);
      if (deferred) {
        var async = this.async();
        deferred.done(async);
      }
    } else {
      grunt.fail.warn("Tizendev task " + cmd + " not found");
    }
  });
};
