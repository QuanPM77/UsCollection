import math,struct,json
from pathlib import Path
P=[];N=[];I=[]
def face(poly):
    u=[poly[1][i]-poly[0][i] for i in range(3)];v=[poly[2][i]-poly[0][i] for i in range(3)]
    n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
    l=math.sqrt(sum(t*t for t in n));n=[t/l for t in n];b=len(P)
    P.extend(poly);N.extend([n]*len(poly))
    for i in range(1,len(poly)-1):I.extend([b,b+i,b+i+1])
# Front face is +Z in glTF and -Y after Blender's coordinate conversion.
# Staggered facet bands remove the square checkerboard cut of earlier versions.
count=12
profile=[(.0007,-.0036,0),(.0029,-.0036,0),(.0045,-.0022,.5),(.005,-.0007,0),(.005,.0007,0),(.0045,.0022,.5),(.0029,.0036,0),(.0007,.0036,0)]
rings=[]
for r,z,offset in profile:
    rings.append([(r*math.cos((j+offset)*math.tau/count),r*math.sin((j+offset)*math.tau/count),z) for j in range(count)])
for band in range(len(rings)-1):
    for j in range(count):
        k=(j+1)%count;a,b,c,d=rings[band][j],rings[band][k],rings[band+1][k],rings[band+1][j]
        if profile[band][2]!=profile[band+1][2]:face([a,b,d]);face([b,c,d])
        else:face([a,b,c,d])
for j in range(count):
    k=(j+1)%count;face([rings[-1][j],rings[-1][k],rings[0][k],rings[0][j]])
blob=bytearray();views=[];accessors=[]
def add(data,fmt,kind,count,bounds=None):
    raw=struct.pack('<'+fmt*len(data),*data);offset=len(blob);blob.extend(raw)
    while len(blob)%4:blob.append(0)
    views.append({'buffer':0,'byteOffset':offset,'byteLength':len(raw)})
    a={'bufferView':len(views)-1,'componentType':5126 if fmt=='f' else 5125,'type':kind,'count':count}
    if bounds:a.update(min=bounds[0],max=bounds[1])
    accessors.append(a);return len(accessors)-1
p=add([t for v in P for t in v],'f','VEC3',len(P),([min(v[i] for v in P) for i in range(3)],[max(v[i] for v in P) for i in range(3)]))
n=add([t for v in N for t in v],'f','VEC3',len(N));idx=add(I,'I','SCALAR',len(I))
extensions={'KHR_materials_transmission':{'transmissionFactor':1},'KHR_materials_ior':{'ior':1.45},'KHR_materials_specular':{'specularFactor':.2},'KHR_materials_volume':{'thicknessFactor':.0072,'attenuationColor':[1,.45,.65],'attenuationDistance':.015}}
material={'name':'Pink transparent glass - nonmetal','pbrMetallicRoughness':{'baseColorFactor':[1,.68,.80,1],'metallicFactor':0,'roughnessFactor':.07},'extensions':extensions}
doc={'asset':{'version':'2.0'},'extensionsUsed':list(extensions),'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'name':'Pink bead - front bore','mesh':0}],'meshes':[{'primitives':[{'attributes':{'POSITION':p,'NORMAL':n},'indices':idx,'material':0}]}],'materials':[material],'buffers':[{'byteLength':len(blob)}],'bufferViews':views,'accessors':accessors}
j=json.dumps(doc).encode();j+=b' '*(-len(j)%4)
out=Path(__file__).with_name('pha_le_hong_mat_cat_v3.glb');out.write_bytes(struct.pack('<4sII',b'glTF',2,28+len(j)+len(blob))+struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(blob),b'BIN\0')+blob)
assert len(out.read_bytes())==struct.unpack_from('<I',out.read_bytes(),8)[0]
edges={}
for t in range(0,len(I),3):
    tri=[tuple(round(c,9) for c in P[i]) for i in I[t:t+3]]
    for a,b in zip(tri,tri[1:]+tri[:1]):
        key=tuple(sorted((a,b)));edges[key]=edges.get(key,0)+1
assert all(v==2 for v in edges.values())
print(out.resolve(),'closed mesh checked;',len(I)//3,'triangles')
