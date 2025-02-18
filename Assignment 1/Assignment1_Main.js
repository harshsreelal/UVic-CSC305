
var canvas;
var gl;

var program;

var near = 1;
var far = 100;


var left = -6.0;
var right = 6.0;
var ytop = 6.0;
var bottom = -6.0;


var lightPosition2 = vec4(100.0, 100.0, 100.0, 1.0);
var lightPosition = vec4(0.0, 0.0, 100.0, 1.0);

var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

var materialAmbient = vec4(1.0, 0.0, 1.0, 1.0);
var materialDiffuse = vec4(1.0, 0.8, 0.0, 1.0);
var materialSpecular = vec4(0.4, 0.4, 0.4, 1.0);
var materialShininess = 30.0;

var ambientColor, diffuseColor, specularColor;

var modelMatrix, viewMatrix, modelViewMatrix, projectionMatrix, normalMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;
var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var RX = 0;
var RY = 0;
var RZ = 0;

var MS = []; // The modeling matrix stack
var TIME = 0.0; // Realtime
var dt = 0.0
var prevTime = 0.0;
var resetTimerFlag = true;
var animFlag = false;
var controller;

// These are used to store the current state of objects.
// In animation it is often useful to think of an object as having some DOF
// Then the animation is simply evolving those DOF over time. You could very easily make a higher level object that stores these as Position, Rotation (and also Scale!)
var sphereRotation = [0, 0, 0];
var spherePosition = [0, 0, 0];

var cubeRotation = [0, 0, 0];
var cubePosition = [1, 0, 0];

// DEBUG ANGLES - REMOVE BEFORE SUBMISSION
var astronautRotation = 90;
var astronautVRotation = 90;
var orbitAngle = 0;

// Setting the colour which is needed during illumination of a surface
function setColor(c) {
    ambientProduct = mult(lightAmbient, c);
    diffuseProduct = mult(lightDiffuse, c);
    specularProduct = mult(lightSpecular, materialSpecular);

    gl.uniform4fv(gl.getUniformLocation(program,
        "ambientProduct"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program,
        "diffuseProduct"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program,
        "specularProduct"), flatten(specularProduct));
    gl.uniform4fv(gl.getUniformLocation(program,
        "lightPosition"), flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program,
        "shininess"), materialShininess);
}

window.onload = function init() {

    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 1.0);

    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);


    setColor(materialDiffuse);

    // Initialize some shapes, note that the curved ones are procedural which allows you to parameterize how nice they look
    // Those number will correspond to how many sides are used to "estimate" a curved surface. More = smoother
    Cube.init(program);
    Sphere.init(36, program);

    // Matrix uniforms
    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");

    // Lighting Uniforms
    gl.uniform4fv(gl.getUniformLocation(program,
        "ambientProduct"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program,
        "diffuseProduct"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program,
        "specularProduct"), flatten(specularProduct));
    gl.uniform4fv(gl.getUniformLocation(program,
        "lightPosition"), flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program,
        "shininess"), materialShininess);


    document.getElementById("animToggleButton").onclick = function () {
        if (animFlag) {
            animFlag = false;
        }
        else {
            animFlag = true;
            resetTimerFlag = true;
            window.requestAnimFrame(render);
        }
        //console.log(animFlag);
    };

    render(0);
}

// Sets the modelview and normal matrix in the shaders
function setMV() {
    modelViewMatrix = mult(viewMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    normalMatrix = inverseTranspose(modelViewMatrix);
    gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(normalMatrix));
}

// Sets the projection, modelview and normal matrix in the shaders
function setAllMatrices() {
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
    setMV();
}

// Draws a 2x2x2 cube center at the origin
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCube() {
    setMV();
    Cube.draw();
}

// Draws a sphere centered at the origin of radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawSphere() {
    setMV();
    Sphere.draw();
}

// Post multiples the modelview matrix with a translation matrix
// and replaces the modeling matrix with the result, x, y, and z are the translation amounts for each axis
function gTranslate(x, y, z) {
    modelMatrix = mult(modelMatrix, translate([x, y, z]));
}

// Post multiples the modelview matrix with a rotation matrix
// and replaces the modeling matrix with the result, theta is the rotation amount, x, y, z are the components of an axis vector (angle, axis rotations!)
function gRotate(theta, x, y, z) {
    modelMatrix = mult(modelMatrix, rotate(theta, [x, y, z]));
}

// Post multiples the modelview matrix with a scaling matrix
// and replaces the modeling matrix with the result, x, y, and z are the scale amounts for each axis
function gScale(sx, sy, sz) {
    modelMatrix = mult(modelMatrix, scale(sx, sy, sz));
}

// Pops MS and stores the result as the current modelMatrix
function gPop() {
    modelMatrix = MS.pop();
}

// pushes the current modelViewMatrix in the stack MS
function gPush() {
    MS.push(modelMatrix);
}


