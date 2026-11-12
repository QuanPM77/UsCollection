from pathlib import Path
scope={'__file__':str(Path(__file__).with_name('build_v4.py'))}
v4=Path(__file__).with_name('build_v4.py').read_text()
exec(v4[:v4.index("exec(compile(source")],scope)
source=scope['source']
source=source.replace('if closed: points=points+[points[0]]','if closed: points=points+[points[0]]\n    r*=.72',1)
source=source.replace('(-.8,.64),(.8,.64),(1,.44),(1,-.44),(.8,-.64),(-.8,-.64),(-1,-.44),(-1,.44)','(-.78,.42),(.78,.42),(1,.22),(1,-.22),(.78,-.42),(-.78,-.42),(-1,-.22),(-1,.22)')
a=source.index('def flower(');b=source.index('flower(218',a)
source=source[:a]+'''def flower(x,y,r,petal,count=5):
    # One stamped plate per flower, with a narrow rounded bevel.
    segments=120; base=len(V)
    outer=(r+petal)*.83
    for scale,z in [(0,3.4),(.93,3.4),(1,2.3),(1,.3),(.93,-.8),(0,-.8)]:
        for j in range(segments):
            t=math.tau*j/segments
            radius=outer*(.84+.16*math.cos(count*(t+math.pi/2)))
            V.append(((x-200+scale*radius*math.cos(t))*.0002,(200-y-scale*radius*math.sin(t))*.0002,z*.0002))
            if scale==0 or scale==.93:N.append((0,0,1 if z>0 else -1))
            else:N.append((math.cos(t),-math.sin(t),.35 if z>1 else -.35))
    for layer in range(5):
        for j in range(segments):
            a=base+layer*segments+j;b=base+layer*segments+(j+1)%segments
            F.extend((a,b,b+segments,a,b+segments,a+segments))
    bead(x,y,r*.33,r*.33,2,4)
''' +source[b:]
source=source.replace('bead(285,317,11,10,4,9)','bead(285,317,7,6,2,5)')
source=source.replace('bead(204,107,17,15,4,2)','bead(204,107,11,10,2,1)').replace('bead(455,148,17,15,4,2)','bead(455,148,10,9,2,1)').replace('bead(95,239,17,13,4,2)','bead(95,239,12,8,2,1)')
source=source.replace('[.80,.72,.49,1]','[.76,.73,.64,1]').replace("'roughnessFactor':.22","'roughnessFactor':.20")
source=source.replace('quat_hoa_canh_sac_v4.glb','quat_hoa_mong_v5.glb')
exec(compile(source,__file__,'exec'))

# A standalone orthographic preview of the exported geometry.
import zlib
width=800;height=620
pixels=bytearray([35,39,43]*(width*height));depth=[-1e9]*(width*height)
minx,maxx=min(v[0] for v in V),max(v[0] for v in V)
miny,maxy=min(v[1] for v in V),max(v[1] for v in V)
scale=min(700/(maxx-minx),520/(maxy-miny))
projected=[((v[0]-(minx+maxx)/2)*scale+width/2,height/2-(v[1]-(miny+maxy)/2)*scale,v[2]*scale) for v in V]
for k in range(0,len(F),3):
    ids=F[k:k+3];a,b,c=[projected[i] for i in ids]
    den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
    if abs(den)<1e-8:continue
    for yy in range(max(0,int(min(a[1],b[1],c[1]))),min(height,int(max(a[1],b[1],c[1]))+1)):
        for xx in range(max(0,int(min(a[0],b[0],c[0]))),min(width,int(max(a[0],b[0],c[0]))+1)):
            u=((b[1]-c[1])*(xx+.5-c[0])+(c[0]-b[0])*(yy+.5-c[1]))/den
            v=((c[1]-a[1])*(xx+.5-c[0])+(a[0]-c[0])*(yy+.5-c[1]))/den
            w=1-u-v
            if min(u,v,w)<0:continue
            z=u*a[2]+v*b[2]+w*c[2];pos=yy*width+xx
            if z<depth[pos]:continue
            depth[pos]=z
            normal=[sum(t*N[i][j] for t,i in zip((u,v,w),ids)) for j in range(3)]
            length=math.sqrt(sum(t*t for t in normal)) or 1
            nx,ny,nz=[t/length for t in normal]
            light=.35+.55*max(0,nx*-.3+ny*.4+nz*.86)+.22*max(0,nx*.4+ny*.7+nz*.6)**24
            pixels[pos*3:pos*3+3]=bytes(min(255,int(col*light)) for col in (235,231,215))
def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
raw=b''.join(b'\0'+pixels[y*width*3:(y+1)*width*3] for y in range(height))
png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',width,height,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
Path(__file__).with_name('preview_v5.png').write_bytes(png)
