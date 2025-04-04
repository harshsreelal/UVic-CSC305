
var canvas;
var gl;

var program;

var near = 1;
var far = 100;


var left = -6.0;
var right = 6.0;
var ytop =6.0;
var bottom = -6.0;


var lightPosition2 = vec4(100.0, 100.0, 100.0, 1.0 );
var lightPosition = vec4(-1.0, 5.0, 1.0, 1.0 );
// var lightPosition = vec4(0.0, 0.0, .0, 1.0 );

var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialDiffuse = vec4( 0.8, 0.8, 0.8, 1.0 );
var materialSpecular = vec4( 0.4, 0.4, 0.4, 1.0 );
var materialShininess = 10.0;

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

var shakeActive = false; // Is the globe currently shaking?
var shakeStartTime = 0;  // When did the shaking start?
var shakeInterval = 5000; // Shake every 5000ms (5 seconds)
var lastShakeTime = 0;   // Last time the shake started




// These are used to store the current state of objects.
// In animation it is often useful to think of an object as having some DOF
// Then the animation is simply evolving those DOF over time.
var currentRotation = [0,0,0];

var useTextures = 1;

//making a texture image procedurally
//Let's start with a 1-D array
var texSize = 8;
var imageCheckerBoardData = new Array();

// Now for each entry of the array make another array
// 2D array now!
for (var i =0; i<texSize; i++)
	imageCheckerBoardData[i] = new Array();

// Now for each entry in the 2D array make a 4 element array (RGBA! for colour)
for (var i =0; i<texSize; i++)
	for ( var j = 0; j < texSize; j++)
		imageCheckerBoardData[i][j] = new Float32Array(4);

// Now for each entry in the 2D array let's set the colour.
// We could have just as easily done this in the previous loop actually
for (var i =0; i<texSize; i++) 
	for (var j=0; j<texSize; j++) {
		var c = (i + j ) % 2;
		imageCheckerBoardData[i][j] = [c, c, c, 1];
}

//Convert the image to uint8 rather than float.
var imageCheckerboard = new Uint8Array(4*texSize*texSize);

for (var i = 0; i < texSize; i++)
	for (var j = 0; j < texSize; j++)
	   for(var k =0; k<4; k++)
			imageCheckerboard[4*texSize*i+4*j+k] = 255*imageCheckerBoardData[i][j][k];
		
// For this example we are going to store a few different textures here
var textureArray = [] ;
    
// Setting the colour which is needed during illumination of a surface
function setColor(c)
{
    ambientProduct = mult(lightAmbient, c);
    diffuseProduct = mult(lightDiffuse, c);
    specularProduct = mult(lightSpecular, materialSpecular);
    
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "specularProduct"),flatten(specularProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "lightPosition"),flatten(lightPosition2) );
    gl.uniform1f( gl.getUniformLocation(program, 
                                        "shininess"),materialShininess );
}

// We are going to asynchronously load actual image files this will check if that call if an async call is complete
// You can use this for debugging
function isLoaded(im) {
    if (im.complete) {
        console.log("loaded") ;
        return true ;
    }
    else {
        console.log("still not loaded!!!!") ;
        return false ;
    }
}

// Helper function to load an actual file as a texture
// NOTE: The image is going to be loaded asyncronously (lazy) which could be
// after the program continues to the next functions. OUCH!
function loadFileTexture(tex, filename)
{
	//create and initalize a webgl texture object.
    tex.textureWebGL  = gl.createTexture();
    tex.image = new Image();
    tex.image.src = filename ;
    tex.isTextureReady = false ;
    tex.image.onload = function() { handleTextureLoaded(tex); }
}

