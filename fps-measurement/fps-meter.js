(function(window) {
	var requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame;
		
	var start = Date.now(), frames = 0;
	
	var callback = function() {
		frames++;
		requestAnimationFrame(callback);			
	};
	
	requestAnimationFrame(callback);
	
	window.reset = function() {
		var time = (Date.now()-start)/1000;
		console.log("Average FPS: " + (frames/time) + " - Frames: " + frames + " - Time: " + time + "s");
		start = Date.now();
		frames = 0;		
	};	
})(this);