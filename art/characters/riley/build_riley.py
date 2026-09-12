"""Reproducible Blender 4.5 Riley source. Units: metres; front: -Y; up: Z."""
import bpy, math, json, os
from mathutils import Vector, Euler
from pathlib import Path
ROOT = Path(__file__).resolve().parent
OUT = ROOT.parents[2] / 'public' / 'models' / 'riley'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for d in list(bpy.data.materials): bpy.data.materials.remove(d)
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
modules=bpy.data.collections.new('RILEY • active modules'); scene.collection.children.link(modules)
optional=bpy.data.collections.new('OPTIONS • glasses and visor'); scene.collection.children.link(optional)
studio=bpy.data.collections.new('STUDIO • not exported'); scene.collection.children.link(studio)
def move(o,col=modules):
    for c in list(o.users_collection): c.objects.unlink(o)
    col.objects.link(o)
def mat(name,h):
    m=bpy.data.materials.new(name); m.diffuse_color=(*[int(h[i:i+2],16)/255 for i in (0,2,4)],1)
    m.use_nodes=True; p=m.node_tree.nodes.get('Principled BSDF')
    # Convert authored sRGB palette to scene-linear for faithful glTF colors.
    rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in m.diffuse_color[:3]]
    p.inputs['Base Color'].default_value=(*rgb,1); p.inputs['Roughness'].default_value=.83
    m['customization_channel']=name.removeprefix('MAT_'); return m
skin=mat('MAT_skin','EBA477'); hair=mat('MAT_hair','493026'); rose=mat('MAT_top','B95F71')
bottom=mat('MAT_bottom','B95F71'); shoe=mat('MAT_shoe_accent','CF8091'); acc=mat('MAT_accessory','CC7687')
white=mat('MAT_ivory','F4EEE5'); rubber=mat('MAT_sole','DED8D0'); dark=mat('MAT_paddle_face','303234')
edge=mat('MAT_paddle_color','CB7487'); black=mat('MAT_grip','232727'); iris=mat('MAT_eyes_brows','39241D')
lip=mat('MAT_mouth','9C4E3F'); earinner=mat('MAT_inner_ear','D58464')
meshes=[]; bindings={}
def mesh(name,verts,faces,material,bone=None):
    me=bpy.data.meshes.new(name+'_mesh'); me.from_pydata(verts,[],faces); me.update()
    o=bpy.data.objects.new(name,me); modules.objects.link(o); o.data.materials.append(material)
    meshes.append(o)
    if bone: bindings[o.name]=bone
    return o
def ell(name,loc,scale,material,bone=None,segments=16,rings=8,smooth=False):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); move(o)
    o.data.materials.append(material)
    for p in o.data.polygons:p.use_smooth=smooth
    meshes.append(o)
    if bone:bindings[o.name]=bone
    return o
def loft(name,rings,material,bone=None,n=16,caps=True):
    # ring = (x,y,z,width,depth); ordered bottom to top, outward normals.
    vs=[(x+rx*math.cos(2*math.pi*j/n),y+ry*math.sin(2*math.pi*j/n),z) for x,y,z,rx,ry in rings for j in range(n)]
    fs=[]
    for k in range(len(rings)-1):
        for j in range(n):
            a=k*n+j;b=k*n+(j+1)%n;c=(k+1)*n+(j+1)%n;d=(k+1)*n+j
            fs.extend([(a,b,c),(a,c,d)])
    if caps:fs.extend([tuple(reversed(range(n))),tuple((len(rings)-1)*n+j for j in range(n))])
    return mesh(name,vs,fs,material,bone)
def tube(name,points,radii,material,bone=None,n=10):
    vs=[]
    for i,p in enumerate(points):
        t=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(i-1,0)])
        q=t.normalized().to_track_quat('Z','Y')
        for j in range(n):vs.append(Vector(p)+q@Vector((radii[i]*math.cos(j*math.tau/n),radii[i]*math.sin(j*math.tau/n),0)))
    fs=[]
    for i in range(len(points)-1):
        for j in range(n):fs.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
    fs.extend([tuple(reversed(range(n))),tuple((len(points)-1)*n+j for j in range(n))])
    return mesh(name,vs,fs,material,bone)
