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
	var pencilVertices = [-2, 2]; // vec2
	var vertexColors = [0.0, 0.0, 0.5]; // vec3
	var numPoints = 1;
	
	var vertex_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pencilVertices), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	
	var color_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexColors), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	*/
	
	// Buat shader
	var vertCode = `
		attribute vec3 coordinates; // z should be nonnegative
		uniform vec2 resolution;
		uniform float maxZValue;
		attribute vec3 vColor;
		varying vec3 fColor;
		void main() {
			// Translation from canvas coordinate to zero-to-one coordinate
			vec3 zeroToOne = coordinates / vec3(resolution, 1.0);
			
			// Multiply by two
			vec3 zeroToTwo = zeroToOne * vec3(2.0, 2.0, 1.0);
			
			// Translate to center (initially in left-up)
			vec3 toCenterCoordinate = zeroToTwo + vec3(-1.0, -1.0, 0.0);
			
			// Adjust depth (for avoid z-clip)
			vec3 adjustedDepth = toCenterCoordinate * vec3(1.0, 1.0, -1.0 / maxZValue);
			// Ini menunjukkan semakin negatif, semakin dapat dilihat
			
			// Flip-y
			gl_Position = vec4(adjustedDepth * vec3(1.0, -1.0, 1.0), 1.0);
			
			// Now 0, 0 is in the center, x in [-1, 1], y in [-1, 1] like Cartesian
			
			// The rest
			gl_PointSize = 5.0;
			fColor = vColor;
		}
	`;
	
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
	gl.vertexAttribPointer(coord, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(coord);
	
	var resolutionLoc = gl.getUniformLocation(shaderProgram, "resolution");
	gl.uniform2fv(resolutionLoc, canvasResolution);
	
	var maxZValueLoc = gl.getUniformLocation(shaderProgram, "maxZValue");
	gl.uniform1f(maxZValueLoc, 100000.0); // Maximum vertices
	
	var color_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
	var colorAttr = gl.getAttribLocation(shaderProgram, "vColor");
	gl.vertexAttribPointer(colorAttr, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(colorAttr);
	
	gl.clearColor(1.0, 1.0, 1.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.enable(gl.DEPTH_TEST);
	
	var numPoints = {
		"pencil": 0,
		"line": 0,
		"shape": 0
	}
	
	var vertices = {
		"pencil": [],
		"line": [],
		"shape": []
	}
	
	var colors = {
		"pencil": [],
		"line": [],
		"shape": []
	}
	
	function getTriangulationOfShape() {
		var resultVertices = [];
		var resultColors = [];
		for (var i = 0; i < numPoints["shape"]; i++) {
			resultVertices = resultVertices.concat([
				vertices["shape"][3 * i], vertices["shape"][3 * i + 1], vertices["shape"][3 * i + 2]
			]);
			resultColors = resultColors.concat([
				colors["shape"][3 * i], colors["shape"][3 * i + 1], colors["shape"][3 * i + 2]
			]);
			if (i % 4 == 2) {
				// Concat lagi
				resultVertices = resultVertices.concat([
					vertices["shape"][3 * i], vertices["shape"][3 * i + 1], vertices["shape"][3 * i + 2]
				]);
				resultColors = resultColors.concat([
					colors["shape"][3 * i], colors["shape"][3 * i + 1], colors["shape"][3 * i + 2]
				]);
			} else if (i % 4 == 3) {
				// Concat vertex sebelumnya yang sebagai titik pertama
				resultVertices = resultVertices.concat([
					vertices["shape"][3 * i - 9], vertices["shape"][3 * i - 8], vertices["shape"][3 * i - 7]
				]);
				resultColors = resultColors.concat([
					colors["shape"][3 * i - 9], colors["shape"][3 * i - 8], colors["shape"][3 * i - 7]
				]);
			}
		}
		
		return {
			"numPoints": numPoints["shape"] * 3 / 2,
			"vertices": resultVertices,
			"colors": resultColors
		}
	}
	
	function totalVertices() {
		return numPoints["pencil"] + numPoints["line"] + numPoints["shape"];
	}

	currentStartPoint = [-100, -100];
	currentStopPoint = [-100, -100];
	
	function getCornersOfSquare() {
		var centerPoint = [
			(currentStartPoint[0] + currentStopPoint[0]) / 2,
			(currentStartPoint[1] + currentStopPoint[1]) / 2
		];
		
		var centerToStartVector = [
			currentStartPoint[0] - centerPoint[0],
			currentStartPoint[1] - centerPoint[1]
		];
		
		var leftUpPoint = [].concat(currentStartPoint);
		var rightUpPoint = [
			centerPoint[0] - centerToStartVector[1],
			centerPoint[1] + centerToStartVector[0]
		];
		var rightDownPoint = [].concat(currentStopPoint)
		
		var leftDownPoint = [
			centerPoint[0] + centerToStartVector[1],
			centerPoint[1] - centerToStartVector[0]
		];
		
		return [leftUpPoint, rightUpPoint, rightDownPoint, leftDownPoint];
	}
	
	function drawWithPencil(x, y) {
		vertices["pencil"] = vertices["pencil"].concat([x, y, totalVertices()]);
		colors["pencil"] = colors["pencil"].concat(colorCode[currentColor]);
		numPoints["pencil"] += 1;
		
		render();
	}
	
	function pointing(x, y) {
		render();
		
		gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x, y, totalVertices() + 1]), gl.STATIC_DRAW);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorCode[currentColor]), gl.STATIC_DRAW);
		
		gl.drawArrays(gl.POINTS, 0, 1);
	}
	
	function render() {
		gl.clear(gl.COLOR_BUFFER_BIT);
		
		if (numPoints["pencil"] > 0) {
			gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices["pencil"]), gl.STATIC_DRAW);
			
			gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors["pencil"]), gl.STATIC_DRAW);
			
			gl.drawArrays(gl.POINTS, 0, numPoints["pencil"]);
		}
		
		if (numPoints["line"] > 0) {
			gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices["line"]), gl.STATIC_DRAW);
			
			gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors["line"]), gl.STATIC_DRAW);
			
			gl.drawArrays(gl.LINES, 0, numPoints["line"]);
		}
		
		if (numPoints["shape"] > 0) {
			triangulationResult = getTriangulationOfShape();
			gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangulationResult["vertices"]), gl.STATIC_DRAW);
			
			gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangulationResult["colors"]), gl.STATIC_DRAW);
			
			gl.drawArrays(gl.TRIANGLES, 0, triangulationResult["numPoints"]);
			
		}
		
	}
	
	function drawLineHelper() {
		var minDistance = 25;
		var pointsToDraw = currentStartPoint.concat([totalVertices()] + 1);
		var pointsToDraw = pointsToDraw.concat(currentStopPoint.concat([totalVertices()] + 1));
		var colorForPointsToDraw = colorCode[currentColor].concat(colorCode[currentColor]);
		
		var numberOfPointsInBetween = Math.sqrt(
			Math.pow(currentStartPoint[0] - currentStopPoint[0], 2)
			+ Math.pow(currentStartPoint[1] - currentStopPoint[1], 2)
		) / minDistance;
		numberOfPointsInBetween = Math.floor(numberOfPointsInBetween);
		
		for (var i = 0; i < numberOfPointsInBetween; i++) {
			pointsToDraw = pointsToDraw.concat(
				[currentStartPoint[0] * (numberOfPointsInBetween - i) / (numberOfPointsInBetween + 1)
					+ currentStopPoint[0] * (i + 1) / (numberOfPointsInBetween + 1),
				currentStartPoint[1] * (numberOfPointsInBetween - i) / (numberOfPointsInBetween + 1)
					+ currentStopPoint[1] * (i + 1) / (numberOfPointsInBetween + 1),
				totalVertices() + 1
				]
			);
			colorForPointsToDraw = colorForPointsToDraw.concat(colorCode[currentColor]);
		}
		
		// var maxZValueLoc = gl.getUniformLocation(shaderProgram, "maxZValue");
		// gl.uniform1f(maxZValueLoc, totalVertices() + numberOfPointsInBetween + 2);
		
		render();
		
		gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pointsToDraw), gl.STATIC_DRAW);
		// gl.bindBuffer(gl.ARRAY_BUFFER, null);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorForPointsToDraw), gl.STATIC_DRAW);
		// gl.bindBuffer(gl.ARRAY_BUFFER, null);
		
		gl.drawArrays(gl.POINTS, 0, numberOfPointsInBetween + 2);
			
	}
	
	function drawRectangleHelper() {
		render();
		
		var minDistance = 25.0;
		var pointsToDraw = [
			currentStartPoint[0], currentStartPoint[1], totalVertices() + 1,
			currentStartPoint[0], currentStopPoint[1], totalVertices() + 1,
			currentStopPoint[0], currentStartPoint[1], totalVertices() + 1,
			currentStopPoint[0], currentStopPoint[1], totalVertices() + 1];
		var colorForPointsToDraw = colorCode[currentColor]
			.concat(colorCode[currentColor])
			.concat(colorCode[currentColor])
			.concat(colorCode[currentColor]);
		
		var numberOfWidthPointsInBetween =
			Math.abs(currentStartPoint[0] - currentStopPoint[0]) / minDistance;
		numberOfWidthPointsInBetween = Math.floor(numberOfWidthPointsInBetween);
		
		for (var i = 0; i < numberOfWidthPointsInBetween; i++) {
			pointsToDraw = pointsToDraw.concat([
				currentStartPoint[0] * (numberOfWidthPointsInBetween - i) / (numberOfWidthPointsInBetween + 1)
					+ currentStopPoint[0] * (i + 1) / (numberOfWidthPointsInBetween + 1),
				currentStartPoint[1],
				totalVertices() + 1	
			]);
			pointsToDraw = pointsToDraw.concat([
				currentStartPoint[0] * (numberOfWidthPointsInBetween - i) / (numberOfWidthPointsInBetween + 1)
					+ currentStopPoint[0] * (i + 1) / (numberOfWidthPointsInBetween + 1),
				currentStopPoint[1],
				totalVertices() + 1	
			]);
			colorForPointsToDraw = colorForPointsToDraw.concat(colorCode[currentColor]);
			colorForPointsToDraw = colorForPointsToDraw.concat(colorCode[currentColor]);
		}
		
		var numberOfHeightPointsInBetween =
			Math.abs(currentStartPoint[1] - currentStopPoint[1]) / minDistance;
		numberOfHeightPointsInBetween = Math.floor(numberOfHeightPointsInBetween);
		
		for (var i = 0; i < numberOfHeightPointsInBetween; i++) {
			pointsToDraw = pointsToDraw.concat([
				currentStartPoint[0],
				currentStartPoint[1] * (numberOfHeightPointsInBetween - i) / (numberOfHeightPointsInBetween + 1)
					+ currentStopPoint[1] * (i + 1) / (numberOfHeightPointsInBetween + 1),
				totalVertices() + 1
			]);
			pointsToDraw = pointsToDraw.concat([
				currentStopPoint[0],
				currentStartPoint[1] * (numberOfHeightPointsInBetween - i) / (numberOfHeightPointsInBetween + 1)
					+ currentStopPoint[1] * (i + 1) / (numberOfHeightPointsInBetween + 1),
				totalVertices() + 1
			]);
			colorForPointsToDraw = colorForPointsToDraw.concat(colorCode[currentColor]);
			colorForPointsToDraw = colorForPointsToDraw.concat(colorCode[currentColor]);
		}
		
		gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pointsToDraw), gl.STATIC_DRAW);
		// gl.bindBuffer(gl.ARRAY_BUFFER, null);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorForPointsToDraw), gl.STATIC_DRAW);
		// gl.bindBuffer(gl.ARRAY_BUFFER, null);
		
		gl.drawArrays(gl.POINTS, 0, 2 * (numberOfWidthPointsInBetween + numberOfHeightPointsInBetween) + 4);
			
	}
	
	function drawSquareHelper() {
		render();
		
		var minDistance = 25.0;
		
		[leftUpPoint, rightUpPoint, rightDownPoint, leftDownPoint] = getCornersOfSquare();
		
		var pointsToDraw = []
			.concat(leftUpPoint).concat([totalVertices() + 1])
			.concat(rightUpPoint).concat([totalVertices() + 1])
			.concat(rightDownPoint).concat([totalVertices() + 1])
			.concat(leftDownPoint).concat([totalVertices() + 1]);
			
		var colorForPointsToDraw = colorCode[currentColor]
			.concat(colorCode[currentColor])
			.concat(colorCode[currentColor])
			.concat(colorCode[currentColor]);
		
		var numberOfPointsInBetween = Math.sqrt(
			Math.pow(leftUpPoint[0] - rightUpPoint[0], 2)
			+ Math.pow(leftUpPoint[1] - rightUpPoint[1], 2)
		) / minDistance;
		numberOfPointsInBetween = Math.floor(numberOfPointsInBetween);
		
		for (var i = 0; i < numberOfPointsInBetween; i++) {
			pointsToDraw = pointsToDraw.concat([
				leftUpPoint[0] * (numberOfPointsInBetween - i) / (numberOfPointsInBetween + 1)
					+ rightUpPoint[0] * (i + 1) / (numberOfPointsInBetween + 1),
				leftUpPoint[1] * (numberOfPointsInBetween - i) / (numberOfPointsInBetween + 1)
					+ rightUpPoint[1] * (i + 1) / (numberOfPointsInBetween + 1),
				totalVertices() + 1,
				
				rightUpPoint[0] * (numberOfPointsInBetween - i) / (numberOfPointsInBetween + 1)
					+ rightDownPoint[0] * (i + 1) / (numberOfPointsInBetween + 1),
				rightUpPoint[1] * (numberOfPointsInBetween - i) / (numberOfPointsInBetween + 1)
					+ rightDownPoint[1] * (i + 1) / (numberOfPointsInBetween + 1),
				totalVertices() + 1,
				
				rightDownPoint[0] * (numberOfPointsInBetween - i) / (numberOfPointsInBetween + 1)
					+ leftDownPoint[0] * (i + 1) / (numberOfPointsInBetween + 1),
				rightDownPoint[1] * (numberOfPointsInBetween - i) / (numberOfPointsInBetween + 1)
					+ leftDownPoint[1] * (i + 1) / (numberOfPointsInBetween + 1),
				totalVertices() + 1,
				
				leftDownPoint[0] * (numberOfPointsInBetween - i) / (numberOfPointsInBetween + 1)
					+ leftUpPoint[0] * (i + 1) / (numberOfPointsInBetween + 1),
				leftDownPoint[1] * (numberOfPointsInBetween - i) / (numberOfPointsInBetween + 1)
					+ leftUpPoint[1] * (i + 1) / (numberOfPointsInBetween + 1),
				totalVertices() + 1

			]);
			
			colorForPointsToDraw = colorForPointsToDraw
				.concat(colorCode[currentColor])
				.concat(colorCode[currentColor])
				.concat(colorCode[currentColor])
				.concat(colorCode[currentColor]);
		}
		
		gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pointsToDraw), gl.STATIC_DRAW);
		// gl.bindBuffer(gl.ARRAY_BUFFER, null);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorForPointsToDraw), gl.STATIC_DRAW);
		// gl.bindBuffer(gl.ARRAY_BUFFER, null);
		
		gl.drawArrays(gl.POINTS, 0, 4 * (numberOfPointsInBetween) + 4);
			
	}
	
	function drawRectangle() {
		vertices["shape"] = vertices["shape"].concat([
			currentStartPoint[0], currentStartPoint[1], totalVertices(),
			currentStopPoint[0], currentStartPoint[1], totalVertices() + 1,
			currentStopPoint[0], currentStopPoint[1], totalVertices() + 2,
			currentStartPoint[0], currentStopPoint[1], totalVertices() + 3,
		]);
		colors["shape"] = colors["shape"]
			.concat(colorCode[currentColor])
			.concat(colorCode[currentColor])
			.concat(colorCode[currentColor])
			.concat(colorCode[currentColor]);
		numPoints["shape"] += 4;

		render();
	}
	
	function drawSquare() {
		[leftUpPoint, rightUpPoint, rightDownPoint, leftDownPoint] = getCornersOfSquare();
			
		vertices["shape"] = vertices["shape"]
			.concat(leftUpPoint).concat([totalVertices()])
			.concat(rightUpPoint).concat([totalVertices() + 1])
			.concat(rightDownPoint).concat([totalVertices() + 2])
			.concat(leftDownPoint).concat([totalVertices() + 3]);
		
		colors["shape"] = colors["shape"]
			.concat(colorCode[currentColor])
			.concat(colorCode[currentColor])
			.concat(colorCode[currentColor])
			.concat(colorCode[currentColor]);
			
		numPoints["shape"] += 4;

		render();
	}
	
	function drawLines() {
		vertices["line"] = vertices["line"].concat(currentStartPoint);
		vertices["line"] = vertices["line"].concat([totalVertices()]);
		vertices["line"] = vertices["line"].concat(currentStopPoint);
		vertices["line"] = vertices["line"].concat([totalVertices()]);
		colors["line"] = colors["line"].concat(colorCode[currentColor]);
		colors["line"] = colors["line"].concat(colorCode[currentColor]);
		numPoints["line"] += 2;
		
		// var maxZValueLoc = gl.getUniformLocation(shaderProgram, "maxZValue");
		// gl.uniform1f(maxZValueLoc, totalVertices());
		
		render();
	}
	
	var onDrawing = false;
	canvas.addEventListener("mousemove", e => {
		if (onDrawing) {
			currentStopPoint = [e.offsetX, e.offsetY];
			if (currentTool == "pencil") {
				drawWithPencil(e.offsetX, e.offsetY);
			} else if (currentTool == "line") {
				drawLineHelper();
			} else if (currentTool == "rectangle") {
				drawRectangleHelper();
			} else if (currentTool == "square") {
				drawSquareHelper();
			} else { // Kalau tereksekusi, ada typo
				console.log("Wait, how?");
			}
		} else {
			pointing(e.offsetX, e.offsetY);
		}
	});
	
	canvas.addEventListener("mousedown", e => {
		currentStartPoint = [e.offsetX, e.offsetY];
		currentStopPoint = [e.offsetX, e.offsetY];
		onDrawing = true;
		if (currentTool == "pencil") {
			drawWithPencil(e.offsetX, e.offsetY);
		}
	});
	
	canvas.addEventListener("mouseup", e => {
		if (currentTool == "line" && onDrawing) {
			drawLines();
		} else if (currentTool == "rectangle" && onDrawing) {
			drawRectangle();
		} else if (currentTool == "square" && onDrawing) {
			drawSquare();
		} else {
			pointing(e.offsetX, e.offsetY);
		}
		
		onDrawing = false;
		currentStartPoint = [-100, -100];
		currentStopPoint = [-100, -100];
	});
	
	canvas.addEventListener("mouseleave", e => {
		onDrawing = false;
		render();
		currentStartPoint = [-100, -100];
		currentStopPoint = [-100, -100];
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