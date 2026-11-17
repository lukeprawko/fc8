"""
CyberDuck 3D - Generator sceny w Blenderze
Ten skrypt tworzy pełną scenę 3D z modelem Kaczki Cyberpunk,
drogą, samochodami, oświetleniem PBR i kamerą z pierwszej i trzeciej osoby.

Jak uruchomić w Blenderze:
1. Otwórz Blendera.
2. Wejdź w zakładkę 'Scripting'.
3. Otwórz ten plik (lub wklej jego treść) i kliknij 'Run Script' (Alt + P).
"""

import bpy
import math

def clean_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for m in bpy.data.materials:
        bpy.data.materials.remove(m)
    for c in bpy.data.cameras:
        bpy.data.cameras.remove(c)
    for l in bpy.data.lights:
        bpy.data.lights.remove(l)

def create_material(name, diffuse_color, roughness=0.3, metallic=0.0, emission_color=(0,0,0,1), emission_strength=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = diffuse_color
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = metallic
        if 'Emission Color' in bsdf.inputs:
            bsdf.inputs['Emission Color'].default_value = emission_color
            bsdf.inputs['Emission Strength'].default_value = emission_strength
        elif 'Emission' in bsdf.inputs:
            bsdf.inputs['Emission'].default_value = emission_color
    return mat

def create_duck(x=0, y=0, z=0, name="CyberDuck", body_color=(0.0, 0.94, 1.0, 1.0)):
    # Materiały
    mat_body = create_material(f"{name}_Body", body_color, roughness=0.25, metallic=0.15)
    mat_beak = create_material(f"{name}_Beak", (1.0, 0.45, 0.0, 1.0), roughness=0.4, metallic=0.0)
    mat_eye = create_material(f"{name}_Eye", (0.05, 0.05, 0.08, 1.0), roughness=0.1, metallic=0.8)
    mat_neon = create_material(f"{name}_Neon", (0.0, 0.95, 1.0, 1.0), roughness=0.1, metallic=0.0, emission_color=body_color, emission_strength=5.0)

    # Korpus kaczki
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(x, y, z + 0.6))
    body = bpy.context.active_object
    body.name = f"{name}_Torso"
    body.scale = (0.7, 0.9, 0.6)
    bpy.ops.object.transform_apply(scale=True)
    body.data.materials.append(mat_body)
    
    # Modyfikator Bevel (zaokrąglone krawędzie styl Blender)
    bev = body.modifiers.new(name="Bevel", type='BEVEL')
    bev.width = 0.12
    bev.segments = 3

    # Głowa kaczki
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(x, y + 0.5, z + 1.25))
    head = bpy.context.active_object
    head.name = f"{name}_Head"
    head.scale = (0.55, 0.55, 0.55)
    bpy.ops.object.transform_apply(scale=True)
    head.data.materials.append(mat_body)
    bev_h = head.modifiers.new(name="Bevel", type='BEVEL')
    bev_h.width = 0.1
    bev_h.segments = 3

    # Dziób (Beak)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(x, y + 0.95, z + 1.15))
    beak = bpy.context.active_object
    beak.name = f"{name}_Beak"
    beak.scale = (0.42, 0.45, 0.16)
    bpy.ops.object.transform_apply(scale=True)
    beak.data.materials.append(mat_beak)
    bev_b = beak.modifiers.new(name="Bevel", type='BEVEL')
    bev_b.width = 0.05
    bev_b.segments = 2

    # Oczy
    for side in (-1, 1):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.08, location=(x + side * 0.28, y + 0.68, z + 1.35))
        eye = bpy.context.active_object
        eye.name = f"{name}_Eye_{side}"
        eye.data.materials.append(mat_eye)

    # Skrzydła (Wings)
    for side in (-1, 1):
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(x + side * 0.45, y, z + 0.7))
        wing = bpy.context.active_object
        wing.name = f"{name}_Wing_{side}"
        wing.scale = (0.12, 0.55, 0.35)
        bpy.ops.object.transform_apply(scale=True)
        wing.data.materials.append(mat_body)
        bev_w = wing.modifiers.new(name="Bevel", type='BEVEL')
        bev_w.width = 0.05
        bev_w.segments = 2

    # Neonowy pasek / czubek kaczki
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(x, y + 0.45, z + 1.6))
    crest = bpy.context.active_object
    crest.name = f"{name}_Crest"
    crest.scale = (0.15, 0.35, 0.15)
    bpy.ops.object.transform_apply(scale=True)
    crest.data.materials.append(mat_neon)