// Once the above image file loaded with loadFileTexture is actually loaded,
// this funcion is the onload handler and will be called.
function handleTextureLoaded(textureObj) {
	//Binds a texture to a target. Target is then used in future calls.
		//Targets:
			// TEXTURE_2D           - A two-dimensional texture.
			// TEXTURE_CUBE_MAP     - A cube-mapped texture.
			// TEXTURE_3D           - A three-dimensional texture.
			// TEXTURE_2D_ARRAY     - A two-dimensional array texture.
    gl.bindTexture(gl.TEXTURE_2D, textureObj.textureWebGL);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // otherwise the image would be flipped upsdide down
	
	//texImage2D(Target, internalformat, width, height, border, format, type, ImageData source)
    //Internal Format: What type of format is the data in? We are using a vec4 with format [r,g,b,a].
        //Other formats: RGB, LUMINANCE_ALPHA, LUMINANCE, ALPHA
    //Border: Width of image border. Adds padding.
    //Format: Similar to Internal format. But this responds to the texel data, or what kind of data the shader gets.
    //Type: Data type of the texel data
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureObj.image);
	
	//Set texture parameters.
    //texParameteri(GLenum target, GLenum pname, GLint param);
    //pname: Texture parameter to set.
        // TEXTURE_MAG_FILTER : Texture Magnification Filter. What happens when you zoom into the texture
        // TEXTURE_MIN_FILTER : Texture minification filter. What happens when you zoom out of the texture
    //param: What to set it to.
        //For the Mag Filter: gl.LINEAR (default value), gl.NEAREST
        //For the Min Filter: 
            //gl.LINEAR, gl.NEAREST, gl.NEAREST_MIPMAP_NEAREST, gl.LINEAR_MIPMAP_NEAREST, gl.NEAREST_MIPMAP_LINEAR (default value), gl.LINEAR_MIPMAP_LINEAR.
    //Full list at: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texParameter
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
	
	//Generates a set of mipmaps for the texture object.
        /*
            Mipmaps are used to create distance with objects. 
        A higher-resolution mipmap is used for objects that are closer, 
        and a lower-resolution mipmap is used for objects that are farther away. 
        It starts with the resolution of the texture image and halves the resolution 
        until a 1x1 dimension texture image is created.
        */
    gl.generateMipmap(gl.TEXTURE_2D);
	
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); //Prevents s-coordinate wrapping (repeating)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); //Prevents t-coordinate wrapping (repeating)
    gl.bindTexture(gl.TEXTURE_2D, null);
    console.log(textureObj.image.src) ;
    
    textureObj.isTextureReady = true ;
}

// Takes an array of textures and calls render if the textures are created/loaded
// This is useful if you have a bunch of textures, to ensure that those files are
// actually loaded from disk you can wait and delay the render function call
// Notice how we call this at the end of init instead of just calling requestAnimFrame like before
function waitForTextures(texs) {
    setTimeout(
		function() {
			   var n = 0 ;
               for ( var i = 0 ; i < texs.length ; i++ )
               {
                    console.log(texs[i].image.src) ;
                    n = n+texs[i].isTextureReady ;
               }
               wtime = (new Date()).getTime() ;
               if( n != texs.length )
               {
               		console.log(wtime + " not ready yet") ;
               		waitForTextures(texs) ;
               }
               else
               {
               		console.log("ready to render") ;
					render(0);
               }
		},
	5) ;
}

// This will use an array of existing image data to load and set parameters for a texture
// We'll use this function for procedural textures, since there is no async loading to deal with
function loadImageTexture(tex, image) {
	//create and initalize a webgl texture object.
    tex.textureWebGL  = gl.createTexture();
    tex.image = new Image();

	//Binds a texture to a target. Target is then used in future calls.
		//Targets:
			// TEXTURE_2D           - A two-dimensional texture.
			// TEXTURE_CUBE_MAP     - A cube-mapped texture.
			// TEXTURE_3D           - A three-dimensional texture.
			// TEXTURE_2D_ARRAY     - A two-dimensional array texture.
    gl.bindTexture(gl.TEXTURE_2D, tex.textureWebGL);

	//texImage2D(Target, internalformat, width, height, border, format, type, ImageData source)
    //Internal Format: What type of format is the data in? We are using a vec4 with format [r,g,b,a].
        //Other formats: RGB, LUMINANCE_ALPHA, LUMINANCE, ALPHA
    //Border: Width of image border. Adds padding.
    //Format: Similar to Internal format. But this responds to the texel data, or what kind of data the shader gets.
    //Type: Data type of the texel data
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
	
	//Generates a set of mipmaps for the texture object.
        /*
            Mipmaps are used to create distance with objects. 
        A higher-resolution mipmap is used for objects that are closer, 
        and a lower-resolution mipmap is used for objects that are farther away. 
        It starts with the resolution of the texture image and halves the resolution 
        until a 1x1 dimension texture image is created.
        */
    gl.generateMipmap(gl.TEXTURE_2D);
	
	//Set texture parameters.
    //texParameteri(GLenum target, GLenum pname, GLint param);
    //pname: Texture parameter to set.
        // TEXTURE_MAG_FILTER : Texture Magnification Filter. What happens when you zoom into the texture
        // TEXTURE_MIN_FILTER : Texture minification filter. What happens when you zoom out of the texture
    //param: What to set it to.
        //For the Mag Filter: gl.LINEAR (default value), gl.NEAREST
        //For the Min Filter: 
            //gl.LINEAR, gl.NEAREST, gl.NEAREST_MIPMAP_NEAREST, gl.LINEAR_MIPMAP_NEAREST, gl.NEAREST_MIPMAP_LINEAR (default value), gl.LINEAR_MIPMAP_LINEAR.
    //Full list at: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texParameter
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); //Prevents s-coordinate wrapping (repeating)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); //Prevents t-coordinate wrapping (repeating)
    gl.bindTexture(gl.TEXTURE_2D, null);

    tex.isTextureReady = true;
}

