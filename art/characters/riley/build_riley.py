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
skin=mat('MAT_skin','FFBE91'); hair=mat('MAT_hair','754732'); rose=mat('MAT_top','FA6796')
bottom=mat('MAT_bottom','FA6796'); shoe=mat('MAT_shoe_accent','F56794'); acc=mat('MAT_accessory','F56794')
white=mat('MAT_ivory','F4EEE5'); rubber=mat('MAT_sole','DED8D0'); dark=mat('MAT_paddle_face','303234')
edge=mat('MAT_paddle_color','F56794'); black=mat('MAT_grip','232727'); iris=mat('MAT_eyes_brows','232727')
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
def box(name,loc,scale,material,bone=None,bevel=.01,bevel_segments=1):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object;o.name=name;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);move(o);o.data.materials.append(material)
    if bevel:
        mod=o.modifiers.new('Authored chamfer','BEVEL');mod.width=bevel;mod.segments=bevel_segments
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
rig['schema']='pickle-rpg.modular-player.v1';rig['forward']='-Y in Blender; +Z in glTF';rig['height_m']=2.07

# Ultra-blocky modular silhouette: chamfered solids with rigid joint segments.
def segment(name,a,b,width,depth,material,binding):
    a,b=Vector(a),Vector(b)
    soft_limb=name.startswith(('body_arm','body_leg'))
    o=box(name,(a+b)/2,(width,depth,(b-a).length),material,binding,.038 if soft_limb else .022,3 if soft_limb else 1)
    o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
    return o

def rect_loft(name,rings,material,binding):
    # Eight-sided rectangular rings keep broad flat faces and clipped corners.
    verts=[]
    for z,w,d in rings:
        c=.025
        verts.extend([(x,y,z) for x,y in [(-w+c,-d),(w-c,-d),(w,-d+c),(w,d-c),(w-c,d),(-w+c,d),(-w,d-c),(-w,-d+c)]])
    faces=[tuple(reversed(range(8))),tuple((len(rings)-1)*8+j for j in range(8))]
    for k in range(len(rings)-1):
        for j in range(8):faces.append((k*8+j,k*8+(j+1)%8,(k+1)*8+(j+1)%8,(k+1)*8+j))
    return mesh(name,verts,faces,material,binding)

def front_prism(name,outline,y,depth,material,binding):
    verts=[(x,yy,z) for yy in [y,y+depth] for x,z in outline];n=len(outline)
    return mesh(name,verts,[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)],material,binding)

# Only exposed midriff needs skin geometry beneath the closed tank.
box('body_base',(0,0,1.01),(.28,.18,.065),skin,'pelvis',.012)
box('body_neck',(0,0,1.335),(.115,.105,.12),skin,'neck',.025)
for sign,side in [(1,'L'),(-1,'R')]:
    upper,elbow=bones['upper_arm.'+side];_,wrist=bones['forearm.'+side]
    segment('body_arm_upper.'+side,upper,elbow,.135,.13,skin,'upper_arm.'+side)
    segment('body_arm_lower.'+side,elbow,wrist,.12,.12,skin,'forearm.'+side)
    ell('body_elbow.'+side,elbow,(.065,.063,.062),skin,'forearm.'+side,12,6)
    hip,knee=bones['thigh.'+side];_,ankle=bones['shin.'+side]
    segment('body_leg_upper.'+side,hip,knee,.145,.155,skin,'thigh.'+side)
    segment('body_leg_lower.'+side,knee,ankle,.123,.13,skin,'shin.'+side)
    box('hand_palm.'+side,(sign*.455,-.018,.795),(.13,.13,.145),skin,'hand.'+side,.035)
    box('hand_thumb.'+side,(sign*.409,-.075,.802),(.055,.055,.077),skin,'hand.'+side,.019)

