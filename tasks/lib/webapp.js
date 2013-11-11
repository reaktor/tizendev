var path = require("path");

module.exports = function(grunt) {
    "use strict";

    var _ = grunt.util._;
    var util = require("./util.js")(grunt);
    var shell = require("./shell.js")(grunt);
    var nativeApp = require("./nativeApp.js")(grunt);

    function getConfig() {
        return grunt.config("tizendev");
    }

    var webApp = {

        build: function() {
            return buildNativeAppIfNecessary().then(buildWidget);
        }
    };

    function buildNativeAppIfNecessary() {
        var nativeAppPath = getConfig().nativePath;

        if (nativeAppPath.length > 0) {
            if (!util.isAbsolutePath(nativeAppPath))
                nativeAppPath = getProjectFilePath(nativeAppPath);

            grunt.log.writeln("Linking native application: " + nativeAppPath);
            return nativeApp.build(nativeAppPath).then(function() {
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

    return webApp;
};