// This just calls the appropriate texture loads for this example adn puts the textures in an array
function initTexturesForExample() {
    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"snow.png") ;
    
    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"ice.png") ;
    
    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"tree_top.png") ;
    
    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"tree_bark.png") ;
    
    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"white.png") ;
    
    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"gold.png") ;
    
    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"glass.png") ;
    
    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"penguin_body.png") ;
    
    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"yellow.png") ;
    
    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"penguin_head.png") ;
    
    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"black.png") ;
    
    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"winter_bg.png") ;
}

// Changes which texture is active in the array of texture examples (see initTexturesForExample)
function toggleTextures() {
    useTextures = (useTextures + 1) % 2
	gl.uniform1i(gl.getUniformLocation(program, "useTextures"), useTextures);
}

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor(0.1, 0.1, 0.1, 1.0);  // Dark gray background
    // gl.clearColor(1, 0, 1, 1.0);  // Dark gray background

    
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    

    setColor(materialDiffuse);
	
	// Initialize some shapes, note that the curved ones are procedural which allows you to parameterize how nice they look
	// Those number will correspond to how many sides are used to "estimate" a curved surface. More = smoother
    Cube.init(program);
    Cylinder.init(20,program);
    Cone.init(20,program);
    Sphere.init(36,program);

    // Matrix uniforms
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    
    // Lighting Uniforms
    gl.uniform4fv( gl.getUniformLocation(program, 
       "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "specularProduct"),flatten(specularProduct) );	
    gl.uniform4fv( gl.getUniformLocation(program, 
       "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
       "shininess"),materialShininess );
    
    document.getElementById("textureToggleButton").onclick = function() {
        toggleTextures() ;
        window.requestAnimFrame(render);
    };

	// Helper function just for this example to load the set of textures
    initTexturesForExample();

    waitForTextures(textureArray);
}

// Sets the modelview and normal matrix in the shaders
function setMV() {
    modelViewMatrix = mult(viewMatrix,modelMatrix);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    normalMatrix = inverseTranspose(modelViewMatrix);
    gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(normalMatrix) );
}

// Sets the projection, modelview and normal matrix in the shaders
function setAllMatrices() {
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );
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

// Draws a cylinder along z of height 1 centered at the origin
// and radius 0.5.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCylinder() {
    setMV();
    Cylinder.draw();
}

// Draws a cone along z of height 1 centered at the origin
// and base radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCone() {
    setMV();
    Cone.draw();
}

// Post multiples the modelview matrix with a translation matrix
// and replaces the modeling matrix with the result
function gTranslate(x,y,z) {
    modelMatrix = mult(modelMatrix,translate([x,y,z]));
}

// Post multiples the modelview matrix with a rotation matrix
// and replaces the modeling matrix with the result
function gRotate(theta,x,y,z) {
    modelMatrix = mult(modelMatrix,rotate(theta,[x,y,z]));
}