# Oversized square face, button eyes, tiny brows and blush like the supplied sheet.
box('head_base',(0,0,1.645),(.63,.48,.565),skin,'head',.045)
blush=mat('MAT_blush','FF9789');tongue=mat('MAT_tongue','F4534C')
for sign in [-1,1]:
    box('face_ear_'+str(sign),(sign*.329,-.005,1.56),(.087,.12,.16),skin,'head',.023)
    # Flat pill face: straight sides/top/bottom with rounded corners, not an oval.
    eye=[];half_width=.0354;half_height=.06136;radius=.0236
    for cx,cz,start in [(half_width-radius,half_height-radius,0),(-half_width+radius,half_height-radius,90),(-half_width+radius,-half_height+radius,180),(half_width-radius,-half_height+radius,270)]:
        for j in range(5):
            angle=math.radians(start+j*22.5)
            eye.append((sign*.137+cx+radius*math.cos(angle),1.602+cz+radius*math.sin(angle)))
    front_prism('face_eye_'+str(sign),eye,-.255,.014,black,'head')
    box('eyebrow_'+str(sign),(sign*.137,-.25,1.691),(.073,.02,.027),hair,'head',.009)
    ell('face_blush_'+str(sign),(sign*.231,-.244,1.498),(.044,.009,.039),blush,'head',12,6)
mouth_outline=[(-.05,1.517),(.05,1.517),(.043,1.477),(.024,1.458),(-.016,1.455),(-.042,1.475)]
front_prism('face_smile',[(x*1.2,1.486+(z-1.486)*1.2) for x,z in mouth_outline],-.252,.006,lip,'head')
ell('face_tongue',(0,-.259,1.468),(.0312,.006,.0156),tongue,'head',12,6)

# Broad angular hair cap, parted fringe, side locks and stepped ponytail.
box('hair_cap_01',(0,.017,1.875),(.682,.535,.185),hair,'head',.045)
box('hair_back_01',(0,.208,1.654),(.66,.12,.42),hair,'head',.025)
for sign in [-1,1]:
    box('hair_side_'+str(sign),(sign*.298,.01,1.645),(.069,.42,.47),hair,'head',.018)
front_prism('hair_front_sweep_01',[(-.331,1.902),(.034,1.904),(.046,1.799),(-.042,1.71),(-.132,1.688),(-.327,1.706)],-.283,.075,hair,'head')
front_prism('hair_front_sweep_02',[(.031,1.904),(.328,1.898),(.329,1.707),(.153,1.701),(.094,1.745),(.043,1.814)],-.283,.075,hair,'head')
for i,(x,y,z,w,d,h,angle) in enumerate([(0,.28,1.963,.26,.25,.26,-.22),(-.07,.38,1.81,.27,.23,.29,-.20),(-.11,.39,1.60,.26,.23,.26,.25),(-.13,.36,1.405,.23,.22,.24,-.28)]):
    o=box('hair_ponytail_%02d'%i,(x,y,z),(w,d,h),hair,'ponytail',.045);o.rotation_euler.y=angle
box('hair_tie_01',(0,.196,1.958),(.264,.14,.069),acc,'head',.017)

rect_loft('top_tank_01',[(1.035,.174,.115),(1.07,.172,.116),(1.27,.151,.104)],rose,'chest')
for sign in [-1,1]:
    box('top_strap_'+str(sign),(sign*.114,0,1.282),(.07,.197,.072),rose,'chest',.012)
box('top_neckline',(0,-.069,1.283),(.166,.064,.065),rose,'chest',.012)
# Hollow triangle chest insignia.
for a,b in [((.065,-.12,1.164),(.088,-.12,1.209)),((.088,-.12,1.209),(.111,-.12,1.164)),((.111,-.12,1.164),(.065,-.12,1.164))]:
    ribbon('top_mark_01',[a,b],.005,white,'chest')
