currentTool = "pencil";
currentColor = "black"

function main() {
	// Initialize system
	const canvas = document.querySelector("#mycanvas");
	const gl = canvas.getContext("webgl");
	
	if (gl === null) {
		alert("Tidak dapat menginisialisasi WebGL .-.");
		return;
	}
	
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