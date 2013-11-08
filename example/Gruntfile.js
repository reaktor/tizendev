'use strict';

// Real life example

module.exports = function(grunt) {

  var files = grunt.file.readJSON('./files.json');

  grunt.initConfig({
    tizendev: {
      profilePath: "~/workspace/.metadata/.plugins/org.tizen.common.sign/profiles.xml",

      /* Run uglify and cssmin when a source file changes */
      tasks: {
        uglifyTask: ["app/**/*.js"],
        cssmin: ["css/**/*.css"]
      }
    },

    // configuration for uglify plugin
    uglify: {
      // production target: minimize the files
      prod: {
        options: {
          compress: true,
          beautify: false,
          mangle: false,
          preserveComments: 'some'
        },
        files: {
          '<%=tizendev.buildPath%>/app/app-minified.js': files.js
        }
      },

      // dev target: concat the files and create source maps
      dev: {
        options: {
          sourceMapRoot: '',
          sourceMap: 'tizendevbuild/app/app-minified.js.map',
          sourceMappingURL: 'app-minified.js.map',
          compress: false,
          mangle: false,
          beautify: true
        },
        files: {
          '<%=tizendev.buildPath%>/app/app-minified.js': files.js
        }
      }
    },

    // configuration for cssmin plugin
    cssmin: {
      combine: {
        files: {
          '<%=tizendev.buildPath%>/css/style-minified.css': files.css
        }
      }
    }

  });

  // Load dependencies for Tizendev
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks("grunt-contrib-copy");
  grunt.loadNpmTasks("grunt-tizen");

  // Load Tizendev plugin
  grunt.loadNpmTasks('tizendev');

  // Load additional tasks
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-contrib-cssmin");

  // Run uglify:prod or uglify:dev target depending on 'usemin' command-line argument.
  var uglifyTask = "uglify:prod";
  if(grunt.option('usemin') === false){
    uglifyTask = "uglify:dev";
  }
  grunt.registerTask("uglifyTask", [uglifyTask]);
};
