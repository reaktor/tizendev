# FPS Measurement Tools

This document describes how to create and run automated FPS measurement test
cases for Tizen HTML5 applications. The tests can be run in Linux or Mac OS X.

The FPS Measurement Tools support at least Tizen 2.2, but might also work on
earlier and/or later Tizen versions.


## Creating test cases

1. record necessary xmacros in webkit inspector using `macro_recorder.js`
   * paste it into inspector console, recording starts immediately
   * run stopRecord() to print out the xmacro and restart recording
   * copy and paste the xmacro into a file
2. you may also generate synthetic macros with `generate_linear_macro` and/or
   `generate_sine_macro` scripts
   * `generate_linear_macro` creates drag moves linearly from point A to point B
   * `generate_sine_macro` creates drag moves in a sine wave like motion along x
     or y axis
   * see `./generate_linear_macro --help` and `./generate_sine_macro --help`
3. xmacros can also be written manually
   * this might be the simplest way to create navigation macros (getting to the
     view under test)
   * see xmacro format description in http://xmacro.sourceforge.net/
   * To get element coordinates on the screen, you can use `xev` in `sdb shell`:
     1. Start application
     2. Find X11 window ID of the application: run `xwininfo` and tap the
        application on the screen.
     3. Run `xev -id <the_id_printed_by_xwininfo>`. This will now print all X11
        events related to the app's window.
4. write the actual test case that specifies the application ID to test and
   macros to run.
   * see `example_testcases/test_scrolling_overflow-scroll.fpstest` for an
     example

NOTE: The actual FPS-measuring part of the test case must be at least a few
seconds long to generate enough readings.


## Running test cases

To run a testcase, attach a target to the host machine in USB debugging mode
and run `fpstest test_case.fpstest`.

Alternatively, you can run `fpstest path_to_dir_with_one_fpstest`.

When running the script for the first time on a target, the target will need to
be rebooted before actual measurements can be run. The script will prompt the
user to reboot. After a successful test run, the tool will print the results:

 `FPS: 34.6 ± 2.84 (N=18)`

This means that the FPS average was 34.6 with a standard deviation of 2.84, and
the number of FPS readings was 18.

NOTE: Testing is based on playing back X11 events, so make sure that there are
no overlay elements or popups in the way of the test.


## Step-by-step tutorial: running a test case

This section walks through running actual test cases on an example application.
The application is designed to test FPS performance of different styles of
scrolling.

1. Install the example application on a target (emulator or device)
   * Connect a device or start the emulator
   * Turn on USB debugging in Settings if necessary
   * `sdb intall example_testcases/ScrollingPerformance.wgt`
2. If you prefer, play with the app a bit to get a feeling of what it does.
3. Run the test cases:
   * `./fpstest example_testcases/test_scrolling_translate3d.fpstest`
     * NOTE: if this is the first run of fpstest with the target, it must be
       rebooted. Run this command again after the reboot.
     * When the test case is running, you should see the app scrolling by itself.
     * When the test case finishes, fpstest will print a line like `FPS: 34.6 ± 2.84 (N=18)`
   * `./fpstest example_testcases/test_scrolling_webkit-overflow-scrolling-touch.fpstest`
   * `./fpstest example_testcases/test_scrolling_overflow-scroll.fpstest`
