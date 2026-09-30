"""Rebuild original, editable Fun Pack SVG art and procedural music studies.

No external images, fonts, samples, or music are used. Court overlays share the
existing 640x320 centered baseline view and never paint the playing surface.
"""
from pathlib import Path
import json
import math
import random
import struct
import wave

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/assets/fun-pack'
OUT.mkdir(parents=True, exist_ok=True)
THEMES = [
    dict(id='disco', name='Disco Inferno', eyebrow='A little sparkle. A lot of groove.', colors=['#582c83','#ff77bb','#ffce65','#fff1cc'], looks=['Disco Dynamo','Boogie Royal'], props=['mirrorball','speaker','star','spotlight','record'], bpm=116, celebration='Saturday-night spin', description='Sequins, flared silhouettes, gold accents and a mirrorball above your favorite court.'),
    dict(id='eighties', name="80’s Night", eyebrow='Sunset colors. After-dark energy.', colors=['#272455','#ff70b2','#54e5e0','#ffe09b'], looks=['Neon Runner','Miami Rally'], props=['boombox','sunset','palm','cassette','neon'], bpm=104, celebration='Neon two-step', description='Retrowave sunsets, color-block tracksuits, headbands and synthpop with a pastel Miami twist.'),
    dict(id='horrified', name='Spooky', eyebrow='All treats. No jump scares.', colors=['#393151','#b7e878','#ffae65','#faf0de'], looks=['Funny Bones','Zombie Jamboree'], props=['ghost','pumpkin','bat','web','lantern'], bpm=96, celebration='Goofy ghoul shuffle', description='Friendly ghosts, smiling skeletons and goofy zombies throw a very un-scary court party.'),
    dict(id='fairy', name='Fairy Tales', eyebrow='Once upon a match.', colors=['#366d70','#c7abf5','#f4aec9','#fff1ac'], looks=['Petal Princess','Woodland Fairy'], props=['butterfly','mushroom','flower','bird','castle'], bpm=88, celebration='Enchanted twirl', description='Storybook royalty, magical wings, butterflies, birdsong and a little courtside enchantment.'),
]

def svg(body, view='0 0 160 160', title=''):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}" role="img"><title>{title}</title>{body}</svg>\n'

def star(x=80,y=80,r=20,color='#fff1ac'):
    return f'<path d="M{x} {y-r}Q{x+3} {y-3} {x+r} {y}Q{x+3} {y+3} {x} {y+r}Q{x-3} {y+3} {x-r} {y}Q{x-3} {y-3} {x} {y-r}Z" fill="{color}"/>'

