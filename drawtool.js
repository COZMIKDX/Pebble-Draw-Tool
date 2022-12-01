let main = document.getElementById("main-container");
let tableBody = document.getElementById("table-body");
let undoButton = document.getElementById("undo");
let redoButton = document.getElementById("redo");
let clearButton = document.getElementById("clear");
let downloadButton = document.getElementById("download");
let uploadButton = document.getElementById("upload");

/** @type {HTMLCanvasElement} */
let canvas = document.getElementById("draw-canvas");
let ctx = canvas.getContext("2d");

/** @type {HTMLCanvasElement} */
let displayCanvas = document.getElementById("main-canvas");
let displayCtx = displayCanvas.getContext("2d");

/** @type {HTMLCanvasElement} */
let toolCanvas = document.getElementById("tool-canvas");
let toolCtx = toolCanvas.getContext("2d");

/** @type {HTMLCanvasElement} */
let exportCanvas = document.getElementById("export-canvas");
let exportCtx = exportCanvas.getContext("2d");


/*
User input will be received in the position of the display canvas.
Because of this, the offsets will be for the display canvas.
The drawing is done on the draw canvas and will be copied over to the display canvas.
Rectangle tool, circle tool, etc will be drawn on the tool canvas so that I can show a 
  preview of the shape before making it permanent, drawing it on top of the draw canvas.

For an undo feature I could use ctx.save() to save the draw canvas to a stack before drawing
 and ctx.restore() to bring it back (undo).
If the user wants to redo something, a second canvas is used to store the state before an undo is
  done. As far as I can tell, there is no second save stack, so this was the easiest solution for it is 4:33 AM right now.

For an undo feature, I wrote some functions using ctx.save() and ctx.restore(). This is very slow.
Instead, I will try something like saving the canvas as an Image object. That way I can draw the image if
  I need to undo. A similar process will be done for redoing.
I could make undo and redo stacks to hold the Image objects or maybe just the dataURLs.
*/


let drawing = false;
let prevX = 0;
let prevY = 0;
let xOffset = 0;
let yOffset = 0;
let verticalScrollOffset = 0;
let pixelScale = 4;
let currentColor = "#000000";
let undoStack = [];
let redoStack = [];

let colors = [
    ["#FFFFFF", "#AAAAAA", "#555555", "#000000"],
    ["#FFFFAA"],
    ["#FFFF55", "#FFAAAA"],
    ["#FFAA55"],
    ["#AAFF55", "#FFFF00", "#FF5500", "#FF5555"],
    ["#AAFF00", "#FFAA00", "#FF0000"],
    ["#55FF00", "#AAAA00", "#AA5500", "#FF0055"],
    ["#AAAA55", "#AA5555"],
    ["#AAFFAA", "#00FF00", "#55AA00", "#555500", "#AA0000"],
    ["#55FF55", "#00AA00", "#005500", "#550000", "#FF00AA"],
    ["#00FF55", "#55AA55", "#005555", "#AA0055", "#FF55AA"],
    ["#00AA55", "#55AAAA", "#550055", "#FF00FF", "#FFAAFF"],
    ["#55FFAA", "#00AAAA", "#0055AA", "#000055", "#AA00AA", "#FF55FF"],
    ["#00FFAA", "#0000AA", "#5500AA", "#AA55AA"],
    ["#00FFFF", "#00AAFF", "#5500FF", "#AA00FF"],
    ["#55FFFF", "#0000FF", "#5555AA", "#AA55FF"],
    ["#55AAFF", "#5555FF"],
    ["#AAFFFF", "#0055FF", "#AAAAFF"]
];

function updateDisplayCanvas() {
    displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    displayCtx.drawImage(canvas, 0, 0, displayCanvas.width, displayCanvas.height);
    displayCtx.drawImage(toolCanvas, 0, 0, displayCanvas.width, displayCanvas.height);
}

function updateDrawOffset() {
    xOffset = displayCanvas.offsetLeft;
    yOffset = displayCanvas.offsetTop
}

// Whenever the user draws, first save the canvas to the undo stack.
// Store only before or after the user does a stroke.
function storeUndo() {
    let data = canvas.toDataURL();
    undoStack.push(data);
}

// Whenever the user draws, we get rid of the redo stack contents.
function clearRedoStack() {
    redoStack = [];
}

// To undo, save the canvas to the redo stack, pop the undo stack and make an image with that data.
// Clear the canvas and draw the image.
function undo() { 
    if (undoStack.length >= 1) {
        let data = canvas.toDataURL();
        redoStack.push(data);
    
        let img = new Image();
        img.src = undoStack.pop();
        img.onload = () => { 
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            updateDisplayCanvas();
        }
    }
}

// grab data from redo stack and make image, put current canvas in undo stack, clear canvas, draw redo image.
function redo() {
    if (redoStack.length >= 1) {     
        let data = canvas.toDataURL();
        undoStack.push(data);

        let img = new Image();
        img.src = redoStack.pop();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            updateDisplayCanvas();
        }
    }
}

function clear() {
    storeUndo();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    toolCtx.clearRect(0, 0, toolCanvas.width, toolCanvas.height);
}

