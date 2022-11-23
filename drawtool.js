let main = document.getElementById("main-container");
let tableBody = document.getElementById("table-body");
let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");

let drawing = false;
let prevX = 0;
let prevY = 0;
let xOffset = 0;
let yOffset = 0;
let verticalScrollOffset = 0;
let pixelScale = 4;
let currentColor = "#000000";

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

function updateDrawOffset() {
    xOffset = canvas.offsetLeft;
    yOffset = canvas.offsetTop
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


canvas.addEventListener("mousedown", (e) => {
    drawing = true;
    draw(e);
});

canvas.addEventListener("mousemove", (e) => {

    draw(e);
    prevX = getDrawX(e);
    prevY = getDrawY(e);
});

canvas.addEventListener("mouseup", stopDrawing);

canvas.addEventListener("mouseleave", stopDrawing);

/*document.addEventListener("scroll", (e) => {
  updateDrawOffset();
  console.log(e);
});*/