def box(name,loc,scale,material,bone=None,bevel=.01):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object;o.name=name;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);move(o);o.data.materials.append(material)
    if bevel:
        mod=o.modifiers.new('Authored chamfer','BEVEL');mod.width=bevel;mod.segments=1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    meshes.append(o)
    if bone:bindings[o.name]=bone
    return o
def ribbon(name,points,width,material,bone):
    return tube(name,points,[width]*len(points),material,bone,n=6)

# Shared deform rig. A-pose arms point down 55 degrees from horizontal.
bpy.ops.object.armature_add(); rig=bpy.context.object;rig.name='rig_player_v1';move(rig)
bpy.ops.object.mode_set(mode='EDIT');rig.data.edit_bones.remove(rig.data.edit_bones[0])
bones={}
def bone(name,head,tail,parent=None):
    b=rig.data.edit_bones.new(name);b.head=head;b.tail=tail
    if parent:b.parent=rig.data.edit_bones[parent]
    bones[name]=(Vector(head),Vector(tail));return b
bone('root',(0,0,0),(0,0,.15));bone('pelvis',(0,0,.82),(0,0,.99),'root')
bone('spine',(0,0,.99),(0,0,1.16),'pelvis');bone('chest',(0,0,1.16),(0,0,1.31),'spine')
bone('neck',(0,0,1.31),(0,0,1.43),'chest');bone('head',(0,0,1.43),(0,0,1.79),'neck')
bone('ponytail',(0,.12,1.88),(0,.22,1.48),'head')
for s,side in [(1,'L'),(-1,'R')]:
    bone('clavicle.'+side,(0,0,1.28),(s*.18,0,1.29),'chest')
    bone('upper_arm.'+side,(s*.18,0,1.29),(s*.32,0,1.06),'clavicle.'+side)
    bone('forearm.'+side,(s*.32,0,1.06),(s*.43,-.012,.84),'upper_arm.'+side)
    bone('hand.'+side,(s*.43,-.012,.84),(s*.475,-.026,.745),'forearm.'+side)
    bone('thigh.'+side,(s*.095,0,.86),(s*.126,-.024,.52),'pelvis')
    bone('shin.'+side,(s*.126,-.024,.52),(s*.15,0,.17),'thigh.'+side)
    bone('foot.'+side,(s*.15,0,.17),(s*.15,-.12,.07),'shin.'+side)
    bone('toe.'+side,(s*.15,-.12,.07),(s*.15,-.2,.07),'foot.'+side)
bone('paddle_socket',( -.475,-.026,.755),(-.48,-.026,.61),'hand.R')
bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True;rig.data.display_type='OCTAHEDRAL'
rig['schema']='pickle-rpg.modular-player.v1';rig['forward']='-Y in Blender; +Z in glTF';rig['height_m']=1.907

