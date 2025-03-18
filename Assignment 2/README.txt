CSC305 - Introduction to Computer Graphics
Assignment 2: Snowglobe with Wintery Scene

The following required elements of of the assignment have been implemented:
    - Hierarchical objects for rotation (Penguin wing flapping and Snowglobe shaking)
    - 360-degree camera fly around
    - Connection to real-time. Used dt and timestamp
    - Converted ADS shader from vertext to fragment in HTML file
    - Made use of multiple textures to create the scene
    - Fragment shader converts Phong to Blinn-Phong 
    - Globe texture utilizes transparency shader effect allowing you to see inside the globe (changed the alpha variable)
      Also implemented cel shading effect using lighting which was modified in HTML file (adjusted the lighting to swicth to a certain amount based on the light level of that space)  
    - Using 512x512 window 

Concept:
    The scene presented is winter themed, involving a snowglobe that has a penguin sliding around on a snow terrain with snowmen and trees. There is also snow that falls 
    constantly from the edge of the snowglobe. When the snow touches the ground, it resets its position to represent continuous snowfall. 
    The snowglobe itself moves up off of the platform, shakes (to show that the snowglobe is being shaken), and then goes back down. This animation cycle repeats throughout.

Issues:
    - The texture that was placed on the globe of the snowglobe still needs work. The texture mapping on the sphere might be the cause of the issue.

Refereces:
    - Used code from Lab5
    - Used similar code for snow as stars from Assignment 1
    - Used textures for snow, ice, and tree parts from https://opengameart.org/
    - Penguin texture was made from scratch
    - Gold, winter, and glass textures taken from Google using Creative License filter
    - Rest are plain color textures I made