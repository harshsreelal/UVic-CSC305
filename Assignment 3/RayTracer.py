import numpy as np
import os
import sys

MAX_DEPTH = 5
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
        self.color = [float(data[5]), float(data[6]), float(data[7])]

class Ray:
    def __init__(self, origin, direction, depth = 1):
        self.origin = origin
        self.direction = direction 
        self.depth = depth

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
        t1 = (-b + sqrt_disc) / a
        t2 = (-b - sqrt_disc) / a
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
    hitnear = (side == "near")
    hitSphere = (endSphere is not None)
    # Check whether the same sphere is hit (self-shadow).
    hitSelf = hitSphere and (startSphere.name == endSphere.name)

    if not hitSphere and hitnear:
        # Light reaches the surface without hitting any other sphere.
        return True
    elif hitSelf and (not hitnear) and (distToLight < distToIntersect):
        # Light originates inside the sphere hitting the far side.
        return True
    elif not hitSelf and hitnear:
        # A different sphere blocks the light.
        return False
    else:
        return False
    
def getLightValue(light, spheres, P, hitSphereObj, N, near, side):
    # Compute vector from intersection point to the light.
    L = light.pos - P
    rayToLight = Ray(P, L)
    # Get the first intersection along the shadow ray.
    t, nearestSphere, _, _ = getnearestIntersect(spheres, rayToLight)
    if not contributesLight(hitSphereObj, nearestSphere, side, t, L):
        return [0, 0, 0]  # The light is blocked (in shadow).
    
    normN = normalize(N)
    normL = normalize(L)
    # Flip normal if the hit is on the "far" side.
    if side == "far":
        normN = -normN

    diffuse_intensity = np.dot(normN, normL)
    diffuse = hitSphereObj.kd * np.multiply(light.color, diffuse_intensity) * hitSphereObj.color
    
    # Specular reflection: compute the view direction and reflection vector.
    # V points from the point P toward the camera origin (assumed at [0, 0, 0] for simplicity).
    V = -P  # assuming camera at origin
    normV = normalize(V)
    R = 2 * np.multiply(np.dot(normN, L), normN) - L
    normR = normalize(R)
    # Raise the dot product to the power of the sphere's shininess coefficient.
    spec_intensity = np.dot(normR, normV) ** hitSphereObj.n
    specular = hitSphereObj.ks * np.multiply(light.color, spec_intensity)
    
    return diffuse + specular

def getnearestIntersect(spheres, ray, near=-1):
    t_closest = 100000  # Use a large number as the initial "infinite" distance.
    closestSphere = None
    
    # Loop through each sphere to find the nearest intersection.
    for sphere in spheres:
        # Compute the inverse transformation matrix for the sphere.
        # If possible, precompute and store invM as a property of the sphere.
        invM = [
            [1/sphere.xScale, 0, 0, -sphere.xPos/sphere.xScale],
            [0, 1/sphere.yScale, 0, -sphere.yPos/sphere.yScale],
            [0, 0, 1/sphere.zScale, -sphere.zPos/sphere.zScale],
            [0, 0, 0, 1]
        ]
        homoOrigin = np.append(ray.origin, 1)
        homoDir = np.append(ray.direction, 0)
        hits = hitSphere(ray, sphere, invM, homoOrigin, homoDir)
        
        # Process each intersection distance.
        for hit in hits:
            # Compute the distance along the ray's direction from the origin.
            # When 'near' is defined (not -1), check that the intersection is in front of the near plane.
            zDist = 0
            if near != -1:
                distAlongLine = ray.direction * hit
                zDist = np.dot(np.array([0, 0, -1]), distAlongLine)
            if hit > 0.000001 and hit < t_closest and (zDist > near or ray.depth != 1):
                t_closest = hit
                closestSphere = sphere
                
    invN = None
    side = None
    
    # If a sphere was hit, compute the normal at the intersection point.
    if closestSphere is not None:
        # Construct the sphere's transformation matrix.
        M = [
            [closestSphere.xScale, 0, 0, closestSphere.xPos],
            [0, closestSphere.yScale, 0, closestSphere.yPos],
            [0, 0, closestSphere.zScale, closestSphere.zPos],
            [0, 0, 0, 1]
        ]
        # Compute the intersection point.
        P = ray.origin + ray.direction * t_closest
        # Compute the untransformed (local) normal.
        center = np.array([closestSphere.xPos, closestSphere.yPos, closestSphere.zPos])
        N = P - center
        
        # Transform the normal using the inverse transpose of M.
        homoN = np.append(N, 1)
        inversed = np.matmul(homoN, np.linalg.inv(M))
        invN = np.matmul(np.linalg.inv(np.transpose(M)), inversed)[:3]
        
        # Determine which side of the sphere was hit.
        side = "far" if np.dot(ray.direction, invN) > 0 else "near"
    
    return (t_closest, closestSphere, invN, side)

