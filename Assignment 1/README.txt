CSC305 - Introduction to Computer Graphics
Assignment 1: Astronaut and Jellyfish in Space

All required elements of of the assignment have been implemented:
    - Astronaut:
        - Head and Visor
        - Torso:
            - NASA Patch
            - Inlets/Outlets
        - Arms & Legs:
            - Animated them such that the legs kick back and forth. Arms also rotate
        - Animated astronaut such that it oscillates in both x and y world directions

    - Jellyfish:
        - Body (2 ellipses)
        - 3 tentacles (5 ellipses)
        - Tentacle animation works somewhat but not as fluid as demo shown. 
        - Floats around in a circle around the astronaut, aligned with the tangent

    - Stars:
        - Randomly seeded behind foreground objects and move offscreen to the top-right
        - Randomly scaled and positions resets once stars move offscreen

    - Using 512x512 window 