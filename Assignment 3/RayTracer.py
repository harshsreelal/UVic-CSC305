import numpy as np
import sys

CAMERA_POS = [0.0, 0.0, 0.0]

class Sphere:
    def __init__(self, data):
        self.name = data[1]
        self.xPos = float(data[2])
        self.yPos = float(data[3])
        self.zPos = float(data[4])
        self.xScale = float(data[5])
        self.yScale = float(data[6])
        self.zScale = float(data[7])
        self.color = [float(data[8]), float(data[9]), float(data[10])]
        self.ka = float(data[11])
        self.kd = float(data[12])
        self.ks = float(data[13])
        self.kr = float(data[14])
        self.n = float(data[15])

class Light:
    def __init__(self, data):
        self.name = data[1]
        self.pos = [float(data[2]), float(data[3]), float(data[4])]
        self.colour = [float(data[5]), float(data[6]), float(data[7])]

class Ray:
    def __init__(self, origin, direction):
        self.origin = origin
        self.direction = direction / np.linalg.norm(direction)

def magnitude(v):
    return (v[0]**2 + v[1]**2 + v[2]**2)**(1/2)

def normalize(v):
    return v / magnitude(v)

def hitSphere(ray, sphere, invM, homoOrigin, homoDir):
    # Transform ray origin and direction into the sphere's coordinate system.
    invS = np.matmul(invM, homoOrigin)[:3]
    invC = np.matmul(invM, homoDir)[:3]
    
    # Compute quadratic coefficients for the intersection equation.
    a = np.dot(invC, invC)  # equivalent to magnitude(invC)**2 but more efficient
    b = np.dot(invS, invC)
    c = np.dot(invS, invS) - 1  # Sphere is unit sphere in local coordinates.
    
    discriminant = b * b - a * c
    if discriminant < 0:
        return []  # No real roots, so no intersections.
    else:
        # Compute both intersection distances.
        sqrt_disc = np.sqrt(discriminant)
        t1 = (-b / a + sqrt_disc) / a
        t2 = (-b / a - sqrt_disc) / a
        return [t1, t2]
    
def getReflectedRay(incident, P, N):
    normN = normalize(N)
    # Reflect the incident direction using the reflection formula.
    reflected_direction = incident.direction + (-2 * np.dot(normN, incident.direction) * normN)
    # Create new Ray; increase depth for recursion in ray tracing.
    return Ray(P, reflected_direction, incident.depth + 1)

def contributesLight(startSphere, endSphere, side, distToIntersect, dirToLight):
    # Compute squared distance to the light to avoid an extra square root.
    distToLight = np.dot(dirToLight, dirToLight)
    hitNear = (side == "near")
    hitSphere = (endSphere is not None)
    # Check whether the same sphere is hit (self-shadow).
    hitSelf = hitSphere and (startSphere.name == endSphere.name)

    if not hitSphere and hitNear:
        # Light reaches the surface without hitting any other sphere.
        return True
    elif hitSelf and (not hitNear) and (distToLight < distToIntersect):
        # Light originates inside the sphere hitting the far side.
        return True
    elif not hitSelf and hitNear:
        # A different sphere blocks the light.
        return False
    else:
        return False

def save_imageP6(width, height, fname, pixels):
    """
    Save image in binary P6 format.
    
    Parameters:
      width (int): image width
      height (int): image height
      fname (str): filename to write to
      pixels (list or bytearray): flat list of pixel values (in order R, G, B)
    """
    max_val = 255
    print(f"Saving image {fname}: {width} x {height}")
    
    try:
        with open(fname, "wb") as f:
            # Write the PPM header
            header = f"P6\n{width} {height}\n{max_val}\n"
            f.write(header.encode('ascii'))
            
            # Write pixel data. The pixels list is assumed to be in row-major order.
            # Since each pixel is 3 bytes, we can iterate row by row.
            row_length = width * 3
            for j in range(height):
                offset = j * row_length
                # Convert the current row to a bytes object.
                # If pixels is already a bytearray or bytes, this step might not be needed.
                row = bytes(pixels[offset:offset + row_length])
                f.write(row)
                
    except IOError:
        print(f"Unable to open file '{fname}'")
        return