def raytrace(ray, spheres, lights, sceneInfo):
    # Stop recursion if maximum depth is exceeded.
    if ray.depth > MAX_DEPTH:
        return np.array([0, 0, 0])
    
    # Find the nearest intersection along the ray.
    nearestHit, closestSphere, N, side = getnearestIntersect(spheres, ray, sceneInfo["near"])
    
    # If no sphere is intersected, return the backgroundground color (if at the primary ray level).
    if closestSphere is None:
        if ray.depth == 1:
            return sceneInfo["background"]
        else:
            return np.array([0, 0, 0])
    
    # Compute the intersection point.
    P = ray.origin + ray.direction * nearestHit
    
    # Compute the light contributions (diffuse and specular) from each light source.
    diffuseLight = np.array([0, 0, 0])
    for light in lights:
        diffuseLight = np.add(diffuseLight, getLightValue(light, spheres, P, closestSphere, N, sceneInfo["near"], side))
    
    # Ambient light contribution based on the sphere's ambient coefficient.
    ambient = closestSphere.ka * np.multiply(sceneInfo["ambient"], closestSphere.color)
    
    # Compute the reflected ray and combine its contribution.
    refRay = getReflectedRay(ray, P, N)
    reflection = closestSphere.kr * np.array(raytrace(refRay, spheres, lights, sceneInfo))
    
    return ambient + diffuseLight + reflection

def outputPPM(info, spheres, lights, outputFileBase):
    width = info["res"]["x"]
    height = info["res"]["y"]
    
    # Create headers for P6 (binary) and P3 (ASCII) formats.
    ppm_header_p6 = f"P6\n{width} {height}\n255\n"
    ppm_header_p3 = f"P3\n{width} {height}\n255\n"
    
    # Create an empty image array.
    image = np.zeros(width * height * 3, dtype=np.uint8)
    
    # Define the camera basis vectors.
    u = np.array([1, 0, 0])
    v = np.array([0, 1, 0])
    n = np.array([0, 0, -1])
    
    percentInc = int(height / 10) if height >= 10 else 1
    
    # Loop over each pixel, compute its color via raytracing.
    for r in range(height):
        if r % percentInc == 0:
            print(f'{(r / height) * 100:.0f}% Complete')
        for c in range(width):
            # Map pixel coordinates to scene coordinates.
            xComp = info["right"] * (2.0 * c / width - 1)
            yComp = info["top"] * (2.0 * (height - r) / height - 1)
            zComp = info["near"]
            direction = xComp * u + yComp * v + zComp * n

            ray = Ray(CAMERA_POS, direction)
            pixelColour = raytrace(ray, spheres, lights, info)
            index = 3 * (r * width + c)
            clippedPix = np.clip(pixelColour, 0, 1) * 255
            image[index] = int(clippedPix[0])
            image[index + 1] = int(clippedPix[1])
            image[index + 2] = int(clippedPix[2])
    
    # Strip the extension from the base filename and insert the suffix before the extension.
    base, ext = os.path.splitext(outputFileBase)
    outputFileP6 = f"{base}_P6{ext}"
    outputFileP3 = f"{base}_P3{ext}"
    
    # Save the image in binary P6 format.
    with open(outputFileP6, 'wb') as f:
        f.write(bytearray(ppm_header_p6, 'ascii'))
        image.tofile(f)
    
    # Save the image in text-based P3 format.
    with open(outputFileP3, 'w') as f:
        f.write(ppm_header_p3)
        for r in range(height):
            row_pixels = []
            for c in range(width):
                index = 3 * (r * width + c)
                r_val = image[index]
                g_val = image[index + 1]
                b_val = image[index + 2]
                row_pixels.append(f"{r_val} {g_val} {b_val}")
            f.write(" ".join(row_pixels) + "\n")
    
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
