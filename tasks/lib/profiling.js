 module.exports = function(grunt) {
  "use strict";
  var _ = grunt.util._;
  var util = require("./util.js")(grunt);
  var shell = require("./shell.js")(grunt);
  var Q =  require("q");

  var profiling = {
    printProfilingRow: function(row) {
      _.each(getProfilingEventNames(), function(eventName) {
        grunt.log.write(eventName + " " + row[eventName] + " ms | ");
      });
      grunt.log.writeln();
      return row;
    },

    printProfilingResult: function (rows) {
      grunt.log.writeln("Averages: (n=" + rows.length + ")");
      var columns = rowsToColumns(rows);
      _.each(columns, function(column) {
        var i = average(column.data);
        grunt.log.write(column.name + " ");
        grunt.log.write(Math.round(i.mean) + " ± " + Math.round(i.deviation) + " ms | ");
      });
      grunt.log.writeln("");
    },

    waitDLogEvents: function() {
      var deferred = Q.defer();
      var child = shell.getDlogProcess();
      var events = util.applyGruntTemplate(getConfig().profilingEvents);

      function mapEvent(line) {
        var evtName = _.find(events, function(eventName) { return line.indexOf(eventName) >= 0; });
        if (evtName)
          return { event: evtName, line: line };
        else
          return null;
      }

      function notNull(evt) {
        return evt != null;
      }

      shell.readChildProcessOutput(child)
        .map(mapEvent)
        .filter(notNull)
        .slidingWindow(events.length, events.length)
        .take(1)
        .map(formatEvents)
        .map(calcDifferences)
        .doAction(function() { child.kill("SIGKILL"); })
        .onValue(deferred.resolve);

      return deferred.promise;
    },

    getStartEventName: function() {
      var profilingEvents = util.applyGruntTemplate(getConfig().profilingEvents);
      return profilingEvents[0];
    }
  };

  function rowsToColumns(rows) {
    var eventNames = getProfilingEventNames();
    return _.reduce(eventNames, function(memo, colName) {
      var column = [];
      _.each(rows, function(row) {
        column.push(row[colName]);
      });
      memo.push({name: colName, data: column});
      return memo;
    }, []);
  }

  function getProfilingEventNames() {
    return _.chain([getConfig().profilingEvents, "TOTAL"]).flatten().rest().value();
  }

  function formatEvents(lines) {
    var regexp = /^([^a-zA-Z]+)/;
    return _.chain(lines).map(function(evt) {
      var match = regexp.exec(evt.line);
      if (match != null)
        return { event: evt.event, time: new Date(match[0])};
      else
        return null;
    }).compact().value();
  }

  function average(a) {
    var r = {mean: 0, variance: 0, deviation: 0}, t = a.length;
    for(var m, s = 0, l = t; l--; s += a[l]);
    for(m = r.mean = s / t, l = t, s = 0; l--; s += Math.pow(a[l] - m, 2));
    return r.deviation = Math.sqrt(r.variance = s / t), r;
  }

  function calcDifferences(events) {
    var result = {};
    for (var i=1; i<events.length; i++) {
      var evt = events[i];
      result[evt.event] = evt.time.getTime() - events[i-1].time.getTime();
    }

    result["TOTAL"] = _.last(events).time.getTime() - _.first(events).time.getTime();
    return result;
  }

  function getConfig() {
    return grunt.config("tizendev");
  }

  return profiling;
};