// Post multiples the modelview matrix with a scaling matrix
// and replaces the modeling matrix with the result
function gScale(sx,sy,sz) {
    modelMatrix = mult(modelMatrix,scale(sx,sy,sz));
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
    
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    dt = (timestamp - prevTime) / 1000.0;
	prevTime = timestamp;

    TIME += dt;

    var camX = 10 * Math.cos(0.5 * timestamp * 0.0005);
    var camZ = 10 * Math.sin(0.5 * timestamp * 0.0005);
    
    eye = vec3(camX,5,camZ);
    MS = []; // Initialize modeling matrix stack
	
	// initialize the modeling matrix to identity
    modelMatrix = mat4();
    
    // set the camera matrix
    viewMatrix = lookAt(eye, at, up);
   
    // set the projection matrix
    projectionMatrix = ortho(left, right, bottom, ytop, near, far);

    
    // set all the matrices
    setAllMatrices();
    
	// dt is the change in time or delta time from the last frame to this one
	// in animation typically we have some property or degree of freedom we want to evolve over time
	// For example imagine x is the position of a thing.
	// To get the new position of a thing we do something called integration
	// the simpelst form of this looks like:
	// x_new = x + v*dt
	// That is the new position equals the current position + the rate of of change of that position (often a velocity or speed), times the change in time
	// We can do this with angles or positions, the whole x,y,z position or just one dimension. It is up to us!
	
	
	// We need to bind our textures, ensure the right one is active before we draw
	//Activate a specified "texture unit".
    //Texture units are of form gl.TEXTUREi | where i is an integer.
	// gl.activeTexture(gl.TEXTURE0);
	// if (useTextures % 2 == 1) 
	// {
	// 	//Binds a texture to a target. Target is then used in future calls.
	// 	//Targets:
	// 		// TEXTURE_2D           - A two-dimensional texture.
	// 		// TEXTURE_CUBE_MAP     - A cube-mapped texture.
	// 		// TEXTURE_3D           - A three-dimensional texture.
	// 		// TEXTURE_2D_ARRAY     - A two-dimensional array texture.
	// 	gl.bindTexture(gl.TEXTURE_2D, textureArray[0].textureWebGL);
	// 	gl.uniform1i(gl.getUniformLocation(program, "texture1"), 0);
	// }
    // else
	// {
	// 	gl.bindTexture(gl.TEXTURE_2D, textureArray[1].textureWebGL);
	// 	gl.uniform1i(gl.getUniformLocation(program, "texture2"), 0);
	// }
	
	// Now let's draw a shape animated!
	// You may be wondering where the texture coordinates are!
	// We've modified the object.js to add in support for this attribute array!

    gPush();
    {
        gRotate(90, 1, 0, 0);
        gTranslate(0, 0, 0);
        gScale(30, 30, 30);
        gl.activeTexture(gl.TEXTURE0); 
        gl.bindTexture(gl.TEXTURE_2D, textureArray[11].textureWebGL); 
        gl.uniform1i(gl.getUniformLocation(program, "useTextures"), 0);
        gl.uniform1f(gl.getUniformLocation(program, "alpha"), 1.0);
        drawCylinder();
    }
    gPop();


    gTranslate(0, -1, 0);
    gPush();
    {
        gScale(0.75, 0.75, 0.75);

        let cycleDuration = 10.0; // Total animation cycle duration 
        let moveUpTime = 1.0;  // Time to go up
        let shakeTime = 3.0;   // Time to shake
        let moveDownTime = 1.0; // Time to go down
        let amplitude = 30;    // Max shaking angle

        let time = (performance.now() / 1000) % cycleDuration; 
        let moveY = 0;
        let oscillationAngle = 0;

        if (time < moveUpTime) {
            moveY = (time / moveUpTime) * 2.0;
        } else if (time < moveUpTime + shakeTime) {
            moveY = 2.0;

            let shakeTimeElapsed = time - moveUpTime; // Time since shake started
            let frequency = 6 / shakeTime; // 6 oscillations in 3 seconds
            oscillationAngle = amplitude * Math.sin(2 * Math.PI * frequency * shakeTimeElapsed);
        } else if (time < moveUpTime + shakeTime + moveDownTime) {
            let t = (time - (moveUpTime + shakeTime)) / moveDownTime;
            moveY = 2.0 * (1 - t);
        }

        gTranslate(0, moveY, 0);
        gRotate(oscillationAngle, 1, 0, 0);

        drawScene();
        }
        gPop();

        gTranslate(0, -4, 0);

        gPush();
        {
            gScale(5, 1, 5);

            gl.activeTexture(gl.TEXTURE0); 
            gl.bindTexture(gl.TEXTURE_2D, textureArray[0].textureWebGL); 
            gl.uniform1i(gl.getUniformLocation(program, "useTextures"), 0);
            gl.uniform1f(gl.getUniformLocation(program, "alpha"), 1.0);
            
            drawCube();
        }
        gPop();
    
	
    window.requestAnimFrame(render);
}