def build_scene():
    clean_scene()
    
    # 1. Kaczka Gracza
    create_duck(x=0, y=0, z=0, name="PlayerDuck", body_color=(0.0, 0.94, 1.0, 1.0))
    
    # 2. Rywal (Kaczka 2)
    create_duck(x=2.5, y=1.2, z=0, name="RivalDuck", body_color=(1.0, 0.0, 0.33, 1.0))

    # 3. Asfalt i Pasy Drogi
    mat_road = create_material("RoadMat", (0.08, 0.11, 0.17, 1.0), roughness=0.7, metallic=0.1)
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=(0, 10, 0))
    road = bpy.context.active_object
    road.name = "CyberHighway"
    road.scale = (20.0, 30.0, 1.0)
    bpy.ops.object.transform_apply(scale=True)
    road.data.materials.append(mat_road)

    # 4. Samochód Cyberpunk
    mat_car = create_material("CarBody", (1.0, 0.1, 0.3, 1.0), roughness=0.2, metallic=0.6)
    mat_glass = create_material("CarGlass", (0.05, 0.1, 0.18, 1.0), roughness=0.1, metallic=0.9)
    mat_neon_car = create_material("CarNeon", (0.0, 1.0, 0.8, 1.0), roughness=0.1, emission_color=(0.0, 1.0, 0.8, 1.0), emission_strength=8.0)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-3.0, 8.0, 0.5))
    car = bpy.context.active_object
    car.name = "CyberCar"
    car.scale = (1.8, 3.8, 0.8)
    bpy.ops.object.transform_apply(scale=True)
    car.data.materials.append(mat_car)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-3.0, 7.8, 1.15))
    cabin = bpy.context.active_object
    cabin.name = "CyberCabin"
    cabin.scale = (1.4, 2.0, 0.6)
    bpy.ops.object.transform_apply(scale=True)
    cabin.data.materials.append(mat_glass)

    # 5. Oświetlenie sceny (Eevee / Cycles)
    # Światło słoneczne (Sun)
    bpy.ops.object.light_add(type='SUN', location=(5, -5, 12))
    sun = bpy.context.active_object
    sun.data.energy = 3.5
    sun.data.color = (0.95, 0.98, 1.0)
    sun.rotation_euler = (math.radians(45), math.radians(20), math.radians(30))

    # Oświetlenie Neonowe (Cyber Glow)
    bpy.ops.object.light_add(type='POINT', location=(-3.0, 10.5, 0.4))
    headlight = bpy.context.active_object
    headlight.data.energy = 250.0
    headlight.data.color = (0.0, 0.9, 1.0)

    # 6. Kamery
    # Kamera FPV (Z pierwszej osoby - z oczu kaczki)
    bpy.ops.object.camera_add(location=(0, 0.6, 1.35))
    cam_fpv = bpy.context.active_object
    cam_fpv.name = "Camera_FirstPerson"
    cam_fpv.rotation_euler = (math.radians(88), 0, 0)
    cam_fpv.data.lens = 18.0 # Szerokokątny obiektyw

    # Kamera TPV (Zza pleców)
    bpy.ops.object.camera_add(location=(0, -4.5, 3.2))
    cam_tpv = bpy.context.active_object
    cam_tpv.name = "Camera_ThirdPerson"
    cam_tpv.rotation_euler = (math.radians(65), 0, 0)
    cam_tpv.data.lens = 28.0

    # Ustawienie aktywnej kamery na FPV
    bpy.context.scene.camera = cam_fpv
    print("Scena CyberDuck 3D została pomyślnie wygenerowana w Blenderze!")

if __name__ == "__main__":
    build_scene()