# Athletic base: closely spaced rings around knees/elbows support deformation.
loft('body_base',[(0,0,z,w,d) for z,w,d in [(.82,.14,.085),(.87,.151,.091),(.93,.122,.077),(.99,.099,.065),(1.05,.103,.068),(1.12,.126,.077),(1.20,.141,.082),(1.26,.155,.072),(1.30,.133,.06),(1.32,.092,.052),(1.34,.048,.043)]],skin,n=32)
loft('body_neck',[(0,.003,1.29,.052,.047),(0,.003,1.34,.05,.043),(0,0,1.39,.048,.043),(0,0,1.45,.055,.05)],skin,'neck',n=20)
for s,side in [(1,'L'),(-1,'R')]:
    arm=[]
    for t,r in [(0,.068),(.13,.064),(.34,.054),(.46,.047),(.5,.046),(.54,.047),(.68,.045),(.85,.035),(1,.028)]:
        arm.append((s*(.18+.25*t),-.012*t,1.29-.45*t,r,r*.88))
    loft('body_arm.'+side,list(reversed(arm)),skin,n=20)
    ell('body_deltoid.'+side,(s*.18,0,1.274),(.067,.06,.056),skin,'upper_arm.'+side,16,8)
    loft('body_leg.'+side,[(s*x,y,z,w,d) for x,y,z,w,d in [(.15,0,.16,.035,.038),(.15,0,.23,.040,.043),(.143,0,.34,.050,.053),(.135,-.012,.45,.046,.048),(.128,-.022,.50,.048,.05),(.126,-.024,.52,.051,.052),(.124,-.02,.55,.054,.056),(.116,-.01,.63,.061,.065),(.103,0,.75,.071,.075),(.095,0,.85,.076,.079)]],skin,n=24)
    ell('hand_palm.'+side,(s*.455,-.016,.796),(.041,.028,.062),skin,'hand.'+side,16,10)
    for j in range(4):
        x=s*(.434+j*.016)
        tube('hand_finger_%d.%s'%(j,side),[(x,-.019,.783),(x+s*.012,-.028,.744),(x+s*.007,-.043,.735)],[.010,.009,.007],skin,'hand.'+side,n=8)
    tube('hand_thumb.'+side,[(s*.431,-.026,.81),(s*.413,-.048,.78),(s*.421,-.056,.766)],[.014,.012,.01],skin,'hand.'+side,n=8)

# Tapered chin / cheek / temple rings, fuller cranium, flattened face plane.
headrings=[(1.405,.054,.070),(1.423,.090,.105),(1.447,.126,.124),(1.477,.157,.145),(1.516,.179,.158),(1.56,.192,.169),(1.61,.198,.175),(1.66,.196,.177),(1.71,.190,.177),(1.76,.170,.163),(1.805,.129,.127),(1.83,.07,.078),(1.84,.015,.022)]
head=loft('head_base',[(0,.003,z,w,d) for z,w,d in headrings],skin,'head',n=32)
# Small ears and inset inner planes.
for s in [-1,1]:
    ell('face_ear_'+str(s),(s*.196,.005,1.566),(.034,.026,.049),skin,'head',12,8)
    ell('face_ear_inner_'+str(s),(s*.213,-.018,1.566),(.014,.009,.029),earinner,'head',10,6)
    # Broad white eyes, dark upper lashes, oversized iris and tiny highlights.
    outline=[(-1,0),(-.76,.65),(-.28,1),(.27,.97),(.73,.55),(1,.05),(.72,-.64),(.2,-.9),(-.35,-.81),(-.81,-.4)]
    vs=[(s*.087,-.176,1.61)]
    for x,z in outline:vs.append((s*.087+x*.059,-.154+abs(x)*.009,1.61+z*.041))
    eye=mesh('face_eye_white_'+str(s),vs,[(0,j+1,(j+1)%len(outline)+1) for j in range(len(outline))],white,'head')
    ell('face_iris_'+str(s),(s*.081,-.177,1.608),(.029,.009,.035),iris,'head',20,12,True)
    ell('face_pupil_'+str(s),(s*.078,-.184,1.609),(.018,.004,.027),black,'head',16,10,True)
    ell('face_eye_glint_'+str(s),(s*.073-.008,-.189,1.627),(.010,.003,.012),white,'head',12,8,True)
    ribbon('face_upper_lid_'+str(s),[(s*.027,-.174,1.627),(s*.052,-.174,1.645),(s*.094,-.172,1.652),(s*.137,-.160,1.634),(s*.153,-.146,1.649)],.006,iris,'head')
    # Separate chunky brows have an intentional friendly arch.
    tube('eyebrow_'+('L' if s==1 else 'R'),[(s*.038,-.167,1.699),(s*.091,-.17,1.713),(s*.139,-.151,1.70)],[.012,.014,.010],hair,'head',n=4)
mesh('face_nose',[(-.022,-.159,1.575),(.022,-.159,1.575),(0,-.202,1.549),(-.018,-.176,1.54),(.018,-.176,1.54),(0,-.168,1.597)],[(0,5,2),(5,1,2),(0,2,3),(2,1,4),(3,2,4)],skin,'head')
ribbon('face_smile',[(-.045,-.139,1.495),(-.022,-.151,1.489),(0,-.156,1.487),(.023,-.15,1.491),(.045,-.138,1.499)],.0027,lip,'head')