function drawSnowTerrain() {
    gPush();
    {
        gl.activeTexture(gl.TEXTURE0); 
        gl.bindTexture(gl.TEXTURE_2D, textureArray[0].textureWebGL); 
        gl.uniform1i(gl.getUniformLocation(program, "useTextures"), 0);
        gl.uniform1f(gl.getUniformLocation(program, "alpha"), 1.0);

        gTranslate(0, 0, 0);
        gScale(3, 3, 3);
        drawSphere();

        // Icy path for penguin to slide
        gl.activeTexture(gl.TEXTURE0);  
        gl.bindTexture(gl.TEXTURE_2D, textureArray[1].textureWebGL); 
        gl.uniform1i(gl.getUniformLocation(program, "useTextures"), 0);
        gl.uniform1f(gl.getUniformLocation(program, "alpha"), 1.0);

        gScale(1.025, 1.025, 0.75);
        drawSphere();
    }
    gPop();

    gPush(); // Additions to snow sphere (Snowmen and Trees)
    {
        gPush();
        {
            gTranslate(-1, 2, 3.5);
            gRotate(60, 1, 0, 0);
            gRotate(10, 0, 0, 1);
            gScale(0.5, 0.5, 0.5);
            drawTree();
        }
        gPop();
        
        gPush();
        {
            gTranslate(2, 0, 4);
            gRotate(90, 1, 0, 0);
            gRotate(-30, 0, 0, 1);
            gScale(0.5, 0.5, 0.5);
            drawTree();
        }
        gPop();
        
        gPush();
        {
            gTranslate(-1, -1, 3.5);
            gRotate(90, 1, 0, 0);
            gRotate(10, 0, 0, 1);
            gRotate(120, 0, 1, 0);
            gScale(0.5, 0.5, 0.5);
            drawSnowman();
        }
        gPop();
        
        gPush();
        {
            gTranslate(-1, 2, -3.5);
            gRotate(-60, 1, 0, 0);
            gRotate(10, 0, 0, 1);
            gScale(0.5, 0.5, 0.5);
            drawTree();
        }
        gPop();
        
        gPush();
        {
            gTranslate(2, 0, -4);
            gRotate(-90, 1, 0, 0);
            gRotate(-30, 0, 0, 1);
            gScale(0.5, 0.5, 0.5);
            drawTree();
        }
        gPop();
        
        gPush();
        {
            gTranslate(-1, -1, -3.5);
            gRotate(-90, 1, 0, 0);
            gRotate(10, 0, 0, 1);
            gRotate(-120, 0, 1, 0);
            gScale(0.5, 0.5, 0.5);
            drawSnowman();
        }
        gPop();
    }
    gPop();
}

function drawPenguin() {
    gl.activeTexture(gl.TEXTURE0);  
    gl.bindTexture(gl.TEXTURE_2D, textureArray[7].textureWebGL); 
    gl.uniform1i(gl.getUniformLocation(program, "useTextures"), 0);
    gl.uniform1f(gl.getUniformLocation(program, "alpha"), 1.0);

    gPush();
    {
        gPush(); // Body
        {
            gScale(4, 4, 4);
            gRotate(90, 1, 0, 0);
            drawCylinder();
        }
        gPop();

        gPush(); // Head
        {
            gl.activeTexture(gl.TEXTURE0);  
            gl.bindTexture(gl.TEXTURE_2D, textureArray[9].textureWebGL); 
            gl.uniform1i(gl.getUniformLocation(program, "useTextures"), 0);
            gl.uniform1f(gl.getUniformLocation(program, "alpha"), 1.0);

            gTranslate(0, 2, 0);
            gScale(2, 1.5, 2);
            drawSphere();
        }
        gPop();
        gPush(); // Head
        {
            gTranslate(0, -2, 0);
            gScale(2, 1, 2);
            drawSphere();
        }
        gPop();

        gPush(); // Wings
        {
            gl.activeTexture(gl.TEXTURE0);  
            gl.bindTexture(gl.TEXTURE_2D, textureArray[10].textureWebGL); 
            gl.uniform1i(gl.getUniformLocation(program, "useTextures"), 0);
            gl.uniform1f(gl.getUniformLocation(program, "alpha"), 1.0);
            gTranslate(-2.1, 0.5, 0);
            gRotate(-20, 0, 0, 1);
            drawWings("left");
        }
        gPop();
        
        gPush();
        {
            gTranslate(2.1, 0.5, 0);
            gRotate(20, 0, 0, 1);
            drawWings("right");
        }
        gPop();

        gPush(); // Feet
        {
            gPush();
            {
                gTranslate(-0.5, -3.5, 0);
                gRotate(40, 1, 0, 0);
                drawFeet();
                gTranslate(1, 0, 0)
                drawFeet();
            }
            gPop();
            
        }
        gPop();

        gPush(); // Beak
        {
            gl.activeTexture(gl.TEXTURE0);  
            gl.bindTexture(gl.TEXTURE_2D, textureArray[8].textureWebGL); 
            gl.uniform1i(gl.getUniformLocation(program, "useTextures"), 0);
            gl.uniform1f(gl.getUniformLocation(program, "alpha"), 1.0);

            gTranslate(0, 3.5, 1.9);
            gRotate(-40, 1, 0, 0);
            gScale(0.25, 0.25, 1.5);
            drawCone();
        }
        gPop();
    }
    gPop();
}

