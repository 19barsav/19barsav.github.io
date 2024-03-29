// Canvases
var simCanvas = document.getElementById("sim-canvas");
var simCanvasContext = simCanvas.getContext("2d");
var infoCanvas = document.getElementById("info-canvas");
var infoCanvasContext = infoCanvas.getContext("2d");
var simContainer = document.getElementById("simulation-container");
simCanvas.width = simContainer.offsetWidth
simCanvas.height = simContainer.offsetHeight
var infoContainer = document.getElementById("infotainment-container");
infoCanvas.width = infoContainer.offsetWidth
infoCanvas.height = infoContainer.offsetHeight

// Car driving information
var Gear = {
    Park : 0,
    Drive : 1,
    Neutral : 2,
    Reverse : 3
};

var carPosX = 250;
var carPosY = 50;
var carVelocity = 0; // Positive velocity indicates rightward (AKA backward movement)
var carAcceleration = 0.1;
var carDeceleration = 0.5;
var isSystemOn = false;
var agreementAccepted = false;
var autoBrakingActive = false;
var manualBrakingActive = false;
var currentGear = Gear.Park;

// Timer Information
var timerStartTime;
var timerInterval;
var timerActive = false;

// Obstacle information
var wallPosX = 450;
var showObstacle = true;

// Infotainment Screen Information
var alertDisplayed = false;
var agreementDisplayed = true;
var autoBrakingButtonDisplayed = false;
var yesRect = {
    x : 100,
    y : 10,
    height : 40,
    width : 50,
    text : "Yes"
};
var noRect = {
    x : 160,
    y : 10,
    height : 40,
    width : 50,
    text : "No"
};

// var carImage = new Image;
// carImage.src = "vecteezy_sport-car_1193877.png"; // This image legally requires an attribution <a href="https://www.vecteezy.com/free-png/car-top-view">Car Top View PNGs by Vecteezy</a>
var brickImage = new Image;
brickImage.src = "brickWall.jpg"  //https://pixabay.com/photos/wall-bricks-brick-wall-red-bricks-21534/
// Utility Functions

function getMousePos(canvas, event) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
    };
}

function isWithin(pos, rect) {
    return pos.x > rect.x && pos.x < rect.x + rect.width && pos.y > rect.y && pos.y < rect.y + rect.height;
}

// Button/Controls Functions

document.addEventListener("keydown", keyPressed);
function keyPressed(e) {
    var keyCode = e.keyCode;

    switch (keyCode) {
        case 68: // "D"
            if (manualBrakingActive || (currentGear == Gear.Neutral && carVelocity <= 0)) {
                setGear(Gear.Drive);
            }
            break;
        case 82: // "R"
            if (manualBrakingActive || (currentGear == Gear.Neutral && carVelocity >= 0)) {
                setGear(Gear.Reverse);
            }
            break;
        case 78: // "N"
            if (currentGear === Gear.Drive || currentGear === Gear.Reverse)  { // I am unsure of this condition and don't feel like thinking about it right now. Please fix at some point
                setGear(Gear.Neutral);
                break;
            }
        case 80: // "P"
            if (manualBrakingActive && carVelocity == 0) {
                setGear(Gear.Park);
            }
    }
}

var toggleObstacleButton = document.getElementById("toggle-obstacle-button");
toggleObstacleButton.addEventListener("click", function() {
    showObstacle = !showObstacle;
    invalidate();
});

var gasButton = document.getElementById("gas-button");
gasButton.addEventListener("mousedown", startAccelerate);
gasButton.addEventListener("mouseup", stopAccelerate);
var accelerateInterval;

var brakeButton = document.getElementById("brake-button");
brakeButton.addEventListener("mousedown", startBrake);
brakeButton.addEventListener("mouseup", releaseBrake);
var brakeInterval;
var autoBrakeInterval;

function startTimer() {
    timerStartTime = new Date().getTime();
    timerActive = true;
}

function resetTimer() {
    timerStartTime = null;
    timerActive = false;
    document.getElementById("timer").innerHTML = "<p>Timer: 0:0:0</p>";
}