# Hair shell follows the cranium but opens above the eyes.
vs=[];n=24
levels=[1.47,1.52,1.58,1.64,1.70,1.75,1.80,1.83,1.85,1.865]
for z in levels:
    pair=next(((a,b) for a,b in zip(headrings,headrings[1:]) if a[0]<=z<=b[0]),(headrings[-2],headrings[-1]))
    a0,b0=pair;f=max(0,min(1,(z-a0[0])/(b0[0]-a0[0])))
    rx=a0[1]+f*(b0[1]-a0[1])+.024;ry=a0[2]+f*(b0[2]-a0[2])+.024
    if z==levels[-1]:rx=ry=.004
    for j in range(n):
        angle=j*math.tau/n;vs.append((rx*math.cos(angle),.005+ry*math.sin(angle),z))
fs=[]
for k in range(len(levels)-1):
    for j in range(n):
        angle=(j+.5)*math.tau/n;line=1.465+.265*max(0,-math.sin(angle))
        if (levels[k]+levels[k+1])*.5<line:continue
        a=k*n+j;b=k*n+(j+1)%n;c=(k+1)*n+(j+1)%n;d=(k+1)*n+j
        fs.extend([(a,b,c),(a,c,d)])
fs.append(tuple((len(levels)-1)*n+j for j in range(n)))
mesh('hair_cap_01',vs,fs,hair,'head')
# Faceted broad forelocks sweep from crown to temples, with pointed side locks.
loft('hair_front_sweep_01',[(-.171,-.076,1.445,.002,.003),(-.184,-.113,1.58,.026,.037),(-.171,-.131,1.704,.045,.043),(-.111,-.12,1.786,.074,.05),(-.017,-.066,1.829,.053,.057)],hair,'head',n=7)
loft('hair_front_sweep_02',[(.176,-.067,1.463,.008,.012),(.183,-.111,1.597,.023,.025),(.173,-.139,1.72,.029,.037),(.092,-.12,1.789,.064,.042),(.025,-.08,1.818,.05,.049)],hair,'head',n=7)
loft('hair_ponytail_01',[(-.21,.24,1.30,.005,.012),(-.19,.278,1.4,.086,.067),(-.18,.285,1.51,.092,.070),(-.11,.243,1.60,.068,.073),(-.075,.242,1.72,.10,.090),(0,.222,1.86,.105,.089),(-.013,.165,1.96,.074,.061),(-.017,.119,1.94,.04,.043)],hair,'ponytail',n=9)
ell('hair_root_01',(0,.128,1.828),(.071,.087,.079),hair,'head',12,8)
loft('hair_tie_01',[(0,.125,1.857,.079,.073),(0,.125,1.887,.074,.069)],acc,'head',n=12,caps=False)

# Tank has an open curved neckline, shoulder straps and open armholes.
tankrings=[(1.025,.108,.074),(1.052,.111,.077),(1.10,.121,.083),(1.17,.145,.092),(1.23,.158,.094)]
vs=[];n=32
for k,(z,rx,ry) in enumerate(tankrings):
    for j in range(n):
        angle=j*math.tau/n;x=rx*math.cos(angle);y=ry*math.sin(angle)
        if k==len(tankrings)-1:
            base=1.235 if y<0 else 1.26
            ztop=base+(.078 if y<0 else .053)*max(0,1-((abs(x)-.102)/.052)**2)
        else:ztop=z
        vs.append((x,y,ztop))
fs=[]
for k in range(len(tankrings)-1):
    for j in range(n):fs.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
# Bridge front and back over each shoulder, preserving real neck and arm openings.
last=(len(tankrings)-1)*n
for frontids,backids in [([27,28,29],[5,4,3]),([19,20,21],[13,12,11])]:
    mids=[]
    for j in frontids:
        mids.append(len(vs));vs.append((vs[last+j][0],0,1.33))
    for i in range(2):
        fs.extend([(last+frontids[i],last+frontids[i+1],mids[i+1],mids[i]),(mids[i],mids[i+1],last+backids[i+1],last+backids[i])])