def prop(kind, c):
    dark, pink, accent, light = c
    if kind=='mirrorball':
        tiles=''.join(f'<rect x="{x}" y="{y}" width="12" height="12" rx="2" fill="{[light,pink,"#b3e6ec","#a8a0d6"][(x//14+y//14)%4]}"/>' for x in range(38,124,14) for y in range(34,120,14))
        return f'<defs><clipPath id="ball"><circle cx="80" cy="77" r="45"/></clipPath></defs><path d="M80 0v30" stroke="{dark}" stroke-width="4"/><circle cx="80" cy="77" r="47" fill="{dark}"/><g clip-path="url(#ball)">{tiles}</g><path d="M54 44q-20 30-7 51" fill="none" stroke="white" opacity=".6" stroke-width="4"/>'+star(133,40,13,light)+star(27,103,10,pink)
    if kind in ['speaker','boombox']:
        box = kind=='boombox'
        return f'<rect x="20" y="48" width="120" height="80" rx="12" fill="{dark}"/><path d="M54 47V33h52v14" fill="none" stroke="{accent}" stroke-width="6"/>'+''.join(f'<circle cx="{x}" cy="92" r="23" fill="{pink}"/><circle cx="{x}" cy="92" r="17" fill="{dark}"/><circle cx="{x}" cy="92" r="8" fill="{accent}"/>' for x in [49,111])+f'<rect x="66" y="73" width="28" height="12" rx="2" fill="{light}"/><path d="M70 104h20M30 59h100" stroke="{accent}" stroke-width="3"/>'+(f'<path d="M120 46l17-30" stroke="{dark}" stroke-width="3"/>' if box else '')
    if kind=='star': return star(80,80,54,accent)+star(127,30,14,pink)+star(30,119,12,light)
    if kind=='spotlight': return f'<path d="M78 75 16 4h128Z" fill="{pink}" opacity=".22"/><path d="M80 100v34m-29 0h58" stroke="{dark}" stroke-width="8"/><rect x="55" y="68" width="50" height="40" rx="10" fill="{dark}"/><ellipse cx="80" cy="68" rx="25" ry="9" fill="{accent}"/>'
    if kind=='record': return f'<circle cx="80" cy="80" r="59" fill="{dark}"/><g fill="none" stroke="{pink}" opacity=".4"><circle cx="80" cy="80" r="49"/><circle cx="80" cy="80" r="40"/></g><circle cx="80" cy="80" r="23" fill="{accent}"/><circle cx="80" cy="80" r="5" fill="{dark}"/>'+star(128,27,16,light)
    if kind=='sunset': return f'<defs><clipPath id="sun"><circle cx="80" cy="80" r="56"/></clipPath></defs><g clip-path="url(#sun)"><path d="M20 20h120v120H20Z" fill="{accent}"/>'+''.join(f'<path d="M20 {y}h120v{h}H20Z" fill="{pink}"/>' for y,h in [(20,55),(80,12),(98,10),(114,8),(129,7)])+'</g>'
    if kind=='palm': return f'<path d="M74 140q20-52 2-89" fill="none" stroke="{dark}" stroke-width="10"/><path d="M79 54Q36 9 13 69q37-21 63-8Q35 55 31 102q27-33 48-39Q106 32 146 69q-12-52-63-17Q103 8 126 19q-33-23-47 35" fill="{accent}"/>'
    if kind=='cassette': return f'<rect x="20" y="39" width="120" height="82" rx="12" fill="{pink}"/><rect x="31" y="51" width="98" height="42" rx="8" fill="{dark}"/><path d="m47 116 9-18h48l9 18" fill="{accent}"/>'+''.join(f'<circle cx="{x}" cy="72" r="12" fill="{light}"/><circle cx="{x}" cy="72" r="5" fill="{dark}"/>' for x in [51,109])+f'<path d="M65 68h30v8H65Z" fill="{accent}"/>'
    if kind=='neon': return f'<path d="M26 112 80 24l54 88Z" fill="none" stroke="{pink}" stroke-width="9" stroke-linejoin="round"/><path d="M24 133h112" stroke="{accent}" stroke-width="7"/>'
    if kind=='ghost': return f'<path d="M40 80Q29 22 80 22t40 58l14 47-27-10-14 18-18-16-19 13-25-6Z" fill="{light}"/><ellipse cx="65" cy="68" rx="6" ry="9" fill="{dark}"/><ellipse cx="94" cy="68" rx="6" ry="9" fill="{dark}"/><path d="M70 89q10 13 21-1" fill="none" stroke="{dark}" stroke-width="4" stroke-linecap="round"/><g fill="{accent}" opacity=".8"><ellipse cx="51" cy="83" rx="9" ry="5"/><ellipse cx="108" cy="83" rx="9" ry="5"/></g>'
    if kind=='pumpkin': return f'<path d="M80 45q-5-24 13-24" stroke="{pink}" stroke-width="9" fill="none"/><ellipse cx="80" cy="91" rx="60" ry="43" fill="{accent}"/><g fill="none" stroke="#db7c42" stroke-width="3"><ellipse cx="80" cy="91" rx="36" ry="43"/><ellipse cx="80" cy="91" rx="16" ry="43"/></g><g fill="{dark}"><path d="m47 85 12-15 11 15zm43 0 12-15 11 15zM53 101q27 32 54 0l-15 6-10-5-10 7Z"/></g>'
    if kind=='bat': return f'<path d="M75 67 66 49l-8 15Q36 38 9 52q9 25 9 44 17-15 30 4 14-10 27 7h10q15-18 29-7 13-19 28-4 0-21 9-44-26-14-49 12l-9-15-8 18" fill="{dark}"/><circle cx="73" cy="78" r="4" fill="{light}"/><circle cx="90" cy="78" r="4" fill="{light}"/>'
    if kind=='web':
        return f'<g fill="none" stroke="{light}" stroke-width="3"><path d="M16 16h128M16 16v128M16 16l110 110M16 16l125 52M16 16l52 125"/>'+''.join(f'<path d="M16 {r}Q42 {r-16} {r-10} {r-10}Q{r-16} 42 {r} 16"/>' for r in [55,95,139])+'</g>'
    if kind=='lantern': return f'<path d="M63 37q0-29 17-29t17 29" fill="none" stroke="{dark}" stroke-width="5"/><path d="m40 48 20-15h40l20 15-11 82H51Z" fill="{dark}"/><path d="M54 57h52l-8 62H62Z" fill="{accent}"/><path d="M81 111q-24-10 0-38 21 33 0 38" fill="{light}"/>'
    if kind=='butterfly': return f'<path d="M77 77C16-3 6 107 69 91c-49 1-24 66 9 15M83 77c61-80 71 30 8 14 49 1 24 66-9 15" fill="{pink}"/><path d="M76 79C32 32 26 81 64 80m23-1c44-47 50 2 12 1" fill="{accent}"/><path d="M80 73v40m0-39L66 56m14 18 14-18" stroke="{dark}" stroke-width="5" stroke-linecap="round"/>'
    if kind=='mushroom': return f'<path d="M65 68h30l9 70H57Z" fill="{light}"/><path d="M12 83Q26 6 80 17t68 66q-66 19-136 0" fill="{accent}"/><g fill="{light}"><ellipse cx="49" cy="52" rx="15" ry="10"/><ellipse cx="104" cy="48" rx="11" ry="8"/><ellipse cx="85" cy="74" rx="13" ry="8"/></g>'
    if kind=='flower': return f'<path d="M80 83v62m0-17q-43-8-34-29 28 3 34 23m0-15q42-9 34-27-29 3-34 21" fill="{dark}"/>'+''.join(f'<ellipse cx="80" cy="40" rx="18" ry="28" fill="{pink}" transform="rotate({a} 80 68)"/>' for a in range(0,360,72))+f'<circle cx="80" cy="68" r="18" fill="{light}"/>'
    if kind=='bird': return f'<path d="M27 96 8 68l40 8q32-51 65-12l30 10-26 12q-9 43-57 36Z" fill="{pink}"/><path d="M48 86q25-16 47 5-24 32-47-5" fill="{accent}"/><circle cx="104" cy="66" r="4" fill="{dark}"/><path d="M70 120v16m17-15v15" stroke="{dark}" stroke-width="3"/>'
    if kind=='castle': return f'<g fill="{pink}"><path d="M35 60h30v80H35zm60 0h30v80H95zM61 90h38v50H61Z"/></g><path d="m28 60 22-36 22 36zm60 0 22-36 22 36Z" fill="{accent}"/><path d="M72 140v-24q8-16 16 0v24M46 77h8v17h-8m52-17h8v17h-8" fill="{dark}"/><path d="M50 25V9l24 6-24 8m60 2V9l24 6-24 8" fill="{light}"/>'
    raise ValueError(kind)

