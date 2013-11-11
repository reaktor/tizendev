var Q = require("q");
var path = require("path");
var fs = require('fs');

module.exports = function(grunt) {
    "use strict";

    var util = require("./util.js")(grunt);
    var shell = require("./shell.js")(grunt);

    function getBinPath(cmd) {
        return path.join(grunt.config("tizendev").binPath, cmd);
    }

    function getConfig() {
        return grunt.config("tizendev");
    }

    var nativeApp = {

        build: function(nativeAppPath) {
            if (nativeAppPath) {

                if (!fs.existsSync(nativeAppPath))
                    grunt.fail.warn("Path not found: " + nativeAppPath);
                else {
                    return  shell.generateMakeFile(nativeAppPath)
                        .then(function(){
                            return shell.buildNativeProject(nativeAppPath);
                        });
                }
            }
        }
    };

    return nativeApp;
};