mesh('top_tank_01',vs,fs,rose)
mesh('top_mark_01',[(.062,-.091,1.17),(.077,-.091,1.20),(.092,-.091,1.17)],[(0,1,2)],white,'chest')
loft('bottom_skort_01',[(0,0,.755,.222,.132),(0,0,.776,.218,.132),(0,0,.82,.205,.126),(0,0,.89,.175,.109),(0,0,.939,.125,.081),(0,0,.967,.122,.08)],bottom,n=32,caps=False)
loft('bottom_waistband_01',[(0,0,.933,.13,.084),(0,0,.968,.123,.082)],bottom,'pelvis',n=32,caps=False)
for s,side in [(1,'L'),(-1,'R')]:
    loft('bottom_liner.'+side,[(s*.085,0,.758,.063,.071),(s*.076,0,.88,.062,.073)],bottom,'thigh.'+side,n=16)
    stripe=[]
    for z,rx,ry in [(.757,.225,.135),(.776,.221,.135),(.82,.208,.129),(.89,.178,.112),(.938,.128,.084)]:
        for angle in [-.48,-.34]:stripe.append((s*rx*math.cos(angle),ry*math.sin(angle),z))
    mesh('bottom_side_stripe.'+side,stripe,[(j,j+1,j+3,j+2) for j in range(0,8,2)],white,'pelvis')
    loft('socks_01.'+side,[(s*.15,0,.147,.038,.044),(s*.15,0,.22,.042,.046),(s*.144,0,.30,.049,.053),(s*.141,0,.365,.052,.055)],white,'shin.'+side,n=20)
    for j in range(2):
        z=.322+j*.029
        loft('sock_stripe_%d.%s'%(j,side),[(s*(.144-(z-.30)/.065*.003),0,z,.049+(z-.30)/.065*.003+.001,.053+(z-.30)/.065*.002+.001),(s*(.144-(z+.013-.30)/.065*.003),0,z+.013,.049+(z+.013-.30)/.065*.003+.001,.053+(z+.013-.30)/.065*.002+.001)],acc,'shin.'+side,n=20,caps=False)
    # Sculpted chamfered sneaker layers; long toe, broad sole, raised heel.
    loft('shoes_01.'+side,[(s*.15,-.063,.035,.086,.151),(s*.15,-.063,.064,.09,.153),(s*.15,-.054,.085,.084,.147),(s*.15,-.033,.117,.072,.117),(s*.15,-.005,.171,.057,.065)],white,'foot.'+side,n=16)
    loft('shoe_sole.'+side,[(s*.15,-.063,.018,.084,.149),(s*.15,-.063,.037,.09,.156),(s*.15,-.063,.058,.092,.157)],rubber,'foot.'+side,n=16)
    ell('shoe_toe_accent.'+side,(s*.15,-.182,.067),(.073,.034,.025),shoe,'foot.'+side,12,6)
    ell('shoe_heel_accent.'+side,(s*.15,.055,.108),(.062,.032,.044),shoe,'foot.'+side,12,6)
    box('shoe_tongue.'+side,(s*.15,-.061,.155),(.068,.04,.075),shoe,'foot.'+side,.012)
    mesh('shoe_lace_panel.'+side,[(s*.15-.037,-.15,.136),(s*.15+.037,-.15,.136),(s*.15+.033,-.055,.184),(s*.15-.033,-.055,.184)],[(0,1,2,3)],shoe,'foot.'+side)
    for j in range(3):
        y=-.137+j*.027;z=.147+j*.0137
        ribbon('shoe_lace_%d.%s'%(j,side),[(s*.15-.031,y,z),(s*.15+.031,y+.004,z+.002)],.005,white,'foot.'+side)
    # Recolorable side panels sit just outside the white upper.
    for outer in [-1,1]:
        mesh('shoe_side_panel_%s.%s'%(outer,side),[(s*.15+outer*.075,.043,.071),(s*.15+outer*.061,.025,.148),(s*.15+outer*.064,-.043,.121),(s*.15+outer*.082,-.080,.073)],[(0,1,2,3)],shoe,'foot.'+side)
    # Wristband axis follows the forearm.
    tube('wristband_01.'+side,[(s*.407,-.01,.887),(s*.427,-.011,.849)],[.039,.036],acc,'forearm.'+side,n=12)