def at(body,x,y,size):
    # Scope per-instance clip IDs so mirrored/repeated props never collide.
    body=body.replace('id="ball"',f'id="ball{x}{y}"').replace('url(#ball)',f'url(#ball{x}{y})').replace('id="sun"',f'id="sun{x}{y}"').replace('url(#sun)',f'url(#sun{x}{y})')
    return f'<g transform="translate({x} {y}) scale({size/160})">{body}</g>'

def overlay(t):
    c=t['colors']; p=lambda k,x,y,s:at(prop(k,c),x,y,s)
    if t['id']=='disco':
        b='<path d="M50 14Q320 84 590 14" fill="none" stroke="#582c83" stroke-width="3"/>'+p('mirrorball',267,-14,106)
        b+=''.join(f'<circle cx="{x}" cy="{int(16+29*math.sin((x-50)/540*math.pi))}" r="5" fill="{c[i%3+1]}"/>' for i,x in enumerate(range(65,591,34)))
        b+=p('speaker',15,179,106)+p('speaker',519,179,106)+p('spotlight',110,80,65)+p('spotlight',465,80,65)
        b+=p('star',116,30,43)+p('star',484,38,34)
    elif t['id']=='eighties':
        b=p('sunset',270,1,100)+p('palm',20,19,145)+p('palm',475,19,145)+p('boombox',4,178,120)+p('cassette',530,201,95)
        b+='<g fill="none" stroke="#54e5e0" stroke-width="4"><path d="M125 278 207 138M515 278 433 138"/></g>'+p('neon',154,38,59)+p('neon',427,38,59)
    elif t['id']=='horrified':
        b=p('web',0,0,126)+p('ghost',94,27,95)+p('ghost',473,22,76)+p('bat',280,33,72)
        b+=p('pumpkin',2,203,116)+p('pumpkin',525,199,108)+p('lantern',121,103,64)+p('lantern',452,103,64)
    else:
        b=p('castle',277,0,86)+p('mushroom',0,172,128)+p('mushroom',534,196,95)+p('flower',90,76,94)+p('flower',455,70,96)
        b+=p('butterfly',186,29,53)+p('butterfly',407,45,47)+p('bird',111,30,53)+p('bird',511,21,60)
        b+=''.join(star(x,y,r,c[3]) for x,y,r in [(250,64,6),(390,32,6),(67,151,6),(582,154,8),(132,269,6),(514,270,6)])
    return b