function drawWings(side) {
    
    gPush();
    {
        let flapSpeed = 10.0;  
        let maxAngle = 0;

        if (side == "left") {
            maxAngle = -20;
        } else {
            maxAngle = 20;
        }

        let armSwing = maxAngle * Math.max(0, Math.sin(TIME * flapSpeed));

        gRotate(armSwing, 0, 0, 1);

        // Shoulder Pivot
        gScale(0.05, 0.1, 1)
        drawSphere();

        // Actual Wing
        gTranslate(0, -11, 0);
        gScale(5, 15, 1)
        drawSphere();
    }
    gPop();
}

function drawFeet() {
    gPush();
    {
        gl.activeTexture(gl.TEXTURE0);  
        gl.bindTexture(gl.TEXTURE_2D, textureArray[8].textureWebGL); 
        gl.uniform1i(gl.getUniformLocation(program, "useTextures"), 0);
        gl.uniform1f(gl.getUniformLocation(program, "alpha"), 1.0);

        gScale(0.75, 0.25, 1);
        drawSphere();
    }
    gPop();
}

function drawSnowman() {
    gPush();
    {
        gPush(); // Main Body
        {
            gl.activeTexture(gl.TEXTURE0);  
            gl.bindTexture(gl.TEXTURE_2D, textureArray[0].textureWebGL); 
            gl.uniform1i(gl.getUniformLocation(program, "useTextures"), 0);
            gl.uniform1f(gl.getUniformLocation(program, "alpha"), 1.0);

            gTranslate(0, -1, 0);
            drawSphere();
            gTranslate(0, 1.5, 0);
            gScale(0.75, 0.75, 0.75);
            drawSphere();
        }
        gPop();

        gPush();
        {
            gl.activeTexture(gl.TEXTURE0);  
            gl.bindTexture(gl.TEXTURE_2D, textureArray[10].textureWebGL); 
            gl.uniform1i(gl.getUniformLocation(program, "useTextures"), 0);
            gl.uniform1f(gl.getUniformLocation(program, "alpha"), 1.0);

            gPush(); // Eyes
            {
                gTranslate(-0.25, 0.5, 0.75);
                gScale(0.05, 0.15, 0.05);
                drawSphere();
                gTranslate(10, 0, 0);
                drawSphere();
            }
            gPop();

            gPush(); // Buttons
            {
                gTranslate(0, -1, 1);
                gScale(0.1, 0.1, 0.1);
                drawSphere();
                gTranslate(0, 5, -1);
                drawSphere();
                gTranslate(0, -10, -0.5);
                drawSphere();
            }
            gPop();
        }
        gPop();
    }
    gPop();
}

function drawTree() {
    gPush(); // Leaves
    {
        gl.activeTexture(gl.TEXTURE0);  
        gl.bindTexture(gl.TEXTURE_2D, textureArray[2].textureWebGL); 
        gl.uniform1i(gl.getUniformLocation(program, "useTextures"), 0);
        gl.uniform1f(gl.getUniformLocation(program, "alpha"), 1.0);
 
        gTranslate(0, 0, 0);
        gScale(1, 4, 1);
        gRotate(-90, 1, 0, 0);
        drawCone();
    }
    gPop();
    gPush(); // Trunk
    {
        gl.activeTexture(gl.TEXTURE0); 
        gl.bindTexture(gl.TEXTURE_2D, textureArray[3].textureWebGL); 
        gl.uniform1i(gl.getUniformLocation(program, "useTextures"), 0);
        gl.uniform1f(gl.getUniformLocation(program, "alpha"), 1.0);

        gTranslate(0, -2.5, 0);
        gScale(1, 1, 1);
        gRotate(-90, 1, 0, 0);
        drawCylinder();
    }
    gPop();
}