function updateTimer() {
    var currentTime = new Date().getTime();
    var elapsedTime = currentTime - timerStartTime; // calculate elapsed time in milliseconds
    var seconds = Math.floor(elapsedTime / 1000) % 60; // calculate seconds
    var minutes = Math.floor(elapsedTime / 1000 / 60) % 60; // calculate minutes
    var hours = Math.floor(elapsedTime / 1000 / 60 / 60); // calculate hours
    var displayTime = hours + ":" + minutes + ":" + seconds; // format display time
    document.getElementById("timer").innerHTML = "<p>Timer: " + displayTime + "</p>";
    if (seconds >= 10) {
        disableSystem();
    }
}

// Driving Functions

function idleVehicle() {
    switch (currentGear) {
        case Gear.Park:
        case Gear.Neutral:
            break;
        case Gear.Drive:
            carVelocity = -carAcceleration;
            break;
        case Gear.Reverse:
            carVelocity = carAcceleration;
            break;
    }
}

function startAccelerate() {
    if (autoBrakingActive || manualBrakingActive) {
        return;
    }
    switch (currentGear) {
        case Gear.Park:
        case Gear.Neutral:
            break;
        case Gear.Drive:
            accelerateInterval = setInterval(function() {
                carVelocity -= carAcceleration;
            }, 20);
            break;
        case Gear.Reverse:
            accelerateInterval = setInterval(function() {
                carVelocity += carAcceleration;
            }, 20);
            break;
    }
}

function stopAccelerate() {
    clearInterval(accelerateInterval);
}

function startBrake() {
    manualBrakingActive = true;
    if (autoBrakingActive) {
        releaseAutoBrake();
    }
    brakeInterval = setInterval(function() {
        if (carVelocity > 0) {
            carVelocity = (carVelocity > carDeceleration) ? carVelocity - carDeceleration : 0;
        } else if (carVelocity < 0) {
            carVelocity = (carVelocity < -carDeceleration) ? carVelocity + carDeceleration : 0;
        }
    }, 20);
}

function releaseBrake() {
    clearInterval(brakeInterval);
    manualBrakingActive = false;
    idleVehicle();
}

function autoBrake() {
    autoBrakingActive = true;
    autoBrakeInterval = setInterval(function() {
        if (carVelocity > 0) {
            carVelocity = (carVelocity > carDeceleration) ? carVelocity - carDeceleration : 0;
        } else if (carVelocity < 0) {
            carVelocity = (carVelocity < -carDeceleration) ? carVelocity + carDeceleration : 0;
        }
    }, 20);
}

function releaseAutoBrake() {
    clearInterval(autoBrakeInterval);
    autoBrakingActive = false;
    alertDisplayed = false;
    idleVehicle();
}

function setGear(gear) {
    if (currentGear == Gear.Reverse && gear != Gear.Reverse) {
        startTimer();
    } else if (gear == Gear.Reverse) {
        resetTimer();
    }
    var gearText = document.getElementById("current-gear");
    currentGear = gear;
    switch (gear) {
        case Gear.Drive:
            if (carVelocity > 0) {
                // Transmission blown
            }
            gearText.innerHTML = "Drive"
            break;
        case Gear.Reverse:
            if (carVelocity < 0) {
                // Transmission blown
            }
            gearText.innerHTML = "Reverse"
            break;
        case Gear.Neutral:
            gearText.innerHTML = "Neutral"
            break;
        case Gear.Park:
            gearText.innerHTML = "Park"
            break;
    }
}

function updateVehiclePosition() {
    carPosX += carVelocity;
}

function maybeAutoBrake() {
    if (isSystemOn && wallPosX - carPosX < 90 && carVelocity > 0 && !manualBrakingActive && showObstacle) {
        alertDisplayed = true;
        stopAccelerate();
        autoBrake(false);
    }
}

// Infotainment Screen Functions

infoCanvas.addEventListener("click", function(evt) {
    var mousePos = getMousePos(infoCanvas, evt);
    if (agreementDisplayed) {
        if (isWithin(mousePos, yesRect)) { // Within yes
            agreementDisplayed = false;
            isSystemOn = true;
            autoBrakingButtonDisplayed = true;
        } else if (isWithin(mousePos, noRect)) { // Within no
            agreementDisplayed = false;
            disableSystem();
        }
    } else if (autoBrakingButtonDisplayed) {
        if (isWithin(mousePos, yesRect)) { // Within yes
            isSystemOn = false;
            autoBrakingButtonDisplayed = false;
            disableSystem();
        } else if (isWithin(mousePos, noRect)) { // Within no
            autoBrakingButtonDisplayed = false;
            agreementAccepted = true;
        }
    }
});