function render(timestamp) {

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    eye = vec3(0, 0, 10);
    MS = []; // Initialize modeling matrix stack

    // initialize the modeling matrix to identity
    modelMatrix = mat4();

    // set the camera matrix
    viewMatrix = lookAt(eye, at, up);

    // set the projection matrix
    projectionMatrix = ortho(left, right, bottom, ytop, near, far);


    // set all the matrices
    setAllMatrices();

    if (animFlag) {
        // dt is the change in time or delta time from the last frame to this one
        // in animation typically we have some property or degree of freedom we want to evolve over time
        // For example imagine x is the position of a thing.
        // To get the new position of a thing we do something called integration
        // the simpelst form of this looks like:
        // x_new = x + v*dt
        // That is, the new position equals the current position + the rate of of change of that position (often a velocity or speed) times the change in time
        // We can do this with angles or positions, the whole x,y,z position, or just one dimension. It is up to us!
        dt = (timestamp - prevTime) / 1000.0;
        prevTime = timestamp;

        orbitAngle += 10 * dt;
        TIME += dt
    }

    drawAstronaut();
    drawStars();
    gScale(1.5, 1.5, 1.5);
    drawJellyfish();

    if (animFlag)
        window.requestAnimFrame(render);
}

function drawAstronaut() {

    var amplitude = 1.5;  // Adjust height of floating
    var angularFreq = 0.25;      // Adjust speed of floating
    var floatOffset = amplitude * Math.sin(TIME * angularFreq);

    gPush();
    {
        gTranslate(cubePosition[0] + floatOffset, cubePosition[1] + floatOffset, cubePosition[2]);

        // DEBUG ROTATIONS - REMOVE BEFORE SUBMISSION
        // gRotate(astronautRotation, 0, 1, 0);
        // gRotate(-astronautVRotation, 1, 0, 0);

        gRotate(-20, 0, 1, 0);

        gPush();
        {
            gScale(0.5, 1, 0.5);
            setColor(vec4(1.0, 1.0, 1.0, 1.0));

            drawCube();
        }
        gPop();

        // Circuitry 
        gPush();
        {
            gTranslate(cubePosition[0] - 1.25, cubePosition[1] + 0.5, cubePosition[2] + 0.5);

            gPush(); // NASA Patch
            {
                setColor(vec4(0.0, 0.0, 1.0, 1.0));

                // gRotate(-20, 0, 1, 0);
                gScale(0.15, 0.15, 0.01);
                drawSphere();
            }
            gPop();

            gPush(); // Other buttons - Top 
            {
                setColor(vec4(0.0, 0.0, 1.0, 1.0));
                gTranslate(0.075, -0.4, 0)
                gScale(0.1, 0.1, 0.1);
                drawSphere();

                gTranslate(3.5, 0, 0)
                drawSphere();
            }
            gPop();

            gPush(); // Other buttons - Middle
            {
                setColor(vec4(0.94, 0.74, 1.0, 1.0));
                gTranslate(0, -0.75, 0)
                gScale(0.1, 0.1, 0.1);
                drawSphere();

                gTranslate(5.5, 0, 0)
                drawSphere();
            }
            gPop();

            gPush(); // Other buttons - Bottom
            {
                setColor(vec4(1.0, 0.0, 0.0, 1.0));
                gTranslate(0.075, -1.1, 0)
                gScale(0.1, 0.1, 0.1);
                drawSphere();

                gTranslate(3.5, 0, 0)
                drawSphere();
            }
            gPop();
        }
        gPop();

        // Head
        gPush();
        {
            gTranslate(cubePosition[0] - 1, cubePosition[1] + 1.35, cubePosition[2]);
            setColor(vec4(1.0, 1.0, 1.0, 1.0))
            gScale(0.45, 0.45, 0.45);
            drawSphere();

            // Visor
            gScale(1, 0.7, 1);
            setColor(vec4(0.92, 0.61, 0.22, 1.0));
            gTranslate(cubePosition[0] - 1.25, cubePosition[1], cubePosition[2] + 0.5);
            drawSphere();
        }
        gPop();

        // Arms
        gPush();
        {
            gTranslate(cubePosition[0] - 2.1, cubePosition[1] + 0.5, cubePosition[2]);
            gScale(0.5, 0.5, 0.5);
            drawArm();

            gTranslate(cubePosition[0] + 2.5, cubePosition[1] - 1, cubePosition[2]);
            gRotate(100, 0, 0, 1);
            drawArm();
        }
        gPop();

        // Legs
        gPush();
        {
            gTranslate(cubePosition[0] - 1.75, cubePosition[1] - 1, cubePosition[2] - 0.1);
            gScale(0.5, 0.5, 0.5);
            drawLeg("right");

            gTranslate(cubePosition[0], cubePosition[1], cubePosition[2]);
            drawLeg("left");
        }
        gPop();
    }
    gPop();
}

function drawArm() {
    gPush();
    {
        gTranslate(cubePosition[0], cubePosition[1], cubePosition[2]);
        setColor(vec4(1.0, 1.0, 1.0, 1.0));

        gPush();
        {
            armSwing = 10 * Math.sin(TIME * 1.0);
            gRotate(armSwing, 0, 0, 1);
            gRotate(-50, 0, 0, 1);

            // Cube to act as shoulder pivot when arms rotate 
            gScale(0.3, 0.1, 0.3);
            drawCube();

            // Actual arms
            gTranslate(cubePosition[0] - 1, cubePosition[1] - 10, cubePosition[2]);
            gScale(1, 12, 1);
            drawCube();
        }
        gPop();
    }
    gPop();
}

