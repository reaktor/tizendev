# tizendev

> Tizendev - Develop Tizen web apps from command line
 
 Tizendev consists of two separate and independent tool collections: 
 1. tizendev
    * Build, deploy and run Tizen Apps (Web, Hybrid and Native)
    * Profile (Web)
    * Watch changes (Web, Hybrid (only for web part)  and Native)
    * Debug  (Web)
 2. FPS Measurement Tools (fps-measurement/)
    * Measure FPS of Tizen Web App
 
## Requirements

Before you try to use Tizendev plugin, make sure to install the latest version of `nodeJS`. Then install Grunt command-line helper (`npm install -g grunt-cli`).

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. 

The [tizen-sdk](https://developer.tizen.org/downloads/tizen-sdk) installation is also required. Tizendev uses the commandline tools provided by the sdk and the signing profile configurations created by the IDE.

## Getting Started
Tizendev makes it easier to build, run, install and debug Tizen Apps from command line.

First you have to create your signing profile using Tizen-IDE so that the "~/workspace/.metadata/.plugins/org.tizen.common.sign/profiles.xml" gets created.

There are two ways to use the plugin:

* *Global install*. The easier choice. No project-specific configuration is made. The plugin is launched using `tizendev` script. Configuration settings can be overridden as command-line arguments to `tizendev`. Additional tasks, such as minifying, can't be specified.

* *Local install*. The plugin is installed as a Grunt plugin to the project. Project-specific settings, such as complex Grunt tasks, can be specified. 



### "Global" install

If you don't want to install the plugin for every application you develop, you can install it globally to be able to use most of the functionality.

Clone the repository, and run `npm install` in that directory.

Then edit the default settings in Gruntfile.js. At least, configure signing options: the name of profile specified in profiles.xml and optionally the name of profile in profiles.xml. The settings should be the same you have configured in Tizen-IDE.

```js
    tizendev: {
      profile: "nameOfProfile", // if left empty, this is parsed from profiles.xml
      profilePath: "~/workspace/.metadata/.plugins/org.tizen.common.sign/profiles.xml",
      tasks: {
      }
    }
```

Remember to add the cloned repository to system path so that `tizendev` shell script can be run from any project folder.

To build and run Tizen  apps, go to a project directory (directory containing config.xml or manifest.xml) and execute the `tizendev` shell script. The script will launch Grunt and configure the plugin to use the current working directory.

```
cd ~/projectDirectory
tizendev taskName
```

For valid task names, see `Tasks`.

Settings in Gruntfile.js apply to all projects. You can override any setting that is a string, number or array by specifying it as an argument:

```
tizendev profile --profilingTimes=5
```
For configuration options, see `Configuring the "tizendev" task`.


### Local install

By installing Tizendev locally, you can use it as a Grunt plugin, and unleash the full potential of Grunt tasks and plugins. For example, you can minify JS files on fly.

First, clone Tizendev to a folder. Then, go to your web app project folder and install the plugin using npm:

`npm install path-to-tizendev/`

Also, install Grunt locally if it hasn't been installed already:

`npm install grunt@0.4.1 --save-dev`

Then install dependencies:

`npm install grunt-contrib-copy --save-dev`

`npm install grunt-contrib-watch --save-dev`

`npm install grunt-tizen --save-dev`

Once the plugin has been installed, it may be enabled inside your Gruntfile with these lines of JavaScript:

```js
grunt.loadNpmTasks("grunt-contrib-watch");
grunt.loadNpmTasks("grunt-contrib-copy");
grunt.loadNpmTasks("grunt-tizen");
grunt.loadNpmTasks('tizendev');
```

The plugin is ran like any other Grunt plugin: 
```
grunt tizendev:taskname [optional arguments]
```

for example:

```
grunt tizendev:profile --profilingTimes=5
```

## Configuring the "tizendev" task

### Overview

These settings are set in Gruntfile.js. If you use a global install, the file is located in the same folder as `tizendev` script file. If you use local install, the file is located in your web app folder.

In your Gruntfile, add a section named `tizendev` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  tizendev: {
    // Config goes here.
  },
})
```
### Options

These default options can be set in `Gruntfile.js`. Any string, number or array setting can also be overriden by specifying it as an argument to Tizendev script or Grunt.

```js
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
      buildPath: "CommandLineBuild", // build folder, must NOT be project root. If developing native project changing this value breaks the build system
      fileChanged: undefined, // custom function to execute after file change. Receives file name as argument.
      remoteAppLocation: "/opt/usr/apps/<%=tizendev.appId%>/res/wgt/", // Application directory on tizen device. appId is determined runtime.
      profilingEvents: ["launch request : <%=tizendev.fullAppId%>", "getUri(): default uri", "E_PARSED", "E_LOADED"], // Log events that trigger profiling
      profilingTimes: 1, // number of profiling attempts
      profilingSleep: 5, // seconds between profiling rounds
      nativePath: "", // native project that should be linked to a hybrid app
      liveReload: true, // enable livereload server when in debug mode
      tizenAppScriptDir: "/" //Folder where grunt-tizen dependency puts its' helper script tizen-app.sh
    };
