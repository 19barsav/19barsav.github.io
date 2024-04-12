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
var systemAutoDisabled = false;
var currentGear = Gear.Park;
var distanceMovedSinceStart = 0;
var audioContext = new AudioContext();
var soundAlarm = false;

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
var enableDisableDisplayed = false;
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
var disableEnableRect = {
    x : 0,
    y : 10,
    height : 40,
    width : 90,
    text : "Yes"
};

var brickImage = new Image;
brickImage.src = "brickWall.jpg";  //https://pixabay.com/photos/wall-bricks-brick-wall-red-bricks-21534/

var cautionImage = new Image;
cautionImage.src = "vecteezy_warning-icon-png-transparent_9663747.png";
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
    document.getElementById("timer").innerHTML = "<h2><p>Timer: 0:0:0</p></h2>";
}

function updateTimer() {
    var currentTime = new Date().getTime();
    var elapsedTime = currentTime - timerStartTime; // calculate elapsed time in milliseconds
    var seconds = Math.floor(elapsedTime / 1000) % 60; // calculate seconds
    var minutes = Math.floor(elapsedTime / 1000 / 60) % 60; // calculate minutes
    var hours = Math.floor(elapsedTime / 1000 / 60 / 60); // calculate hours
    var displayTime = hours + ":" + minutes + ":" + seconds; // format display time
    document.getElementById("timer").innerHTML = "<h2><p>Timer: " + displayTime + "</p></h2>";
    if (seconds >= 10) {
        disableSystem();
        systemAutoDisabled = true;
        enableDisableDisplayed = false;
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
    if (!autoBrakingActive && currentGear != Gear.Reverse) {
        alertDisplayed = false;
    }
    switch (gear) {
        case Gear.Drive:
            if (carVelocity > 0) {
                // Transmission blown
            }
            gearText.innerHTML = "<h2>Drive</h2>"
            break;
        case Gear.Reverse:
            if (carVelocity < 0) {
                // Transmission blown
            }
            if (!isSystemOn && agreementAccepted && !enableDisableDisplayed) {
                enableDisableDisplayed = true;
                systemAutoDisabled = false;
                isSystemOn = true;
                distanceMovedSinceStart = 0;
            }
            gearText.innerHTML = "<h2>Reverse</h2>"
            break;
        case Gear.Neutral:
            gearText.innerHTML = "<h2>Neutral</h2>"
            break;
        case Gear.Park:
            gearText.innerHTML = "<h2>Park</h2>"
            break;
    }
}

function updateVehiclePosition() {
    distanceMovedSinceStart += Math.abs(carVelocity);
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
            agreementAccepted = true;
            if (currentGear == Gear.Reverse) {
                setGear(Gear.Reverse);
            }
            distanceMovedSinceStart = 0;
        } else if (isWithin(mousePos, noRect)) { // Within no
            agreementDisplayed = false;
            disableSystem();
        }
    } else if (agreementAccepted) {
        if (isWithin(mousePos, disableEnableRect)) { // Within yes
            isSystemOn = !isSystemOn;
            if (!isSystemOn) {
                disableSystem();
            } else {
                systemAutoDisabled = false;
                distanceMovedSinceStart = 0;
            }
        }
    }
});

