import numpy as np
import sys

class RayTracer:
    def __init__(self, filename):
        self.filename = filename
        self.dict = {}
        self.image = None

    def parse_input(self):
        with open(self.filename, 'r') as file:
            lines = file.readlines()
            details = []
            for line in lines:
                strip_line = line.strip()
                if strip_line:
                    details.append(strip_line)

        for line in details:
            tokens = line.split()
            if tokens[0] == "NEAR":
                self.dict["near"] = float(tokens[1])
            elif tokens[0] == "LEFT":
                self.dict["left"] = float(tokens[1])
            elif tokens[0] == "RIGHT":
                self.dict["right"] = float(tokens[1])
            elif tokens[0] == "BOTTOM":
                self.dict["bottom"] = float(tokens[1])
            elif tokens[0] == "TOP":
                self.dict["top"] = float(tokens[1])
            elif tokens[0] == "RES":
                self.dict["res_x"], self.dict["res_y"] = float(tokens[1]), float(tokens[2])
            elif tokens[0] == "LEFT": # Sphere
                self.dict["left"] = float(tokens[1])
            elif tokens[0] == "LEFT": # Light
                self.dict["left"] = float(tokens[1])
            elif tokens[0] == "BACK":
                self.dict["back"] = float(tokens[1])
            elif tokens[0] == "AMBIENT":
                self.dict["ambient"] = float(tokens[1])