def paddle(t):
    d,p,a,l=t['colors']
    body=f'<rect x="70" y="108" width="20" height="43" rx="7" fill="{d}"/><path d="M69 129h22m-22 7h22m-22 7h22" stroke="{l}" stroke-width="2"/><rect x="29" y="8" width="102" height="109" rx="36" fill="{d}"/><rect x="35" y="14" width="90" height="97" rx="30" fill="{p}"/>'
    motif={'disco':'mirrorball','eighties':'sunset','horrified':'ghost','fairy':'butterfly'}[t['id']]
    return body+at(prop(motif,t['colors']),44,22,73)

def character(t, variant, equipped=True):
    d,p,a,l=t['colors']; kind=t['id']; skin='#bd815f' if variant==0 else '#e5b18a'
    if kind=='disco' and variant==1: p,a=a,p
    # Large head, compact limbs, open face, front view: matches the game's toy-like silhouette.
    b='<ellipse cx="150" cy="348" rx="77" ry="10" fill="#123f56" opacity=".10"/>'
    if kind=='fairy' and variant==1:
        b+='<g fill="#c7abf5" stroke="#fff1ac" stroke-width="3"><path d="M137 205C12 84 20 267 131 233c-105-8-52 102 9 26M163 205C288 84 280 267 169 233c105-8 52 102-9 26"/></g>'
    pants=d if kind!='disco' else p
    b+=f'<g stroke-linejoin="round"><path d="m118 259-9 69h31l10-59 11 59h31l-10-69" fill="{pants}"/>'
    if kind=='disco': b+=f'<path d="m112 300-15 31h47l-6-31m26 0-8 31h46l-13-31" fill="{p}"/>'
    b+=f'<path d="M109 326h33v17H99q-5-13 10-17m53 0h32l16 17h-48" fill="{l}"/><path d="M107 184q43-18 86 0l-7 84h-76Z" fill="{p}"/>'
    b+=f'<path d="m109 187-21 9-17 66 19 5 30-66m71-14 20 10 18 64-19 8-28-68" fill="{p}"/><g fill="{skin}"><circle cx="80" cy="269" r="13"/><circle cx="220" cy="269" r="13"/><rect x="137" y="155" width="26" height="30" rx="9"/></g>'
    if kind=='disco':
        b+=f'<path d="m117 180 22 3 11 32 12-32 22-3-15 48-19-13-18 13Z" fill="{l}"/><path d="M113 253h74v10h-74" fill="{d}"/><rect x="143" y="251" width="16" height="13" rx="2" fill="{a}"/>'
        b+=''.join(star(x,y,3,a) for x,y in [(126,232),(171,234),(122,244),(177,244),(126,297),(178,311),(96,228),(207,226)])
    elif kind=='eighties':
        b+=f'<path d="m107 200 44 20 42-20v17l-42 21-44-21" fill="{a}"/><path d="M149 179v83m-35 13-9 46m75-46 9 46" stroke="{l}" stroke-width="4"/>'
        if variant==1: b+=f'<path d="m108 182 30-6-7 78-24 8m84-80-30-6 7 78 21 8" fill="{l}"/><path d="m129 178-8 24 13 11m37-35 8 24-13 11" fill="none" stroke="{a}" stroke-width="3"/>'
    elif kind=='horrified':
        if variant==0:
            b+=f'<path d="M107 184q43-18 86 0l-7 84h-76Z" fill="{d}"/><g stroke="{l}" stroke-width="5" fill="none" stroke-linecap="round"><path d="M150 188v59m-25-52q25 13 50 0m-48 14q23 13 46 0m-43 14q20 13 40 0m-37 33 17-9 17 9m-46 22-6 39m62-39 6 39M99 211l-12 39m114-39 12 39"/></g>'
        else:
            b+=f'<path d="m108 187 32 15-10 30-22-9m78 9-24-6 8-32 22 8" fill="{a}"/><path d="m117 258 10-9 9 14 13-11 13 12 11-11 13 8" fill="{d}"/><path d="M169 210l16 8m-12-12-3 10m10-6-3 10" stroke="{d}" stroke-width="2"/>'
    elif kind=='fairy':
        b+=f'<path d="m118 231-27 61 30-7 29 14 29-14 30 7-27-61" fill="{p}"/><path d="m118 231 15 48 17-42 18 42 14-48" fill="{a}"/><path d="m120 187 30 24 30-24-30 49Z" fill="{a}"/>'+star(150,225,9,l)
    b+=f'<rect x="108" y="84" width="84" height="85" rx="35" fill="{skin}"/><circle cx="108" cy="130" r="9" fill="{skin}"/><circle cx="192" cy="130" r="9" fill="{skin}"/>'
    if kind=='horrified' and variant==0:
        b+=f'<rect x="105" y="80" width="90" height="86" rx="37" fill="{l}"/><ellipse cx="131" cy="124" rx="11" ry="13" fill="{d}"/><ellipse cx="169" cy="124" rx="11" ry="13" fill="{d}"/><path d="m150 130-6 10h12Z" fill="{d}"/><path d="M132 150h36m-27-5v10m9-10v10m9-10v10" stroke="{d}" stroke-width="3" stroke-linecap="round"/>'
    else:
        if kind=='horrified': b+=f'<rect x="108" y="84" width="84" height="85" rx="35" fill="{p}"/>'
        b+=f'<path d="M105 116q-15-52 43-49 62-4 48 50l-17-21-18 9-34-9Z" fill="{d}"/><g fill="{d}"><ellipse cx="132" cy="126" rx="4" ry="6"/><ellipse cx="169" cy="126" rx="4" ry="6"/></g><path d="M139 147q12 11 24-2" fill="none" stroke="{d}" stroke-width="3" stroke-linecap="round"/>'
        b+=f'<ellipse cx="123" cy="139" rx="8" ry="4" fill="{a}" opacity=".55"/><ellipse cx="178" cy="139" rx="8" ry="4" fill="{a}" opacity=".55"/>'
        if kind=='disco': b+=f'<g fill="{d}">'+''.join(f'<circle cx="{x}" cy="{y}" r="17"/>' for x,y in [(109,91),(122,72),(145,66),(169,73),(188,88)])+'</g>'+star(188,89,10,a)
        if kind=='eighties': b+=f'<path d="M108 107q42-15 84 0v10q-42-15-84 0Z" fill="{a}"/><path d="m192 110 19 7-18 3" fill="{p}"/>'
        if kind=='horrified': b+=f'<path d="M168 103l17 7m-13-10-4 9m12-5-4 9" stroke="{d}" stroke-width="2"/>'
        if kind=='fairy': b+=f'<path d="m114 86-4-25 21 14 19-29 19 29 21-14-4 25Z" fill="{l}"/><circle cx="150" cy="69" r="6" fill="{a}"/>'
    b+='</g>'+(at(paddle(t),208,215,67) if equipped else '')
    return b