def save_imageP3(width, height, fname, pixels):
    """
    Save image in text P3 format.
    
    Parameters:
      width (int): image width
      height (int): image height
      fname (str): filename to write to
      pixels (list): flat list of pixel values (in order R, G, B)
    """
    max_val = 255
    print(f"Saving image {fname}: {width} x {height}")
    
    try:
        with open(fname, "w") as f:
            # Write the PPM header
            f.write("P3\n")
            f.write(f"{width} {height}\n")
            f.write(f"{max_val}\n")
            
            k = 0
            # Write pixel values row by row.
            for j in range(height):
                row_pixels = []
                for i in range(width):
                    r = pixels[k]
                    g = pixels[k+1]
                    b = pixels[k+2]
                    row_pixels.append(f"{r} {g} {b}")
                    k += 3
                # Join each pixel's string for the row and write the line.
                f.write(" ".join(row_pixels) + "\n")
                
    except IOError:
        print(f"Unable to open file '{fname}'")
        return

def outputPPM(info, spheres, lights, outputFileBase):
    """
    Render the scene and save the resulting image as both P3 and P6 PPM files.
    
    Parameters:
      info (dict): Scene parameters (should include keys like 'res', 'right', 'top', 'near', etc.)
      spheres (list): List of sphere objects for raytracing.
      lights (list): List of light objects for raytracing.
      outputFileBase (str): Base name for output files (suffixes will be added for P3 and P6).
    """
    width = info["res"]["x"]
    height = info["res"]["y"]
    # Create an empty image array (flat) with the appropriate data type.
    image = np.zeros([width * height * 3])

    # Define the camera basis vectors.
    u = np.array([1.0, 0.0, 0.0])
    v = np.array([0.0, 1.0, 0.0])
    n = np.array([0.0, 0.0, -1.0])

    percentInc = int(height / 10) if height >= 10 else 1

    # Loop over each pixel and compute its color via raytracing.
    for r in range(height):
        if r % percentInc == 0:
            print(f'{(r / height)*100:.0f}% Complete')
        for c in range(width):
            # Compute the direction for the current ray.
            xComp = info["right"] * (2.0 * c / width - 1)
            yComp = info["top"] * (2.0 * (height - r) / height - 1)
            zComp = info["near"]
            direction = xComp * u + yComp * v + zComp * n

            # Create and trace the ray.
            ray = Ray(CAMERA_POS, direction)
            pixelColour = raytrace(ray, spheres, lights, info)
            # Clamp colour components to [0,1] then scale to [0,255]
            clippedPix = np.clip(pixelColour, 0, 1) * 255

            # Write the colour values into the image array.
            idx = 3 * (r * width + c)
            image[idx]     = int(clippedPix[0])
            image[idx + 1] = int(clippedPix[1])
            image[idx + 2] = int(clippedPix[2])

    # Prepare output filenames for P3 and P6.
    outputFileP6 = outputFileBase + "_P6.ppm"
    outputFileP3 = outputFileBase + "_P3.ppm"
    
    # Save the image in both binary (P6) and text (P3) PPM formats.
    save_imageP6(width, height, outputFileP6, image)
    save_imageP3(width, height, outputFileP3, image)
    
    print("Render Complete. Output files:", outputFileP6, "and", outputFileP3)

def main():
    filename = sys.argv[1]
    scene = {}
    sphereList = []
    lightList = []
    outputFilename = None

    with open(filename, 'r') as file:
        lines = file.readlines()
        details = [line.strip() for line in lines if line.strip()]

    for line in details:
        tokens = line.split()
        if tokens[0] == "NEAR":
            scene["near"] = float(tokens[1])
        elif tokens[0] == "LEFT":
            scene["left"] = float(tokens[1])
        elif tokens[0] == "RIGHT":
            scene["right"] = float(tokens[1])
        elif tokens[0] == "BOTTOM":
            scene["bottom"] = float(tokens[1])
        elif tokens[0] == "TOP":
            scene["top"] = float(tokens[1])
        elif tokens[0] == "RES":
            scene["res"], scene["res"]["x"], scene["res"]["y"] = {}, int(tokens[1]), int(tokens[2])
        elif tokens[0] == "SPHERE": 
            sphereList.append(Sphere(tokens))
        elif tokens[0] == "LIGHT":
            lightList.append(Light(tokens))
        elif tokens[0] == "BACK":
            scene["background"] = [float(tokens[1]), float(tokens[2]), float(tokens[3])]
        elif tokens[0] == "AMBIENT":
            scene["ambient"] = [float(tokens[1]), float(tokens[2]), float(tokens[3])]
        elif tokens[0] == "OUTPUT":
            outputFilename = tokens[1]

    if "res" not in scene:
        scene["res"] = {"x": 128, "y": 128}
    if outputFilename is None:
        outputFilename = "output_scene"
    
    # Call printPPM to render and save using both P3 and P6 formats.
    outputPPM(scene, sphereList, lightList, outputFilename)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python RayTracer.py <input_file>")
        sys.exit(1)

    main()
