"""Convierte las piezas de ajedrez (STL en mm, Z arriba) a un único GLB en metros, Y arriba.

Cada pieza queda como un nodo con su nombre, apoyada en y = 0 y centrada en su eje.
Uso: python tools/convert_chess.py <carpeta_stl> <salida.glb>
Requiere trimesh, pymeshlab, scipy y numpy.
"""
import sys
import numpy as np
import trimesh
import pymeshlab

SRC, OUT = sys.argv[1], sys.argv[2]
# Caras finales por pieza: la vista del sitio es chica, el caballo necesita más detalle.
TARGET = {"Peon": 3000, "Torre": 3500, "Alfil": 4000, "Reina": 4500, "Rey": 4500, "Caballero": 7000}

# mm → m y Z arriba → Y arriba: (x, y, z) → (x, z, -y)
FIX = np.array([[1, 0, 0, 0], [0, 0, 1, 0], [0, -1, 0, 0], [0, 0, 0, 1]], dtype=float)
FIX[:3, :3] *= 0.001

scene = trimesh.Scene()
material = trimesh.visual.material.PBRMaterial(name="pieza", baseColorFactor=[200, 200, 200, 255], roughnessFactor=0.5)
for name, faces in TARGET.items():
    ms = pymeshlab.MeshSet()
    ms.load_new_mesh(f"{SRC}/{name}.stl")
    ms.meshing_merge_close_vertices()
    ms.meshing_decimation_quadric_edge_collapse(
        targetfacenum=faces, preservenormal=True, preservetopology=True, qualitythr=0.5, planarquadric=True
    )
    cur = ms.current_mesh()
    m = trimesh.Trimesh(cur.vertex_matrix(), cur.face_matrix(), process=True)
    m.apply_transform(FIX)
    m.apply_translation([0, -m.bounds[0][1], 0])
    # Sombreado suave salvo en las aristas marcadas (almenas, corona, cortes del alfil)
    m = trimesh.graph.smooth_shade(m, angle=np.radians(35))
    m.visual = trimesh.visual.TextureVisuals(material=material)
    scene.add_geometry(m, node_name=name, geom_name=name)
    top = m.vertices[m.vertices[:, 1] > m.bounds[1][1] * 0.7]
    print(f"{name}: {len(m.faces)} caras, alto {m.bounds[1][1] * 1000:.1f} mm, "
          f"centro de la parte alta x={top[:, 0].mean() * 1000:.2f} z={top[:, 2].mean() * 1000:.2f} mm")

scene.export(OUT, include_normals=True)
print("listo:", OUT)