# Octagonal paddle face and separate edge/grip: socket follows right hand.
cx=-.465;cy=-.018;cz=.57
outline=[(-.06,.125),(.06,.125),(.095,.089),(.095,-.063),(.044,-.13),(-.044,-.13),(-.095,-.063),(-.095,.089)]
def paddle_plate(name,outline,thickness,material):
    v=[(cx+x,cy+y,cz+z) for y in [-thickness/2,thickness/2] for x,z in outline]; n=len(outline)
    return mesh(name,v,[tuple(range(n)),tuple(reversed(range(n,n*2)))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)],material,'paddle_socket')
paddle_plate('paddle_01',outline,.016,edge)
paddle_plate('paddle_face_01',[(x*.89,z*.91) for x,z in outline],.018,dark)
tube('paddle_handle_01',[(cx,cy,.688),(cx,cy,.771)],[.016,.014],black,'paddle_socket',n=8)
for j in range(5):tube('paddle_grip_%02d'%j,[(cx,cy,.699+j*.014),(cx,cy,.703+j*.014)],[.017,.017],black,'paddle_socket',n=8)

# Optional real geometry modules live in their own disabled collection.
before=set(o.name for o in meshes)
for s in [-1,1]:
    pts=[(s*.085+.066*math.cos(j*math.tau/16),-.199,1.612+.054*math.sin(j*math.tau/16)) for j in range(17)]
    ribbon('glasses_01_frame_'+str(s),pts,.006,black,'head')
    ribbon('glasses_01_arm_'+str(s),[(s*.15,-.195,1.62),(s*.2,-.07,1.62),(s*.2,.01,1.59)],.005,black,'head')
ribbon('glasses_01_bridge',[(-.019,-.2,1.619),(0,-.207,1.63),(.019,-.2,1.619)],.005,black,'head')
loft('visor_01_band',[(0,.007,1.748,.206,.191),(0,.007,1.783,.203,.19)],white,'head',n=24,caps=False)
mesh('visor_01_brim',[(-.19,-.09,1.752),(-.15,-.28,1.738),(0,-.32,1.731),(.15,-.28,1.738),(.19,-.09,1.752),(0,-.19,1.757)],[(0,1,5),(1,2,5),(2,3,5),(3,4,5)],rose,'head')
for o in meshes:
    if o.name not in before:move(o,optional)

# Lower the complete head assembly slightly to match the short athletic neck.
for o in meshes:
    if bindings.get(o.name) in ('head','ponytail'):
        for v in o.data.vertices:v.co.z-=.035

def blend(a,b,t):return [(a,1-t),(b,t)]
def weights(o,v):
    if o.name.startswith(('bottom_skort','bottom_side_stripe')):
        p=o.matrix_world@v.co;t=max(0,min(.65,(.94-p.z)*3.4))
        left=max(0,min(1,(p.x+.08)/.16))
        return [('pelvis',1-t),('thigh.L',t*left),('thigh.R',t*(1-left))]
    if o.name in bindings:return [(bindings[o.name],1)]
    p=o.matrix_world@v.co;z=p.z
    if o.name.startswith('body_arm'):
        side=o.name[-1]
        return blend('forearm.'+side,'upper_arm.'+side,max(0,min(1,(z-1.035)/.05)))
    if o.name.startswith('body_leg'):
        side=o.name[-1]
        return blend('shin.'+side,'thigh.'+side,max(0,min(1,(z-.49)/.065)))
    if o.name.startswith('bottom'):return [('pelvis',1)]
    if z<.98:return [('pelvis',1)]
    if z<1.10:return blend('pelvis','spine',min(1,(z-.98)/.09))
    return blend('spine','chest',max(0,min(1,(z-1.1)/.10)))