def music(t,path):
    # Eight-bar seamless arrangement. Deterministic synthesis, no sampled material.
    rate=22050; beat=60/t['bpm']; duration=32*beat; n=round(duration*rate)
    samples=[0.0]*n; rng=random.Random(t['id'])
    def tone(start,length,midi,vol,voice='bell'):
        freq=440*2**((midi-69)/12); count=int(length*rate); offset=int(start*rate)
        for i in range(count):
            sec=i/rate; attack=min(1,sec/.012); release=min(1,(length-sec)/.04)
            phase=2*math.pi*freq*sec
            if voice=='bass': sound=math.sin(phase)+.2*math.sin(2*phase)
            elif voice=='pad': sound=(math.sin(phase)+.28*math.sin(2*phase)+.13*math.sin(3*phase))*.65
            elif voice=='chirp': sound=math.sin(phase+18*math.sin(sec*24))*math.exp(-sec*14)
            else: sound=(math.sin(phase)+.35*math.sin(phase*2.003))*math.exp(-sec*5)
            samples[(offset+i)%n]+=sound*vol*attack*release
    roots={'disco':[48,53,55,53],'eighties':[45,41,48,43],'horrified':[45,50,44,45],'fairy':[48,53,57,55]}[t['id']]
    minor=t['id'] in ['eighties','horrified']
    for bar in range(8):
        root=roots[bar%4]; start=bar*4*beat
        for degree in [0,3 if minor else 4,7]: tone(start,3.8*beat,root+12+degree,.04,'pad')
        for step in range(8):
            when=start+step*.5*beat
            tone(when,.36*beat,root+(12 if step%4==3 else 0),.095 if t['id']!='fairy' else .05,'bass')
            seq=[0,7,12,7,4 if not minor else 3,7,14,12]
            tone(when,.65*beat,root+24+seq[(step+bar%2*2)%8],.065,'bell')
        if t['id']=='fairy':
            tone(start+2.7*beat,.19,91+bar%3,.055,'chirp');tone(start+3*beat,.22,95+bar%4,.04,'chirp')
        else:
            for step in range(8):
                offset=int((start+step*.5*beat)*rate)
                for i in range(int(.075*rate)):
                    sec=i/rate;samples[(offset+i)%n]+=(rng.random()*2-1)*math.exp(-sec*70)*.035
            for step in range(4):
                offset=int((start+step*beat)*rate)
                for i in range(int(.19*rate)):
                    sec=i/rate; sound=math.sin(2*math.pi*(48*sec+4*(1-math.exp(-sec*30))))*math.exp(-sec*23)*.20
                    if step%2: sound+=(rng.random()*2-1)*math.exp(-sec*30)*.08
                    samples[(offset+i)%n]+=sound
    peak=max(abs(x) for x in samples);gain=.78/max(peak,.01)
    with wave.open(str(path),'wb') as wav:
        wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(rate)
        wav.writeframes(b''.join(struct.pack('<h',int(max(-1,min(1,s*gain))*32767)) for s in samples))
    return dict(bpm=t['bpm'],bars=8,duration=round(duration,3),sampleRate=rate,file=f"{t['id']}/music.wav",kind='Original synthesized instrumental loop')