function disableSystem() {
    infoCanvasContext.clearRect(0, 0, infoCanvas.width, infoCanvas.height);
    infoCanvasContext.fillStyle = "black";
    infoCanvasContext.fillRect(0, 0, infoCanvas.width, infoCanvas.height)
    agreementAccepted = false;
    isSystemOn = false;
    invalidate();
}

// Drawing Functions

function drawSimCanvas() {
    simCanvasContext.clearRect(0, 0, simCanvas.width, simCanvas.height);

    // Car color
    simCanvasContext.fillStyle = "red";
    simCanvasContext.fillRect(carPosX, carPosY, 70, 40);
    simCanvasContext.fillStyle = "black";
    simCanvasContext.fillRect(carPosX + 18, carPosY + 5, 18, 30);
    simCanvasContext.fillRect(carPosX + 50, carPosY + 5, 10, 30);

    if (showObstacle) {
        simCanvasContext.fillStyle = "#AA4A44";
        simCanvasContext.fillRect(wallPosX, 20, 10, 100);
    }
    if (carPosX < 100) {
        disableSystem();
    }
}

function drawInfoCanvas() {
    if (!agreementDisplayed && !agreementAccepted && !autoBrakingButtonDisplayed) {
        return;
    }

    infoCanvasContext.clearRect(0, 0, infoCanvas.width, infoCanvas.height);

    infoCanvasContext.fillStyle = "#87CEEB";
    infoCanvasContext.fillRect(0, 0, infoCanvas.width, infoCanvas.height / 2);
    infoCanvasContext.fillStyle = "gray";
    infoCanvasContext.fillRect(0, infoCanvas.height / 2, infoCanvas.width, infoCanvas.height / 2);
    
    if (showObstacle) {
        //infoCanvasContext.fillStyle = "#AA4A44";
        if (carPosX + 70 <= wallPosX) {
            const distBeforeWall = wallPosX - (carPosX + 70);
            const wallWidth = infoCanvas.width - distBeforeWall;
            const wallHeight = wallWidth * .75
            
            //infoCanvasContext.fillRect((infoCanvas.width - wallWidth) / 2, (infoCanvas.height - wallHeight) / 2, wallWidth, wallHeight)
            infoCanvasContext.drawImage(brickImage, (infoCanvas.width - wallWidth) / 2, (infoCanvas.height - wallHeight) / 2, wallWidth, wallHeight)
        }
    }

    if (agreementDisplayed) {
        infoCanvasContext.fillStyle = "orange";
        infoCanvasContext.font = '20pt Calibri';
        infoCanvasContext.fillText("Agree:", 0, 30);
        infoCanvasContext.fillStyle = "white";
        infoCanvasContext.fillRect(yesRect.x, yesRect.y, yesRect.width, yesRect.height);
        infoCanvasContext.fillRect(noRect.x, noRect.y, noRect.width, noRect.height);
        infoCanvasContext.fillStyle = "orange";
        infoCanvasContext.fillText(yesRect.text, yesRect.x, yesRect.y + yesRect.height / 2);
        infoCanvasContext.fillText(noRect.text, noRect.x, noRect.y + noRect.height / 2);
    } else if (autoBrakingButtonDisplayed) {
        infoCanvasContext.fillStyle = "orange";
        infoCanvasContext.font = '20pt Calibri';
        infoCanvasContext.fillText("Disable:", 0, 30);
        infoCanvasContext.fillStyle = "white";
        infoCanvasContext.fillRect(yesRect.x, yesRect.y, yesRect.width, yesRect.height);
        infoCanvasContext.fillRect(noRect.x, noRect.y, noRect.width, noRect.height);
        infoCanvasContext.fillStyle = "orange";
        infoCanvasContext.fillText(yesRect.text, yesRect.x, yesRect.y + yesRect.height / 2);
        infoCanvasContext.fillText(noRect.text, noRect.x, noRect.y + noRect.height / 2);
    }

    if (alertDisplayed) {
        infoCanvasContext.fillStyle = "black";
        const alertText = "Automatic braking has been engaged";
        infoCanvasContext.fillText(alertText, 10, 200);
    }

    
}

function invalidate() {
    drawSimCanvas();
    drawInfoCanvas();
}

function update() {
    if (timerActive) {
        updateTimer();
    }
    updateVehiclePosition();
    if (isSystemOn && !autoBrakingActive) {
        maybeAutoBrake();
    }
    invalidate();
}

setInterval(update, 20);