for o in meshes:
    o['module_slot']=('hair' if o.name.startswith('hair') else 'head_face' if o.name.startswith(('face','head')) else 'eyebrows' if o.name.startswith('eyebrow') else 'glasses' if o.name.startswith('glasses') else 'hat_visor' if o.name.startswith('visor') else 'top' if o.name.startswith('top') else 'bottom' if o.name.startswith('bottom') else 'socks' if o.name.startswith(('socks','sock_')) else 'shoes' if o.name.startswith(('shoe','shoes')) else 'wrist_accessory' if o.name.startswith('wrist') else 'paddle' if o.name.startswith('paddle') else 'body')
    o['rig_schema']='pickle-rpg.modular-player.v1'
    for v in o.data.vertices:
        for b,w in weights(o,v):
            if w>0:
                vg=o.vertex_groups.get(b) or o.vertex_groups.new(name=b);vg.add([v.index],w,'REPLACE')
    mod=o.modifiers.new('Shared player skeleton','ARMATURE');mod.object=rig
    o.parent=rig
    # All meshes remain flat except the eye optics; no texture dependency.
    o.data.update()
    import bmesh
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free()
optional.hide_render=True;optional.hide_viewport=True

# Slot-level objects keep asset swaps and draw calls manageable.
slot_names={'body':'body_base','head_face':'head_base','hair':'hair_ponytail_01','eyebrows':'eyebrows_01','top':'top_tank_01','bottom':'bottom_skort_01','socks':'socks_01','shoes':'shoes_01','wrist_accessory':'wristbands_01','paddle':'paddle_01','glasses':'glasses_01','hat_visor':'visor_01'}
optional.hide_viewport=False
for slot,name in slot_names.items():
    parts=[o for o in list(modules.objects)+list(optional.objects) if o.type=='MESH' and o['module_slot']==slot]
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    bpy.ops.object.join();parts[0].name=name
meshes=[o for o in list(modules.objects)+list(optional.objects) if o.type=='MESH']
optional.hide_viewport=True

# Non-exported inspection poses are stored in a separate action, neutral at frame 1.
scene.frame_start=1;scene.frame_end=80
for b in rig.pose.bones:b.rotation_mode='XYZ';b.rotation_euler=(0,0,0);b.keyframe_insert('rotation_euler',frame=1)
for frame,rotations in [(20,{'upper_arm.L':(0,-.20,0),'upper_arm.R':(0,.20,0),'forearm.L':(-.7,0,0),'forearm.R':(-.7,0,0),'thigh.L':(-.18,0,0),'thigh.R':(-.18,0,0),'shin.L':(.3,0,0),'shin.R':(.3,0,0)}),(40,{'chest':(0,0,-.3),'upper_arm.R':(-.3,1.0,.3),'forearm.R':(-.4,0,0)}),(60,{'upper_arm.R':(0,2.1,0),'forearm.R':(-.2,0,0)}),(80,{'thigh.L':(-.65,0,0),'shin.L':(.9,0,0),'thigh.R':(.5,0,0),'shin.R':(.1,0,0)})]:
    for b in rig.pose.bones:
        q=b.bone.matrix_local.to_quaternion()
        b.rotation_euler=(q.inverted() @ Euler(rotations.get(b.name,(0,0,0))).to_quaternion() @ q).to_euler()
        b.keyframe_insert('rotation_euler',frame=frame)
if rig.animation_data and rig.animation_data.action:rig.animation_data.action.name='QA_poses_NOT_game_animation'
scene.frame_set(1)

# Export only active meshes and rig. Alternative accessories export independently.
def select(objects):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=rig
active=[o for o in meshes if modules in o.users_collection]
select([rig]+active)
bpy.ops.export_scene.gltf(filepath=str(OUT/'riley.glb'),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_yup=True)
optional.hide_viewport=False
for slot in ['glasses','hat_visor']:
    select([rig]+[o for o in meshes if o['module_slot']==slot])
    bpy.ops.export_scene.gltf(filepath=str(OUT/(slot+'.glb')),export_format='GLB',use_selection=True,export_animations=False,export_extras=True)