function disableSystem() {
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

    simCanvasContext.beginPath();
    simCanvasContext.moveTo(carPosX + 20, carPosY);
    simCanvasContext.lineTo(carPosX + 25, carPosY - 5);
    simCanvasContext.lineTo(carPosX + 23, carPosY);
    simCanvasContext.closePath();
    simCanvasContext.fill();

    simCanvasContext.beginPath();
    simCanvasContext.moveTo(carPosX + 20, carPosY + 40);
    simCanvasContext.lineTo(carPosX + 25, carPosY + 45);
    simCanvasContext.lineTo(carPosX + 23, carPosY + 40);
    simCanvasContext.closePath();
    simCanvasContext.fill();

    simCanvasContext.fillStyle = "yellow";
    simCanvasContext.beginPath();
    simCanvasContext.arc(carPosX, carPosY + 8, 5, 1.5 * Math.PI, .5 * Math.PI, false);
    simCanvasContext.closePath();
    simCanvasContext.fill();

    simCanvasContext.fillStyle = "yellow";
    simCanvasContext.beginPath();
    simCanvasContext.arc(carPosX, carPosY + 40 - 8, 5, 1.5 * Math.PI, .5 * Math.PI, false);
    simCanvasContext.closePath();
    simCanvasContext.fill();

    if (showObstacle) {
        simCanvasContext.fillStyle = "#AA4A44";
        simCanvasContext.fillRect(wallPosX, 20, 10, 100);
    }

    simCanvasContext.font = '20pt Calibri';
    const simText = "Vehicle Bird's-eye View";
    const simTextWidth = simCanvasContext.measureText(simText).width;
    const simTextHeight = simCanvasContext.measureText(simText).actualBoundingBoxAscent + simCanvasContext.measureText(simText).actualBoundingBoxDescent;
        
    simCanvasContext.fillStyle = "black";
    simCanvasContext.fillRect(simCanvas.width - simTextWidth - 8, simCanvas.height - simTextHeight - 7, simTextWidth + 8, simTextHeight + 7)
    simCanvasContext.fillStyle = "white";
    simCanvasContext.fillText(simText, simCanvas.width - simTextWidth - 4, simCanvas.height - simTextHeight / 4);


    if (distanceMovedSinceStart > 300 && isSystemOn) {
        disableSystem();
        systemAutoDisabled = true;
        enableDisableDisplayed = false;
    }

    // End simulation if car hits wall
    if (showObstacle == true && carPosX + 70 >= wallPosX && carPosX <= wallPosX + 10) {
        simCanvasContext.clearRect(0, 0, simCanvas.width, simCanvas.height);
        simCanvasContext.fillStyle = "black";
        simCanvasContext.fillRect(0, 0, simCanvas.width, simCanvas.height);

        const simEndText1 = "You hit an obstacle."
        const simEndText2 = "Refresh to restart."

        simCanvasContext.font = '20pt Calibri';
        simCanvasContext.fillStyle = "white";

        const simEndTextWidth1 = simCanvasContext.measureText(simEndText1).width;
        const simEndTextHeight1 = simCanvasContext.measureText(simEndText1).actualBoundingBoxAscent + simCanvasContext.measureText(simEndText1).actualBoundingBoxDescent;

        const simEndTextWidth2 = simCanvasContext.measureText(simEndText2).width;
        const simEndTextHeight2 = simCanvasContext.measureText(simEndText2).actualBoundingBoxAscent + simCanvasContext.measureText(simEndText2).actualBoundingBoxDescent;
        
        simCanvasContext.fillStyle = "white";
        simCanvasContext.fillText(simEndText1, simCanvas.width / 2 - simEndTextWidth1 / 2, simCanvas.height / 2 - simEndTextHeight1 / 4);
        simCanvasContext.fillText(simEndText2, simCanvas.width / 2 - simEndTextWidth2 / 2, simCanvas.height / 2 + simEndTextHeight2);

        carVelocity = 0
    }
}

