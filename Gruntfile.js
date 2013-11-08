'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({

    /* Configure the plugin so that it can be used through tizendev shell command */
    tizendev: {
      profilePath: "~/workspace/.metadata/.plugins/org.tizen.common.sign/profiles.xml",
      tasks: {
      }
    },

    jshint: {
      options: {
        eqnull: true,
        sub: true
      },
      all: ["tasks/**/*.js"]
    }
  });

  // Load dependencies
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks("grunt-contrib-copy");
  grunt.loadNpmTasks("grunt-tizen");

  // Load plugin
  grunt.loadTasks('tasks');

  //Jshint
  grunt.loadNpmTasks('grunt-contrib-jshint');
};
