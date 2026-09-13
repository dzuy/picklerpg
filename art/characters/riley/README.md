# Riley blocky modular character

Blender-authored, rigged Riley asset based on the supplied Riley orthographic reference sheet. The September 12 blocky redesign uses an oversized chamfered square head, dark rounded rectangular pill eyes, blush cheeks, parted angular hair and a stepped ponytail, a bright pink tank and skort, short chunky limbs, striped socks, layered block sneakers and a wide octagonal paddle. No texture images are required at runtime.

## Deliverables

- `riley.blend`: editable source, neutral A-pose on frame 1, shared deform skeleton, active modules, disabled optional accessories, studio cameras and lights.
- `../../../public/models/riley/riley.glb`: neutral, rigged character for Three.js.
- `../../../public/models/riley/glasses.glb` and `hat_visor.glb`: separately loadable optional modules with matching bind poses.
- `previews/`: front, side, back, three-quarter and tactical renders, plus ready/forehand/overhead/shuffle deformation checks.
- `build_riley.py`: reproducible Blender source construction and exports.
- `asset-report.json`: authored triangle counts, module names, material names and rig schema.
- `export-validation.json`: results from loading the actual binary exports with Three.js GLTFLoader.

Open `/riley-review.html` on the running Vite server to orbit the GLB, switch views, recolor the materials, toggle accessories and inspect poses. Preview changes do not touch saved player data.

## Asset contract

Schema: `pickle-rpg.modular-player.v1`. Units are metres. Blender uses Z-up with the face toward -Y; glTF export uses Y-up with the face toward +Z. Ground contact is near Y=0 in Three.js. The neutral asset is approximately 1.596 m tall including hair.

The main export has **4,964 triangles**, including the **224-triangle paddle**, ten active modules and 24 bones. Material boundaries become 21 skinned mesh primitives in Three.js. Flat normals increase exported vertex count; the triangle count remains within budget. The optional glasses add 208 triangles; the visor adds 176.

| Slot | Blender object | Color channels |
|---|---|---|
| Body | `body_base` | `MAT_skin` |
| Head / face | `head_base` | Skin, eye, mouth and inner-ear materials |
| Hair | `hair_ponytail_01` | `MAT_hair`, `MAT_accessory` |
| Eyebrows | `eyebrows_01` | `MAT_hair` |
| Glasses | `glasses_01` | `MAT_grip` |
| Hat / visor | `visor_01` | `MAT_ivory`, `MAT_top` |
| Top | `top_tank_01` | `MAT_top`, `MAT_ivory` |
| Bottom | `bottom_skort_01` | `MAT_bottom`, `MAT_ivory` |
| Socks | `socks_01` | `MAT_ivory`, `MAT_accessory` |
| Shoes | `shoes_01` | `MAT_shoe_accent`, `MAT_ivory`, `MAT_sole` |
| Wrist accessories | `wristbands_01` | `MAT_accessory` |
| Paddle | `paddle_01` | `MAT_paddle_color`, `MAT_paddle_face`, `MAT_grip` |

Each module exports `module_slot` and `rig_schema` in glTF extras. Materials export `customization_channel`. Find modules by extras rather than mesh order. A module with multiple materials loads as a group containing skinned primitives: toggle or replace the whole module group.

## Skeleton and swapping

`root → pelvis → spine → chest → neck → head`; paired clavicle/upper-arm/forearm/hand and thigh/shin/foot/toe chains; a ponytail bone; a `paddle_socket` child of the right hand. The arms are in a relaxed A-pose. Arms and legs use separate rigid chamfered segments at the joints. Waist clothing follows the pelvis; lower skirt rings also blend toward the thighs. Eyes and brows follow the head. The paddle follows the hand socket.

For additional hairstyles, outfits or faces, preserve the skeleton's names, rest transforms and scale. Author a replacement in place around this body, add the same armature modifier and weight it to the existing bones. Export the module with the shared rig selected. Do not create a new rest pose for each outfit.

When importing optional module files in Three.js, remap their skin joints to the existing character's bone objects by name and retain their inverse bind matrices. Do not animate a second independent accessory skeleton. `riley-review.html` demonstrates this binding. Use `SkeletonUtils.clone` for separate players and clone materials before recoloring each player independently.

Keep hidden alternatives out of the active GLB: glTF does not carry Blender collection visibility as a reliable runtime customization switch. The optional collection is disabled in the source and exports into separate GLBs.

## Animation scope

The source contains an FK deform rig and the action `QA_poses_NOT_game_animation`: frame 1 A-pose, 20 ready check, 40 forehand check, 60 overhead check and 80 shuffle check. These are deformation inspection poses, not finished gameplay animation clips. The main GLB deliberately exports the neutral rig without this diagnostic action. The game loads this GLB through `src/athlete.ts`, clones its skeleton for each player, and maps the existing tactical poses onto its bones.

Finished idle/serve/dink/volley/backhand/run clips, IK animator controls and facial expression shape keys are not included. Current gameplay motion is generated from the simulation pose values. The shared humanoid chains support authoring full clips later. New garment designs and extreme poses should be checked against the body; they are not covered by the current Riley fit checks.

## Rebuild and validate

With Blender 4.5 installed, from the repository root:

```sh
blender --background --python art/characters/riley/build_riley.py
node art/characters/riley/validate.mjs
```

The build creates the `.blend`, all GLBs, the asset report and renders. Validation parses the actual GLBs with the game's Three.js version and verifies self-contained exports, normalized weights, valid bone indices, bind-pose stability, triangle budget, named slots and upright metre-scale bounds.

The render cameras and studio are excluded from all exports. All body and garment geometry uses flat shading; the eyes are flat rounded rectangular pills. Palette values are converted from sRGB to linear when authoring Blender materials so runtime color controls retain the intended hex values.

The bone names and hierarchy are preserved, with shorter lower-body rest transforms. Always use the regenerated glasses and visor exports with this model. Current hairstyle and garment selections still share the Riley base mesh; the full reference lineup and facial-expression library are visual direction, not additional exported modules.

Proportion refinement: head, face, hair and head accessories retain their exact dimensions. Torso and arm lengths are reduced by 28%; the leg section above the shoes uses 0.50 vertical scale instead of 0.78. Sneaker dimensions are preserved. Arm vertices shorten along their bone axes to retain chunky thickness; hands and paddle move with the revised wrist. All three exports share the shortened rest rig.

Detail refinement: the eyes use flat rounded-rectangle outlines, with straight sides and rounded corners. The complete head assembly is lifted 0.055 m and the neck extended to expose a small neck gap. Arms and legs retain the compact lengths and thickness, with three-segment rounded bevels; torso, head and shoe geometry are unchanged.

Face-size refinement: pill eyes enlarged 18% in width and height; smile and tongue enlarged 20% around the existing mouth center. Shapes and facial spacing are retained.

Outfit/paddle refinement: the skort hem and side stripes extend 2.25 cm lower (approximately 25% longer below the waistband). The paddle has parallel sides, matching top/bottom widths and small symmetric clipped corners, with a slightly taller rectangular face; its handle stays attached at the same wrist socket.

Sweatband refinement: cuffs extend approximately twice as far along each forearm, keeping the wrist opening and thickness unchanged.