rect_loft('bottom_skort_01',[(.720,.239,.15),(.770,.23,.145),(.946,.164,.109)],bottom,'pelvis')
rect_loft('bottom_waistband_01',[(.94,.168,.115),(.978,.163,.113)],bottom,'pelvis')
for sign,side in [(1,'L'),(-1,'R')]:
    box('bottom_liner.'+side,(sign*.095,0,.814),(.142,.15,.12),bottom,'thigh.'+side,.012)
    mesh('bottom_side_stripe.'+side,[(sign*.174,-.16,.721),(sign*.204,-.16,.721),(sign*.151,-.122,.929),(sign*.128,-.122,.929)],[(0,1,2,3)],white,'pelvis')
    box('socks_01.'+side,(sign*.145,0,.285),(.161,.185,.194),white,'shin.'+side,.016)
    for j in range(2):box('sock_stripe_%d.%s'%(j,side),(sign*.145,0,.317+j*.041),(.165,.189,.019),acc,'shin.'+side,.009)
    box('shoe_sole.'+side,(sign*.15,-.057,.043),(.221,.334,.068),shoe,'foot.'+side,.02)
    box('shoes_01.'+side,(sign*.15,-.064,.111),(.214,.317,.117),white,'foot.'+side,.025)
    box('shoe_heel_accent.'+side,(sign*.15,.045,.169),(.177,.11,.137),shoe,'foot.'+side,.022)
    box('shoe_toe_accent.'+side,(sign*.15,-.195,.082),(.21,.077,.081),shoe,'foot.'+side,.017)
    box('shoe_tongue.'+side,(sign*.15,-.064,.186),(.119,.121,.057),shoe,'foot.'+side,.01)
    for j in range(2):box('shoe_lace_%d.%s'%(j,side),(sign*.15,-.10+j*.06,.211),(.137,.027,.018),white,'foot.'+side,.005)
    for outer in [-1,1]:box('shoe_side_panel_%s.%s'%(outer,side),(sign*.15+outer*.104,-.039,.10),(.014,.125,.033),shoe,'foot.'+side,.005)
    segment('wristband_01.'+side,(sign*.367,-.008,.964),(sign*.422,-.011,.854),.151,.143,acc,'forearm.'+side)

# Symmetric rectangular paddle with small matching corner clips and a separate grip.
cx=-.465;cy=-.018;cz=.495
outline=[(-.077,.154),(.077,.154),(.095,.136),(.095,-.136),(.077,-.154),(-.077,-.154),(-.095,-.136),(-.095,.136)]
def paddle_plate(name,outline,thickness,material):
    v=[(cx+x,cy+y,cz+z) for y in [-thickness/2,thickness/2] for x,z in outline]; n=len(outline)
    return mesh(name,v,[tuple(range(n)),tuple(reversed(range(n,n*2)))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)],material,'paddle_socket')
paddle_plate('paddle_01',[(x*1.40,z*1.25) for x,z in outline],.027,edge)
paddle_plate('paddle_face_01',[(x*1.19,z*1.08) for x,z in outline],.029,dark)
tube('paddle_handle_01',[(cx,cy,.688),(cx,cy,.771)],[.016,.014],black,'paddle_socket',n=8)
for j in range(5):tube('paddle_grip_%02d'%j,[(cx,cy,.699+j*.014),(cx,cy,.703+j*.014)],[.017,.017],black,'paddle_socket',n=8)

# Optional real geometry modules live in their own disabled collection.
before=set(o.name for o in meshes)
for sign in [-1,1]:
    x=sign*.139
    pts=[(x+dx,-.274,1.602+dz) for dx,dz in [(-.074,-.071),(.074,-.071),(.074,.075),(-.074,.075),(-.074,-.071)]]
    ribbon('glasses_01_frame_'+str(sign),pts,.011,black,'head')
    ribbon('glasses_01_arm_'+str(sign),[(sign*.213,-.274,1.63),(sign*.34,-.18,1.63),(sign*.34,.025,1.61)],.008,black,'head')
ribbon('glasses_01_bridge',[(-.065,-.278,1.625),(0,-.283,1.637),(.065,-.278,1.625)],.009,black,'head')
box('visor_01_band',(0,-.269,1.813),(.702,.045,.079),white,'head',.015)
for sign in [-1,1]:box('visor_01_side_'+str(sign),(sign*.336,.005,1.813),(.042,.53,.079),white,'head',.01)
box('visor_01_brim',(0,-.333,1.779),(.702,.23,.035),rose,'head',.014)
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
# Compact reference proportions. Keep the entire head assembly and sneaker
# size intact; shorten the legs and torso, and shorten arms along their axes.
def body_height(z):
    if z<=.23:return z*.78
    if z<=.98:return .23*.78+(z-.23)*.50
    return .23*.78+.75*.50+(z-.98)*.72