manifest=[]
for t in THEMES:
    folder=OUT/t['id']; folder.mkdir(exist_ok=True)
    files=[]
    def write(name,body,view='0 0 160 160',title=''):
        (folder/name).write_text(svg(body,view,title or t['name']),encoding='utf-8');files.append(f"{t['id']}/{name}")
    for p in t['props']: write(p+'.svg',prop(p,t['colors']),title=p.title())
    write('court-overlay.svg',overlay(t),'0 0 640 320',t['name']+' court decorations')
    write('paddle.svg',paddle(t),title=t['name']+' paddle')
    for i,name in enumerate(t['looks']):
        write(f'player-{i+1}.svg',character(t,i),'0 0 300 370',name)
        write(f'player-{i+1}-body.svg',character(t,i,False),'0 0 300 370',name+' without paddle')
    # A small celebration atlas for post-point / results motion, never active play.
    write('celebration.svg',''.join(at(prop(t['props'][i%len(t['props'])],t['colors']),x,y,s) for i,(x,y,s) in enumerate([(9,40,70),(233,20,78),(97,1,46),(150,160,60),(25,188,41),(258,187,36)])),'0 0 320 260',t['celebration'])
    audio=music(t,folder/'music.wav')
    manifest.append({**t,'assets':files,'audio':audio,'requiredPack':'fun','status':'design-assets','playerModelStatus':'SVG design sheets; 3D rig implementation pending'})
(OUT/'manifest.json').write_text(json.dumps({'version':1,'themes':manifest,'license':'Original PickleBash artwork and synthesized music. No third-party samples.','courtOverlayViewBox':[0,0,640,320]},indent=2)+'\n')
print(f'Built {len(manifest)} themes, {sum(len(t["assets"]) for t in manifest)} SVG assets, and 4 music loops.')
