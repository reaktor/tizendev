(function(window) {
	var $document = $(document);
	var time, released = true, logContent = "", prevX, prevY;

	function logTouchPosition(event) {
		prevX = event.touches[0].screenX;
		prevY = event.touches[0].screenY;
		log("MotionNotify", prevX, prevY);
	}

	function log() {
		logContent += [].slice.call(arguments, 0).join(" ") + "\n";
	}

	function logDelays() {
		var currentTime = (new Date()).getTime(), delay;
		if (time && (delay = (currentTime - time) / 1000) > 0) {
			log("Delay", delay);
		}

		time = currentTime;
	}

	function release() {
		released = true;
		log('ButtonRelease 1');
	}

	function interpolate(x1, y1, x2, y2, duration) {
		var total = Math.floor(duration / 10),
		count = 0;
		while(duration > 10) {
			prevX = x1 - Math.round(((x1-x2)/total) * count);
			prevY = y1 - Math.round(((y1-y2)/total) * count);
			log("MotionNotify", prevX, prevY);
			log("Delay", 0.010);
			count++;
			duration -= 10;
		}

	}

	document.addEventListener('touchstart', function(event) {
		if (!released) {
			release();
		}
		released = false;
		logDelays();
		logTouchPosition(event);
		log('ButtonPress 1');
	}, false);

	document.addEventListener('touchmove', function(event) {
		var currentTime = (new Date()).getTime();
		interpolate(prevX, prevY, event.touches[0].screenX, event.touches[0].screenY, currentTime - time);
		time = currentTime;
	}, false);

	document.addEventListener('touchend touchcancel touchleave', release, false);

	window.stopRecord = function() {
		if (!released) {
			release();
		}
		console.log(logContent);
		logContent = "";
		return "Recording ended, reset log";
	};

	console.log("Recording started...");
})(this);