```

### Sample Gruntfile.js

This example applies only when using *local* install.

```js
module.exports = function(grunt) {
  grunt.initConfig({
    tizendev: {
      // Set signing options
      profilePath: "~/workspace/.metadata/.plugins/org.tizen.common.sign/profiles.xml",
      
      // profile name can be specified but usually it is not necessary
      // profile: "profile",

      // Trigger uglify task on build and when any file matching js/*.js changes.
      tasks: {
        "uglify": "js/*.js"
      },
      
      // Exclude all js files under js/ folder from build. They aren't needed, because the source code is minified and copied to build directory in uglify task.
      copyExclude: ["!js/**/*.js"]
    },

    // Configure grunt-contrib-uglify plugin to minimize all files under js/ folder and save the result in build directory
    uglify: {
      target: {
        files: {
          "tizendevbuild/minimized.js": "js/*.js"
        }
      }
    }
  });

  // Load dependencies
  grunt.loadNpmTasks("grunt-contrib-copy");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-tizen");
  // Load the plugin
  grunt.loadNpmTasks("tizendev");
  // Load uglify plugin
  grunt.loadNpmTasks("grunt-contrib-uglify");
};

```
### Hybrid application
Use --nativePath=../path to define the location of the native service, which should be linked to the application.

### Tasks

#### tizendev:develop

- run all tasks needed to start developing an app:
  * `connect`
  * `targetImage'
  * `build`
  * `sign`
  * `package`
  * `uninstall` (this helps to avoid some bugs in installation process)
  * `install`
  * `restart`
  * `watch`

#### tizendev:connect

- poll `sdb devices` until a target device is connected

#### tizendev:targetImage

- show target device image version

#### tizendev:clean

- remove the build directory

#### tizendev:build
Web:

 * run `clean`

 * copy files using `copy` filter to the build folder

 * then execute tasks mentioned in `tasks`

Hybrid:

 * run `clean`
 * generates make file for native app and builds the native part
 * copies the built native part to the web build folder
 * copy files using `copy` filter to the build folder
 *  then execute tasks mentioned in `tasks`

#### tizendev:start, stop, restart

- start/stop/restart application

#### tizendev:sign
- Web/Hybrid:
 * sign files in build folder (run `build` prior to `sign`)

 * `profile` and `profilePath` options must be specified

 * tizen CLI will not throw error if signing fails!

- Native
 * packaging task handles signing

#### tizendev:package
- Web/Hybrid
 * create widget from all files in build folder

 * widget file is saved to current working directory

 * app in build folder must be signed before calling package

 * previous widget file is removed

- Native
  * signs and creates the .tpk file from the files in CommandLineBuild directory

#### tizendev:install

- install widget or .tpk package file to the target device

- uses the widget or .tpk file created by `package` command

#### tizendev:uninstall

- uninstall widget or package from target device

#### tizendev:watch

- Web
 *  watch for changes in files defined by `files` option
 * if changed file matches `copy` filter, the file is copied
 * if changed file matches a filter in `tasks`, the task(s) is executed
 *  finally, all changed files in build directory are transferred to phone and the application is restarted

- Native
 * watch for changes in files defined by `files` option
 * build application again if file changed
 * install built version to the phone and start it

#### tizendev:setDate

- set current date/time to target device

#### tizendev:profile

- Web/Hybrid
 * launch profiler
-Native
 * Not supported

### Debugging

- Web/Hybrid

Start the script with `--debug` argument. For example:

```
tizendev develop --debug
```

Then go to http://localhost:9090/inspector.html?page=1

If you have the LiveReload browser plugin (http://livereload.com) installed, the inspector will be automatically refreshed when files are updated on target device.

- Native
 * Not supported

### Profiling

The script can be used to measure start up times of your application. By running `profile` task, the script will launch the application and start monitor console log. When all required console messages have been received, the script displays the time it took to receive the messages and terminates the application.

By default, the profile script waits for console messages `E_PARSED` and `E_LOADED`. So, in appropriate locations, add

```js
console.log("E_PARSED"); // script has been parsed
```

and

```js
console.log("E_LOADED"); // app is ready to use
```

Then run `profile` and optionally specify how many times you want to repeat the profiling task.

```
tizendev profile --profilingTimes=5
```
### Using profiling with emulator
You have to run `dlogctrl set platformlog 1` in the emulator's shell to enable enough logging for the profiler. 
After running the command restart the emulator.

### Emulator and native applications
Remember to pass the --nativeTarget=i386 option so the application is built with right architecture.

### Troubleshooting
Installation may fail for many reasons. The error message will not tell the actual reason. Possible solutions:
* Have you accidentally included unnecessary signature files in source files? It seems to cause installation to fail. Remove all files except of necessary project files.
* Installation also fails if the target device's clock is in wrong time.
* OS X may add .DS_Store file to build directory after signing. This will make installation fail because package contents don't match the signature. Get rid of .DS_Store files in build path.
* If you try to compile the project in Eclipse, installation may fail if Tizendev build folder's signature files are included in the Eclipse project. The easiest solution is to remove the build folder. You can also set build path to point at some location outside the Eclipse project.
* If native application doesn't start check that you are using right nativeTarget option.
* Try running 'sdb root on' and see if that helps.

## Release History
_(Nothing yet)_

## Known Issues
- No support for referencing multiple native services from web app
- Native apps are built from ground up when files change.
- Hybrid applications don't watch for changes in native part of the app
- Packaging native applications throws errors from logger configuration. Doesn't effect the outcome of packaging.
- tizenAppScriptDir option's default value is "/" which is bad practice and should be fixed. There was permission problems
with /tmp folder which was the original value.


## License
```
The MIT License (MIT)

Copyright (c) 2013 Reaktor Innovations Oy

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
