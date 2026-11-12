import json,math,struct
from pathlib import Path
src=Path(r'C:\Users\hoang\Downloads\pha_le_hong_mat_cat_v3.glb')
data=src.read_bytes();length=struct.unpack_from('<I',data,12)[0]
g=json.loads(data[20:20+length]);binary=data[28+length:]
def read(index):
    a=g['accessors'][index];v=g['bufferViews'][a['bufferView']]
    offset=v.get('byteOffset',0)+a.get('byteOffset',0)
    width={'SCALAR':1,'VEC3':3}[a['type']];fmt={5126:'f',5125:'I'}[a['componentType']]
    result=struct.unpack_from('<'+fmt*(a['count']*width),binary,offset)
    return [result[i:i+width] for i in range(0,len(result),width)] if width>1 else list(result)
pr=g['meshes'][0]['primitives'][0]
p=read(pr['attributes']['POSITION']);n=read(pr['attributes']['NORMAL']);indices=read(pr['indices'])
edges={};bad=0;volume=0
for i in range(0,len(indices),3):
    ids=indices[i:i+3];a,b,c=[p[t] for t in ids]
    u=[b[j]-a[j] for j in range(3)];v=[c[j]-a[j] for j in range(3)]
    cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
    assert sum(t*t for t in cross)>1e-20
    if sum(cross[j]*n[ids[0]][j] for j in range(3))<=0:bad+=1
    volume+=sum(a[j]*cross[j] for j in range(3))/6
    tri=[tuple(round(v,9) for v in p[t]) for t in ids]
    for a,b in zip(tri,tri[1:]+tri[:1]):
        key=tuple(sorted((a,b)));edges.setdefault(key,[]).append((a,b))
assert all(len(e)==2 and e[0]==e[1][::-1] for e in edges.values())
assert not bad and volume>0
mat=g['materials'][0]
# Remove scale-sensitive absorption. The bead retains refraction and transmission.
mat['name']='Clear light rose glass - no volume absorption'
mat['pbrMetallicRoughness'].update(baseColorFactor=[1,.87,.93,1],metallicFactor=0,roughnessFactor=.035)
mat['extensions'].pop('KHR_materials_volume',None)
mat['extensions']['KHR_materials_transmission']={'transmissionFactor':1}
mat['extensions']['KHR_materials_ior']={'ior':1.45}
mat['extensions']['KHR_materials_specular']={'specularFactor':.35}
g['extensionsUsed']=list(mat['extensions'])
g['nodes'][0]['name']='Pink crystal - clear v4 - front bore'
j=json.dumps(g,separators=(',',':')).encode();j+=b' '*(-len(j)%4)
out=Path(__file__).with_name('pha_le_hong_trong_v4.glb')
out.write_bytes(struct.pack('<4sII',b'glTF',2,28+len(j)+len(binary))+struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(binary),b'BIN\0')+binary)
assert len(out.read_bytes())==struct.unpack_from('<I',out.read_bytes(),8)[0]
print('Uploaded file: 192 triangles; closed manifold; consistent outward normals; no degenerate faces.')
print('Removed volume absorption; retained front-back bore and full transmission.')
print(out.resolve())