function drawLeg(side) {
    gPush();
    {
        gTranslate(cubePosition[0], cubePosition[1], cubePosition[2]);
        setColor(vec4(1.0, 1.0, 1.0, 1.0));
        gPush();
        {
            let legSwing = 20 * Math.sin(TIME * 1.0);
            if (side === "left") { // Legs rotate in opposite directions
                gRotate(legSwing, 1, 0, 0);
            } else {
                gRotate(-legSwing, 1, 0, 0);
            }

            // Cube to act as hip pivot when legs rotate 
            gScale(0.3, 0.1, 0.3);
            drawCube();

            gPush(); // Upper leg
            {
                gTranslate(0, -11, 0);
                gScale(1, 10, 1);
                drawCube();
            }
            gPop();

            gPush();
            {
                gTranslate(-2, -25, -2)
                gScale(2, 7, 2);
                drawLowerLeg();
            }
            gPop();

        }
        gPop();
    }
    gPop();
}

function drawLowerLeg() {
    gPush();
    {
        gTranslate(cubePosition[0], cubePosition[1], cubePosition[2]);
        setColor(vec4(1.0, 1.0, 1.0, 1.0));

        gPush();
        {
            gRotate(50, 1, 0, 0);
            gScale(0.5, 1.5, 0.5);
            drawCube();

            // Foot
            gTranslate(cubePosition[0] - 1, cubePosition[1] - 1.1, cubePosition[2] + 0.5)
            gScale(1, 0.1, 1.5);
            drawCube();
        }
        gPop();
    }
    gPop();
}

function drawJellyfish() {
    gPush();
    {
        gScale(0.5, 0.5, 0.5);

        gRotate(orbitAngle, 0, 1, 0);

        gTranslate(6, 1, 0);
        gRotate(90, 0, 1, 0);

        // gTranslate(spherePosition[0], spherePosition[1], spherePosition[2])
        gPush();
        {
            setColor(vec4(0.96, 0.14, 0.83, 1.0));
            gScale(0.5, 1, 1);

            drawSphere();

            gPush();
            {
                gTranslate(spherePosition[0] - 1, spherePosition[1], spherePosition[2])
                gScale(0.7, 0.7, 0.7);

                drawSphere();
            }
            gPop();
        }
        gPop();
        gPush();
        {
            gTranslate(spherePosition[0] - 0.25, spherePosition[1] + 0.65, spherePosition[2])
            gScale(0.45, 0.45, 0.45)
            drawTentacles(5);

            gTranslate(spherePosition[0], spherePosition[1] - 1.4, spherePosition[2])
            drawTentacles(5);
            
            gTranslate(spherePosition[0], spherePosition[1] - 1.4, spherePosition[2])
            drawTentacles(5);
        }
        gPop();
    }
    gPop();
}

function drawTentacles(numSegments) {
    let phaseShift = Math.PI / 6; // Adjusts the delay between segments

    gPush();
    {
        gRotate(-90, 0, 0, 1);
        for (let i = 0; i < numSegments; i++) {
            let rotationAngle = Math.cos(TIME * 1.0 + i * phaseShift) * 10; // Rotation for segments following wave

            gRotate(rotationAngle, 0, 0, 1);
            gTranslate(0, -0.75 * 2, 0); // Move to next segment

            gPush();
            {
                setColor(vec4(0.92, 0.61, 0.22, 1.0));
                gScale(0.25, 0.75, 0.25);
                drawSphere();
            }
            gPop();
        }
    }
    gPop();
}



const NUM_STARS = 60; // Number of stars
let stars = [];       // Array to store star positions

// Initialize stars with random original positions and sizes
for (let i = 0; i < NUM_STARS; i++) {
    var original_x = Math.random() * 20 - 10;
    var original_y = Math.random() * 10 - 5;
    var original_z = Math.random() * -10;
    var size = 0.01 + Math.random() * (0.05 - 0.01);

    // Push values to stars array
    stars.push({
        x: original_x,
        y: original_y,
        z: original_z,
        original_x: original_x,
        original_y: original_y,
        size: size
    });
}

function drawStars() {
    gPush();
    {
        setColor(vec4(1.0, 1.0, 1.0, 1.0));

        for (let i = 0; i < NUM_STARS; i++) {
            let star = stars[i];

            // Moving stars to the top-right
            star.x += 0.01;
            star.y += 0.01;

            // Reset if it moves offscreen
            if (star.x > 6 || star.y > 6) {
                star.x = star.original_x - 12; // Reset to x-position offscreen
                star.y = star.original_y - 12; // Reset to y-position offscreen
            }

            gPush();
            {
                gTranslate(star.x, star.y, star.z);
                gScale(star.size, star.size, star.size);
                drawSphere();
            }
            gPop();
        }
    }
    gPop();
}