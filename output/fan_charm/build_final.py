import math,struct,json
from pathlib import Path
V=[];N=[];F=[]
UNIT=.00011
def vertex(x,y,z,n):
    V.append(((x-287)*UNIT,(218-y)*UNIT,z*UNIT));N.append(n)
def tube(points,r=5,z=0):
    # Thick stock with flat faces, crisp sides and a small bevel.
    profile=[(-.78,.9),(.78,.9),(1,.68),(1,-.68),(.78,-.9),(-.78,-.9),(-1,-.68),(-1,.68)]
    for edge in range(8):
        u0,w0=profile[edge];u1,w1=profile[(edge+1)%8]
        du=u1-u0;dw=w1-w0;l=math.hypot(du,dw);nu=-dw/l;nz=du/l;base=len(V)
        for i,(x,y) in enumerate(points):
            a=points[max(i-1,0)];b=points[min(i+1,len(points)-1)]
            dx=b[0]-a[0];dy=b[1]-a[1];l=math.hypot(dx,dy) or 1;px=-dy/l;py=dx/l
            for u,w in [(u0,w0),(u1,w1)]:vertex(x+r*u*px,y+r*u*py,z+r*w,(nu*px,-nu*py,nz))
        for i in range(len(points)-1):
            a=base+2*i;F.extend((a,a+1,a+3,a,a+3,a+2))
def curve(p,r=5,z=0,closed=False):
    q=[]
    for i in range(len(p) if closed else len(p)-1):
        a=p[(i-1)%len(p)] if closed or i>0 else p[0];b=p[i];c=p[(i+1)%len(p)];d=p[(i+2)%len(p)] if closed or i+2<len(p) else p[-1]
        for j in range(16):
            t=j/16;q.append(tuple(.5*(2*b[k]+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t*t+(-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t) for k in (0,1)))
    q.append(q[0] if closed else p[-1]);tube(q,r,z)
def ring(x,y,rx,ry,r=5,z=0):tube([(x+rx*math.cos(i*math.tau/128),y+ry*math.sin(i*math.tau/128)) for i in range(129)],r,z)
def plate(x,y,r,sy=1,lobes=0,z=0,thickness=9):
    # A continuous extruded flower, not intersecting spheres.
    count=120;base=len(V)
    for scale,zz in [(0,thickness/2),(.92,thickness/2),(1,thickness/2-1.3),(1,-thickness/2+1.3),(.92,-thickness/2),(0,-thickness/2)]:
        for j in range(count):
            t=math.tau*j/count;rr=r*(.84+.16*math.cos(lobes*(t+math.pi/2))) if lobes else r
            n=(0,0,1 if zz>0 else -1) if scale<1 else (math.cos(t),-math.sin(t),0)
            vertex(x+scale*rr*math.cos(t),y+scale*rr*math.sin(t)*sy,z+zz,n)
    for layer in range(5):
        for j in range(count):
            a=base+layer*count+j;b=base+layer*count+(j+1)%count;F.extend((a,b,b+count,a,b+count,a+count))
def flower(x,y,r):
    plate(x,y,r,lobes=5,z=2,thickness=10)
    plate(x,y,r*.23,z=8,thickness=3)

curve([(17,243),(20,220),(40,189),(50,163),(77,141),(120,128),(150,102),(185,90),(223,88),(254,76),(284,70),(316,78),(341,88),(391,91),(424,106),(451,131),(482,139),(510,155),(525,180),(545,208),(556,232),(550,252),(531,270),(475,283),(406,297),(346,308),(285,319),(223,309),(166,298),(104,284),(47,272),(26,261)],5.3,closed=True)
ring(287,42,31,28,6);ring(285,379,28,25,5.5)
curve([(18,243),(41,244),(69,229),(98,204),(115,164),(128,141),(160,137),(193,143),(218,144),(256,129),(294,111),(335,97),(341,88),(326,82)],5)
curve([(105,202),(141,188),(179,178),(212,173)],4.5)
curve([(151,189),(170,205),(192,217),(214,231)],4.6)
curve([(237,177),(261,174),(296,158),(273,176),(297,195),(313,200),(338,192)],4.5)
curve([(388,191),(420,203),(459,202),(497,195),(523,180)],5)
curve([(419,201),(437,181),(452,162),(455,148)],5)
curve([(166,297),(179,270),(201,246),(229,229),(258,218),(287,215),(322,222),(354,238),(383,263),(403,296)],5.4)
for x,y in [(198,260),(220,244),(248,232),(283,228),(312,232),(337,246),(368,262)]:
    x=285+(x-285)*1.12;y=315+(y-315)*1.12
    curve([(285,315),((285+x)/2,(315+y)/2),(x,y)],5.2)
curve([(88,216),(93,228),(95,239)],3.4)
curve([(202,89),(204,107)],3.4)
flower(218,171,23);flower(365,181,32);flower(285,337,28)
plate(285,317,8,z=9,thickness=4)
plate(204,107,13,.88,z=1);plate(455,148,12,.88,z=1);plate(95,239,13,.7,z=1)
for k in range(0,len(F),3):
    a,b,c=[V[F[k+j]] for j in range(3)];u=[b[j]-a[j] for j in range(3)];v=[c[j]-a[j] for j in range(3)]
    cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
    normal=[sum(N[F[k+l]][j] for l in range(3)) for j in range(3)]
    if sum(cross[j]*normal[j] for j in range(3))<0:F[k+1],F[k+2]=F[k+2],F[k+1]
blob=b'';views=[];acc=[]
def add(data,fmt,typ,component,count,mins=None,maxs=None):
    global blob
    raw=struct.pack('<'+fmt*len(data),*data);off=len(blob);blob+=raw;blob+=b'\0'*((-len(blob))%4)
    views.append({'buffer':0,'byteOffset':off,'byteLength':len(raw)})
    a={'bufferView':len(views)-1,'componentType':component,'count':count,'type':typ}
    if mins is not None:a.update(min=mins,max=maxs)
    acc.append(a);return len(acc)-1
p=add([c for v in V for c in v],'f','VEC3',5126,len(V),[min(v[i] for v in V) for i in range(3)],[max(v[i] for v in V) for i in range(3)])
n=add([c for v in N for c in v],'f','VEC3',5126,len(N));idx=add(F,'I','SCALAR',5125,len(F))
g={'asset':{'version':'2.0','generator':'Floral fan reconstruction'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'mesh':0,'name':'Thick floral fan charm'}],'meshes':[{'primitives':[{'attributes':{'POSITION':p,'NORMAL':n},'indices':idx,'material':0}]}],'materials':[{'name':'Warm silver pale champagne','pbrMetallicRoughness':{'baseColorFactor':[.76,.73,.64,1],'metallicFactor':.92,'roughnessFactor':.2},'doubleSided':True}],'buffers':[{'byteLength':len(blob)}],'bufferViews':views,'accessors':acc}
j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4)
out=Path(__file__).with_name('quat_hoa_day_v5.glb');out.write_bytes(struct.pack('<4sII',b'glTF',2,28+len(j)+len(blob))+struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(blob),b'BIN\0')+blob)
assert len(out.read_bytes())==struct.unpack_from('<I',out.read_bytes(),8)[0]
assert max(F)<len(V) and len(N)==len(V)
print(out.resolve(),len(V),'vertices',out.stat().st_size,'bytes')
preview=Path(__file__).with_name('build_v5.py').read_text(encoding='utf-8')
exec(preview[preview.index('# A standalone orthographic'):])