neck_lift=.055
head_shift=body_height(1.34)-1.34+neck_lift
new_bones={}
for name,(a,b) in bones.items():
    def body_point(p):return Vector((p.x,p.y,body_height(p.z)))
    if name in ('head','ponytail'):
        new_bones[name]=(a+Vector((0,0,head_shift)),b+Vector((0,0,head_shift)))
    else:new_bones[name]=(body_point(a),body_point(b))
new_bones['neck'][1].z+=neck_lift
for side in ['L','R']:
    for part in ['upper_arm','forearm']:
        name=part+'.'+side;a,b=bones[name]
        start=new_bones['clavicle.'+side][1] if part=='upper_arm' else new_bones['upper_arm.'+side][1]
        new_bones[name]=(start,start+(b-a)*.72)
    name='hand.'+side;a,b=bones[name];start=new_bones['forearm.'+side][1]
    delta=b-a;delta.z*=.78;new_bones[name]=(start,start+delta)
def hand_point(p,side):
    delta=p-bones['hand.'+side][0];delta.z*=.78
    return new_bones['hand.'+side][0]+delta
new_bones['paddle_socket']=tuple(hand_point(p,'R') for p in bones['paddle_socket'])
def compact_point(p,binding):
    if binding in ('head','ponytail'):return p+Vector((0,0,head_shift))
    if binding=='neck':return Vector((p.x,p.y,body_height(p.z)+neck_lift*max(0,min(1,(p.z-1.275)/.12))))
    if binding and binding.startswith(('upper_arm.','forearm.')):
        a,b=bones[binding];axis=(b-a).normalized();delta=p-a
        return new_bones[binding][0]+delta-axis*(delta.dot(axis)*.28)
    if binding and binding.startswith('hand.'):return hand_point(p,binding[-1])
    if binding=='paddle_socket':return hand_point(p,'R')
    return Vector((p.x,p.y,body_height(p.z)))
bpy.context.view_layer.update()
for o in meshes:
    inverse=o.matrix_world.inverted()
    for v in o.data.vertices:v.co=inverse@compact_point(o.matrix_world@v.co,bindings.get(o.name))
bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
for b in rig.data.edit_bones:b.head,b.tail=new_bones[b.name]
bpy.ops.object.mode_set(mode='OBJECT')
rig['height_m']=1.596
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
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.resolution_x=800;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
cameras={}
for name,loc in [('front',(0,-5,1.35)),('side',(5,0,1.35)),('back',(0,5,1.35)),('three-quarter',(3,-5,2.0)),('tactical',(3,-5,6))]:
    d=bpy.data.cameras.new(name);d.type='ORTHO';d.ortho_scale=1.95
    o=bpy.data.objects.new('CAM_'+name,d);studio.objects.link(o);o.location=loc;point(o,(0,0,.78));cameras[name]=o
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
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'riley.blend'))
scene=bpy.context.scene
cameras={name:bpy.data.objects['CAM_'+name] for name in cameras}
render_only=os.environ.get('RILEY_RENDER_ONLY','')
for name,cam in cameras.items():
    if render_only and render_only!=name:continue
    scene.camera=cam;scene.render.filepath=str(ROOT/'previews'/(name+'.png'));bpy.ops.render.render(write_still=True)
for frame,name in [(20,'ready'),(40,'forehand'),(60,'overhead'),(80,'shuffle')]:
    if render_only and render_only!='rig-'+name:continue
    scene.frame_set(frame);scene.camera=cameras['three-quarter'];scene.camera.data.ortho_scale=2.2;scene.render.filepath=str(ROOT/'previews'/('rig-'+name+'-check.png'));bpy.ops.render.render(write_still=True)
scene.frame_set(1)
print('RILEY_REPORT',json.dumps({k:v for k,v in report.items() if k!='modules'}))