optional.hide_viewport=True
tri=lambda o:sum(len(p.vertices)-2 for p in o.data.polygons)
report={'schema':'pickle-rpg.modular-player.v1','triangles':sum(tri(o) for o in active),'paddle_triangles':sum(tri(o) for o in active if o['module_slot']=='paddle'),'bones':list(bones),'modules':[{ 'name':o.name,'slot':o['module_slot'],'triangles':tri(o),'materials':[m.name for m in o.data.materials]} for o in active]}
report['unweighted_vertices']=sum(1 for o in meshes for v in o.data.vertices if not v.groups)
(ROOT/'asset-report.json').write_text(json.dumps(report,indent=2))

# Neutral studio, orthographic review cameras. Ground and lights never enter GLB.
ground=mat('STUDIO_ground','E8E4DC')
bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.name='studio_floor';move(floor,studio);floor.data.materials.append(ground)
def point(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for name,loc,power,size in [('Key',(-3,-4,6),450,4),('Fill',(3,-2,3),250,3),('Rim',(0,3,5),400,3)]:
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size
    o=bpy.data.objects.new(name,d);studio.objects.link(o);o.location=loc;point(o,(0,0,1))
scene.world.use_nodes=True
worldbg=scene.world.node_tree.nodes.get('Background')
worldbg.inputs['Color'].default_value=(.78,.76,.72,1);worldbg.inputs['Strength'].default_value=.35
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True
scene.render.resolution_x=800;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
cameras={}
for name,loc in [('front',(0,-5,1.35)),('side',(5,0,1.35)),('back',(0,5,1.35)),('three-quarter',(3,-5,2.0)),('tactical',(3,-5,6))]:
    d=bpy.data.cameras.new(name);d.type='ORTHO';d.ortho_scale=2.28
    o=bpy.data.objects.new('CAM_'+name,d);studio.objects.link(o);o.location=loc;point(o,(0,0,1.01));cameras[name]=o
scene.camera=cameras['three-quarter']
reference=Path(os.environ.get('RILEY_REFERENCE',str(ROOT/'reference.png')))
if reference.exists():
    img=bpy.data.images.load(str(reference));img.name='REFERENCE_Riley_orthographic';img.pack()
    ref=bpy.data.objects.new('REFERENCE • Riley sheet',None);studio.objects.link(ref);ref.empty_display_type='IMAGE';ref.data=img;ref.empty_display_size=2.5;ref.location=(2.3,.5,1.2);ref.rotation_euler=(math.pi/2,0,0);ref.hide_render=True
notes=bpy.data.texts.new('README • modular character')
if (ROOT/'README.md').exists():
    import re
    readme=(ROOT/'README.md').read_text()
    readme=re.sub(r'main export has \*\*[\d,]+ triangles',f"main export has **{report['triangles']:,} triangles",readme)
    (ROOT/'README.md').write_text(readme);notes.write(readme)
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            space=area.spaces.active;space.region_3d.view_distance=3.3;space.region_3d.view_location=(0,0,1)
            space.region_3d.view_rotation=cameras['three-quarter'].rotation_euler.to_quaternion()
            space.shading.color_type='MATERIAL'
            space.overlay.show_overlays=False
select([rig]);bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'riley.blend'))
render_only=os.environ.get('RILEY_RENDER_ONLY','')
for name,cam in cameras.items():
    if render_only and render_only!=name:continue
    scene.camera=cam;scene.render.filepath=str(ROOT/'previews'/(name+'.png'));bpy.ops.render.render(write_still=True)
for frame,name in [(20,'ready'),(40,'forehand'),(60,'overhead'),(80,'shuffle')]:
    if render_only and render_only!='rig-'+name:continue
    scene.frame_set(frame);scene.camera=cameras['three-quarter'];scene.render.filepath=str(ROOT/'previews'/('rig-'+name+'-check.png'));bpy.ops.render.render(write_still=True)
scene.frame_set(1)
print('RILEY_REPORT',json.dumps({k:v for k,v in report.items() if k!='modules'}))
