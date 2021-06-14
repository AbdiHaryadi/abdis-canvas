currentTool = "pencil";
currentColor = "black";
canvasResolution = [800, 600];

colorCode = {
	"black": [0.0, 0.0, 0.0],
	"white": [1.0, 1.0, 1.0],
	"red": [237/255, 28/255, 36/255], // #ed1c24
	"yellow": [1.0, 242/255, 0.0], // #fff200
	"green": [34/255, 177/255, 76/255], // #22b14c
	"blue": [63/255, 72/255, 204/255] // #3f48cc
}

function main() {
	// Initialize system
	const canvas = document.querySelector("#mycanvas");
	const gl = canvas.getContext("webgl");
	
	if (gl === null) {
		alert("Tidak dapat menginisialisasi WebGL .-.");
		return;
	}
	
	/*
	var vertices = [-2, 2]; // vec2
	var vertexColors = [0.0, 0.0, 0.5]; // vec3
	var numPoints = 1;
	
	var vertex_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	
	var color_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexColors), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	*/
	
	// Buat shader
	var vertCode = `
		attribute vec2 coordinates;
		uniform vec2 resolution;
		attribute vec3 vColor;
		varying vec3 fColor;
		void main() {
			// Translation from canvas coordinate to zero-to-one coordinate
			vec2 zeroToOne = coordinates / resolution;
			
			// Multiply by two
			vec2 zeroToTwo = zeroToOne * 2.0;
			
			// Translate to center (initially in left-up)
			vec2 toCenterCoordinate = zeroToTwo + vec2(-1.0, -1.0);
			
			// Flip-y
			gl_Position = vec4(toCenterCoordinate * vec2(1.0, -1.0), 0.0, 1.0);
			
			// Now 0, 0 is in the center, x in [-1, 1], y in [-1, 1] like Cartesian
			
			// The rest
			gl_PointSize = 5.0;
			fColor = vColor;
		}
	`
	
	var vertShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertShader, vertCode);
	gl.compileShader(vertShader);	
		
	var fragCode = `
		precision mediump float;
		varying vec3 fColor;
		void main(void) {
			gl_FragColor = vec4(fColor, 1.0);
		}
	`;
	
	var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragShader, fragCode);
	gl.compileShader(fragShader);
	
	// Buat program
	var shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertShader);
	gl.attachShader(shaderProgram, fragShader);
	gl.linkProgram(shaderProgram);
	
	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		console.log(gl.getProgramInfoLog(shaderProgram));
		return;
	}
	
	gl.useProgram(shaderProgram);
	
	
	var vertex_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	var coord = gl.getAttribLocation(shaderProgram, "coordinates");
	gl.vertexAttribPointer(coord, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(coord);
	
	var resolutionLoc = gl.getUniformLocation(shaderProgram, "resolution");
	gl.uniform2fv(resolutionLoc, canvasResolution);
	
	var color_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
	var colorAttr = gl.getAttribLocation(shaderProgram, "vColor");
	gl.vertexAttribPointer(colorAttr, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(colorAttr);
	
	gl.clearColor(1.0, 1.0, 1.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	var numPoints = 0;
	vertices = [];
	colors = [];
	
	function drawWithPencil(x, y) {
		vertices = vertices.concat([x, y]);
		colors = colors.concat(colorCode[currentColor]);
		numPoints += 1;
		
		gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
		// gl.bindBuffer(gl.ARRAY_BUFFER, null);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
		// gl.bindBuffer(gl.ARRAY_BUFFER, null);
		
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.POINTS, 0, numPoints);
		// gl.drawArrays(gl.POINTS, numPoints - 1, 1);
		//requestAnimationFrame(drawWithPencil);
	}
	
	function onPencil(x, y) {
		gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices.concat([x, y])), gl.STATIC_DRAW);
		// gl.bindBuffer(gl.ARRAY_BUFFER, null);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors.concat(colorCode[currentColor])), gl.STATIC_DRAW);
		// gl.bindBuffer(gl.ARRAY_BUFFER, null);
		
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.POINTS, 0, numPoints + 1);
	}
	
	var onDrawing = false;
	canvas.addEventListener("mousemove", e => {
		if (onDrawing) {
			drawWithPencil(e.offsetX, e.offsetY);
		} else {
			onPencil(e.offsetX, e.offsetY);
		}
	});
	
	canvas.addEventListener("mousedown", e => {
		onDrawing = true;
		drawWithPencil(e.offsetX, e.offsetY);
	});
	
	canvas.addEventListener("mouseup", e => {
		onDrawing = false;
	});
	
	canvas.addEventListener("mouseleave", e => {
		onDrawing = false;
	});
	
	
}

function chooseTool(tool) {
	if (currentTool !== tool) {
		currentTool = tool;
		console.log("Current tool:", currentTool);
		changeInformation();
	}
}

function chooseColor(color) {
	if (currentColor !== color) {
		currentColor = color;
		console.log("Current color:", currentColor);
		changeInformation();
	}
}

function changeInformation() {
	desc = document.getElementById("information-desc");
	desc.innerHTML = "You are using " + currentColor + " " + currentTool + ".";
}

window.onload = main;