function drawInfoCanvas() {
    if (isSystemOn) {
        infoCanvasContext.clearRect(0, 0, infoCanvas.width, infoCanvas.height);

        infoCanvasContext.fillStyle = "#87CEEB";
        infoCanvasContext.fillRect(0, 0, infoCanvas.width, infoCanvas.height / 2);
        infoCanvasContext.fillStyle = "gray";
        infoCanvasContext.fillRect(0, infoCanvas.height / 2, infoCanvas.width, infoCanvas.height / 2);
        
        if (showObstacle) {
            //infoCanvasContext.fillStyle = "#AA4A44";
            if (carPosX + 60 <= wallPosX) {
                const distBeforeWall = wallPosX - (carPosX + 70);
                if (infoCanvas.width + 5 - distBeforeWall * 2 > 0) {
                    const wallWidth = infoCanvas.width + 5 - distBeforeWall * 2;
                    const wallHeight = wallWidth * .75;
                    infoCanvasContext.drawImage(brickImage, (infoCanvas.width - wallWidth) / 2, (infoCanvas.height - wallHeight) / 2, wallWidth, wallHeight);
                }
            }
        }

        if (alertDisplayed) {
            const alertText = "Automatic braking has been engaged";

            infoCanvasContext.font = '20pt Calibri';
            infoCanvasContext.fillStyle = "red"; 
            const alertTextWidth = infoCanvasContext.measureText(alertText).width;
            const alertTextHeight = infoCanvasContext.measureText(alertText).actualBoundingBoxAscent + infoCanvasContext.measureText(alertText).actualBoundingBoxDescent;
            infoCanvasContext.fillStyle = "red"; 
            infoCanvasContext.fillRect(infoCanvas.width / 2 - alertTextWidth / 2 - 2, infoCanvas.height / 2 - alertTextHeight / 2 - 5, alertTextWidth + 4, alertTextHeight + 17);
            infoCanvasContext.fillStyle = "white";
            infoCanvasContext.fillText(alertText, infoCanvas.width / 2 - alertTextWidth / 2, infoCanvas.height / 2 + alertTextHeight / 2);
        }
    } else {
        infoCanvasContext.clearRect(0, 0, infoCanvas.width, infoCanvas.height);
        infoCanvasContext.fillStyle = "black";
        infoCanvasContext.fillRect(0, 0, infoCanvas.width, infoCanvas.height);
    }

    if (agreementDisplayed) {
        infoCanvasContext.fillStyle = "red";
        infoCanvasContext.fillRect(0, 15, 80, 30);
        infoCanvasContext.fillStyle = "white";
        infoCanvasContext.font = '20pt Calibri';
        infoCanvasContext.fillText("Agree:", 0, 37);
        infoCanvasContext.fillStyle = "red";
        infoCanvasContext.fillRect(yesRect.x, yesRect.y, yesRect.width, yesRect.height);
        infoCanvasContext.fillRect(noRect.x, noRect.y, noRect.width, noRect.height);
        infoCanvasContext.fillStyle = "white";
        infoCanvasContext.fillText(yesRect.text, yesRect.x, yesRect.y + yesRect.height / 1.4);
        infoCanvasContext.fillText(noRect.text, noRect.x, noRect.y + noRect.height / 1.4);
    } else if (agreementAccepted && enableDisableDisplayed) {
        infoCanvasContext.fillStyle = "red";
        infoCanvasContext.fillRect(0, 15, 90, 30);
        infoCanvasContext.fillStyle = "white";
        infoCanvasContext.font = '20pt Calibri';
        var buttonText = (isSystemOn) ? "Disable" : "Enable";
        infoCanvasContext.fillText(buttonText, 0, 37);
    }
    infoCanvasContext.font = '20pt Calibri';
    const infoText = "Display Screen"
    const infoTextWidth = infoCanvasContext.measureText(infoText).width;
    const infoTextHeight = infoCanvasContext.measureText(infoText).actualBoundingBoxAscent + infoCanvasContext.measureText(infoText).actualBoundingBoxDescent;
        
    infoCanvasContext.fillStyle = "black";
    infoCanvasContext.fillRect(infoCanvas.width - infoTextWidth - 8, infoCanvas.height - infoTextHeight - 7, infoTextWidth + 8, infoTextHeight + 7)
    infoCanvasContext.fillStyle = "white";
    infoCanvasContext.fillText(infoText, infoCanvas.width - infoTextWidth - 4, infoCanvas.height - infoTextHeight / 4);

    if (soundAlarm) {
        infoCanvasContext.drawImage(cautionImage, infoCanvas.width / 2 - 50, 0, 100, 100);
    }

    // End simulation if car hits wall
    if (showObstacle == true && carPosX + 70 >= wallPosX && carPosX <= wallPosX + 10) {
        infoCanvasContext.clearRect(0, 0, infoCanvas.width, infoCanvas.height);
        infoCanvasContext.fillStyle = "black";
        infoCanvasContext.fillRect(0, 0, infoCanvas.width, infoCanvas.height);

        const infoEndText1 = "You hit an obstacle."
        const infoEndText2 = "Refresh to restart."

        infoCanvasContext.font = '20pt Calibri';
        infoCanvasContext.fillStyle = "white";

        const infoEndTextWidth1 = infoCanvasContext.measureText(infoEndText1).width;
        const infoEndTextHeight1 = infoCanvasContext.measureText(infoEndText1).actualBoundingBoxAscent + infoCanvasContext.measureText(infoEndText1).actualBoundingBoxDescent;

        const infoEndTextWidth2 = infoCanvasContext.measureText(infoEndText2).width;
        const infoEndTextHeight2 = infoCanvasContext.measureText(infoEndText2).actualBoundingBoxAscent + infoCanvasContext.measureText(infoEndText2).actualBoundingBoxDescent;
        
        infoCanvasContext.fillStyle = "white";
        infoCanvasContext.fillText(infoEndText1, infoCanvas.width / 2 - infoEndTextWidth1 / 2, infoCanvas.height / 2 - infoEndTextHeight1 / 4);
        infoCanvasContext.fillText(infoEndText2, infoCanvas.width / 2 - infoEndTextWidth2 / 2, infoCanvas.height / 2 + infoEndTextHeight2);

        carVelocity = 0
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
    if (isSystemOn && wallPosX - carPosX < 160 && showObstacle && currentGear == Gear.Reverse) {
        soundAlarm = true;
        beep(0.05, 900, 30);
    }
    else {
        soundAlarm = false;
    }
    invalidate();
}

setInterval(update, 20);

function beep(vol, freq, duration) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    oscillator.frequency.value = freq;
    oscillator.type = 'square';

    gainNode.connect(audioContext.destination);
    gainNode.gain.value = vol * 0.01;

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration * 0.001);

    oscillator.addEventListener('ended', function(){
        if(soundAlarm){
            beep(vol, freq, duration);
        }
    });
}