let rowIndex = 0;
for (const row of colors) {
    let elemIndex = 0;
    let colorRow = document.createElement("span");
    colorRow.classList.add("color-row");

    for (const elem of row) {
        let colorElem = document.createElement("td");
        let colorSelected = colors[rowIndex][elemIndex];

        colorElem.setAttribute("color-data", colorSelected);
        colorElem.style.backgroundColor = colorSelected;
        elemIndex++;
        colorRow.appendChild(colorElem);

        colorElem.addEventListener("click", (e) => {
            currentColor = e.target.getAttribute("color-data");
            ctx.strokeStyle = currentColor; // I'll see if I need currentColor later.
            ctx.fillStyle = currentColor;
        })
    }

    tableBody.appendChild(colorRow);
    rowIndex++;
}
updateDrawOffset();

function draw(e) {
    if (!drawing) {
        return;
    }

    let x = getDrawX(e);
    let y = getDrawY(e);

    ctx.lineWidth = pixelScale;
    ctx.linecap = "butt";
    let block = gridSnap(x, y);
    if (e.type == "mousemove") {
        // Draw a line. I may have to make my own lineTo function using the dot draw.
        //ctx.lineTo(block.x * pixelScale, block.y * pixelScale);
        //ctx.stroke();
        drawLine(prevX, prevY, x,y);
    } else if (e.type == "mousedown") {
        // Draw a single dot
        ctx.fillRect(block.x * pixelScale, block.y * pixelScale, pixelScale, pixelScale);
    }
}

function stopDrawing(e) {
    drawing = false;
    if (e.type == "mouseleave") {
        // Finish drawing the line when the mouse leaves the canvas.
        // Before, moving the mouse out too fast would cut the line too early.
        ctx.lineTo(getDrawX(e), getDrawY(e));
    }
    ctx.stroke();
    ctx.beginPath();
}

function gridSnap(x, y) {
    let blockPosX = Math.floor(x / pixelScale);
    let blockPosY = Math.floor(y / pixelScale);
    let coords = { x: blockPosX, y: blockPosY };
    console.log(coords);
    return coords;
}

function getDrawX(e) {
    return e.clientX - xOffset;
}

function getDrawY(e) {
    return e.clientY - yOffset;
}

function clearCanvas() {
    canvas.clearRect(0, 0, canvas.width, canvas.height);
}

function drawLine(prevX, prevY, x, y) {
    let dx = Math.abs(x - prevX);
    let dy = Math.abs(y - prevY);
    let tempX = prevX;
    let tempY = prevY;

    let m = 2 * dy;
    let slopeError = m - dx;

    for (let i = 0; i <= dx; i++) {
        let block = gridSnap(tempX, tempY);
        ctx.fillRect(block.x * pixelScale, block.y * pixelScale, pixelScale, pixelScale);
        console.log((tempX, tempY));

        if (tempX < x) {
            tempX++;
        } else {
            tempX--;
        }

        if (slopeError < 0) {
            slopeError = slopeError + m;
        }
        else {
            if (prevY < y) {
                tempY++;
            } else {
                tempY--;
            }
            slopeError = slopeError + m - (2 * dx);
        }
    }
}

function drawLine2(prevX, prevY, x, y) {
    let dx = Math.abs(x - prevX);
    let dy = Math.abs(y - prevY);
    let m = 2 * dy;
    let slopeError = m - dx;
    let tempX = prevX;
    let tempY = prevY;

    // Increases current x draw position until at the latest x position.
    // Currently, it leaves blank spots if the latest y position is more than one pixel away from
    //  the previous y position and the change in x is less than the change in y.
    for (let i = prevX; i < x; i++) {
        let block = gridSnap(tempX, tempY);
        ctx.fillRect(block.x * pixelScale, block.y * pixelScale, pixelScale, pixelScale);
        
        if (slopeError > 0) {
            tempY++
            slopeError = slopeError - m;
        }
    }

    slopeError = slopeError + (2*dy);

}


displayCanvas.addEventListener("mousedown", (e) => {
    drawing = true;
    storeUndo();
    clearRedoStack();
    draw(e);
    updateDisplayCanvas();
});

displayCanvas.addEventListener("mousemove", (e) => {
    draw(e);
    prevX = getDrawX(e);
    prevY = getDrawY(e);
    updateDisplayCanvas();
});

displayCanvas.addEventListener("mouseup", stopDrawing);

displayCanvas.addEventListener("mouseleave", stopDrawing);

undoButton.addEventListener("click", undo);
redoButton.addEventListener("click", redo);
clearButton.addEventListener("click", clear);
downloadButton.addEventListener("click", () => {
    exportCtx.drawImage(displayCanvas, 0, 0, exportCanvas.width, exportCanvas.height);
    let data = exportCanvas.toDataURL("image/png");
    let dlimg = document.createElement("a");
    document.body.appendChild(dlimg);

    dlimg.style = "display: none";
    dlimg.href = data;
    dlimg.download = "pebbletest.png";
    dlimg.click();
});

// upload is intended for taking a drawing made in a previous session and resuming.
// Right now, the canvases dimensions are the normal pebble dimensions multiplied by 4.
// Because of this, I make the "pixel" draw size to 4x4 pixels so that the image would look like
//  if you took an image at regular pebble dimensions but integer scaled it by 4.
//  The actual image is still way bigger than the pebble's resolution.
// To fix this, I could figure out a way to scale it back down when exporting. If I feel like
//  making a canvas zoom function, I could use that code for it too.
//
// I think I could just draw the display canvas image to a pebble resolution sized canvas and it
//  it will scale it for me.

uploadButton.addEventListener("change", (e) => {
    let imageUrl = URL.createObjectURL(e.target.files[0]);
    let img = new Image();
    img.src = imageUrl;

    img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        updateDisplayCanvas();
    }
});