const NUM_SNOW = 400; // Number of snow particles
const SNOW_RADIUS = 5.75; // Distance from the sphere
let snow = []; // Array to store snow positions

// Initialize snow randomly above sphere
for (let i = 0; i < NUM_SNOW; i++) {
    let theta = Math.random() * Math.PI;      // Random latitude (0 to π)
    let phi = Math.random() * Math.PI * 2;    // Random longitude (0 to 2π)

    let x = SNOW_RADIUS * Math.sin(theta) * Math.cos(phi);
    let y = SNOW_RADIUS * Math.sin(theta) * Math.sin(phi);
    let z = SNOW_RADIUS * Math.cos(theta);

    let size = 0.04 + Math.random() * (0.05 - 0.01); // Decide on size of snow

    snow.push({
        x: x, y: y, z: z, 
        original_x: x, original_y: y, original_z: z, 
        size: size,
        velocity: Math.random() * 0.01 + 0.005 // Small outward movement speed
    });
}

function drawSnow() {
    gPush();
    {

        gl.activeTexture(gl.TEXTURE0);  
        gl.bindTexture(gl.TEXTURE_2D, textureArray[4].textureWebGL); 
        gl.uniform1i(gl.getUniformLocation(program, "useTextures"), 0);
        gl.uniform1f(gl.getUniformLocation(program, "alpha"), 1.0);

        for (let i = 0; i < NUM_SNOW; i++) {
            let star = snow[i];

            // Move snow inward (to depict snowfall)
            star.x -= star.velocity * (star.x / SNOW_RADIUS);
            star.y -= star.velocity * (star.y / SNOW_RADIUS);
            star.z -= star.velocity * (star.z / SNOW_RADIUS);

            // Reset snow "touches" the ground
            let distance = Math.sqrt(star.x * star.x + star.y * star.y + star.z * star.z);
            if (distance < 3.5) {
                let theta = Math.random() * Math.PI;
                let phi = Math.random() * Math.PI * 2;

                star.x = SNOW_RADIUS * Math.sin(theta) * Math.cos(phi);
                star.y = SNOW_RADIUS * Math.sin(theta) * Math.sin(phi);
                star.z = SNOW_RADIUS * Math.cos(theta);
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

function drawSnowglobe() {
    gPush();
    {

        gPush(); // Base
        {
            gl.activeTexture(gl.TEXTURE0);  
            gl.bindTexture(gl.TEXTURE_2D, textureArray[5].textureWebGL); 
            gl.uniform1i(gl.getUniformLocation(program, "useTextures"), 0);
            gl.uniform1f(gl.getUniformLocation(program, "alpha"), 1.0);
            
            gPush();
            {
                gTranslate(0, -3, 0);
                gScale(2.5, 0.75, 2.5);
                drawCube();
            }
            gPop();

            gPush();
            {
                gTranslate(0, -2.275, 0);
                gRotate(90, 1, 0, 0);
                gScale(4.5, 4.5, 2.55);
                drawCylinder();
            }
            gPop();
        }
        gPop();
        
        gPush(); // Globe
        {
            gl.activeTexture(gl.TEXTURE0);  
            gl.bindTexture(gl.TEXTURE_2D, textureArray[6].textureWebGL); 
            gl.uniform1i(gl.getUniformLocation(program, "useTextures"), 0);
            gl.uniform1f(gl.getUniformLocation(program, "alpha"), 0.4);
            
            gTranslate(0, 1, 0); 
            gScale(3, 3, 3)
            drawSphere();
        }
        gPop();
    }
    gPop();
}

function drawScene() {
    gPush();
	{
        

        gTranslate(0, 0.9, 0);
        gScale(0.5, 0.5, 0.5);
        gPush();
        {
            gPush();
            {
                currentRotation[2] = currentRotation[2] + 50*dt;
                gRotate(currentRotation[2],0,0,1);
                gTranslate(0, 3.5, 0);
                gRotate(-90, 0, 1, 0);
                gRotate(90, 1, 0, 0);
                gScale(0.25, 0.25, 0.25);
                drawPenguin();
            }
            gPop();
            drawSnowTerrain();
            drawSnow();
        }
        gPop();
    }
	gPop();

    drawSnowglobe();
}