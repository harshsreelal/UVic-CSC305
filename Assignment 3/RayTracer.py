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
                self.dict["res_x"], self.dict["res_y"] = int(tokens[1]), int(tokens[2])
            elif tokens[0] == "SPHERE": 
                self.dict.setdefault("spheres", []).append(self.parse_sphere(tokens))
            elif tokens[0] == "LIGHT":
                self.dict.setdefault("lights", []).append(self.parse_light(tokens))
            elif tokens[0] == "BACK":
                self.dict["background"] = list(map(float, tokens[1:4]))
            elif tokens[0] == "AMBIENT":
                self.dict["ambient"] = list(map(float, tokens[1:4]))
            elif tokens[0] == "OUTPUT":
                self.dict["output"] = tokens[1]

    def parse_sphere(self, tokens):
        """Parse sphere attributes."""
        return {
            "name": tokens[1],
            "position": np.array(list(map(float, tokens[2:5]))),
            "scale": np.array(list(map(float, tokens[5:8]))),
            "color": np.array(list(map(float, tokens[8:11]))),
            "ka": float(tokens[11]),
            "kd": float(tokens[12]),
            "ks": float(tokens[13]),
            "kr": float(tokens[14]),
            "specular_exp": int(tokens[15])
        }
    
    def parse_light(self, tokens):
        """Parse light source attributes."""
        return {
            "name": tokens[1],
            "position": np.array(list(map(float, tokens[2:5]))),
            "intensity": np.array(list(map(float, tokens[5:8])))
        }
    
    def generate_image(self):
        """Initialize the image buffer with background color."""
        res_x, res_y = self.dict["res_x"], self.dict["res_y"]
        self.image = np.zeros((res_y, res_x, 3))
        bg_color = np.array(self.dict["background"])
        self.image[:, :] = bg_color
    
    def render(self):
        """Perform ray tracing and save the final image."""
        self.generate_image()
        # Implement ray tracing logic here
        self.save_image_p3()
        self.save_image_p6()

    def save_image_p3(self):
        """Save the image in P3 (text) PPM format."""
        res_x, res_y = self.dict["res_x"], self.dict["res_y"]
        output_filename = self.dict["output"] + "_P3.ppm"
        print(f"Saving image {output_filename}: {res_x} x {res_y}")
        with open(output_filename, "w") as f:
            f.write(f"P3\n{res_x} {res_y}\n255\n")
            for row in self.image:
                for pixel in row:
                    f.write(f"{pixel[0]} {pixel[1]} {pixel[2]} ")
                f.write("\n")

    def save_image_p6(self):
        """Save the image in P6 (binary) PPM format."""
        res_x, res_y = self.dict["res_x"], self.dict["res_y"]
        output_filename = self.dict["output"] + "_P6.ppm"
        print(f"Saving image {output_filename}: {res_x} x {res_y}")
        with open(output_filename, "wb") as f:
            f.write(f"P6\n{res_x} {res_y}\n255\n".encode())
            f.write(self.image.tobytes())

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python RayTracer.py <input_file>")
        sys.exit(1)

    ray_tracer = RayTracer(sys.argv[1])
    ray_tracer.parse_input()
    ray_tracer.render()
