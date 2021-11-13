import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

const Theme = {
    backgroundColor: 0xffffff
};

/**
 * Sizes
 */
 const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

// Canvas
const canvas = document.querySelector('canvas.canvasGL')

// Scene
const scene = new THREE.Scene()
const updateAllMaterials = () =>
{
    scene.traverse((child) =>
    {
        if(child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial)
        {
            child.material.needsUpdate = true
            child.castShadow = true
            child.receiveShadow = true
        }
    })
}

scene.background = new THREE.Color( Theme.backgroundColor );

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 1, 1000)
camera.position.set( 0, 0.8, 0 );
camera.lookAt(new THREE.Vector3(0,0,0));
scene.add(camera)


/**
 * Character controls helper.
 * These helpers provide smooth camera movement through proxy objects.
 * 
 *  
 * */ 

let t = new THREE.Vector3;
let dir = new THREE.Vector3;
let a = new THREE.Vector3;
let b = new THREE.Vector3;
const distance = 5.2;
let velocity = 0.0;
let speed = 0.0;
let tail =  new THREE.Object3D;
let follower = new THREE.Object3D;

follower.position.y = 0.5
follower.position.z = -distance;

tail.add(camera)


/** Initialize keyboard and add event listeners to control character */

let keyboard = {};

function keyDown(event) {

  keyboard[event.keyCode] = true;
}

function keyUp(event){
	keyboard[event.keyCode] = false;
}

window.addEventListener('keydown', keyDown);
window.addEventListener('keyup', keyUp);


/**
 *  Loading model
 */

const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/draco/')

const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

let mixer = null
let character, characterAnimation = [], action = {}, prevAnim = 'idle';

gltfLoader.load(
    '/models/Character/Character.glb',
    (gltf) =>
    {
        gltf.scene.scale.set(1, 1, 1)
        character = gltf.scene // make scene available outside this scope
        characterAnimation = gltf.animations // make animations available outside this scope
        character.add(follower) // apply follower object to model
        gltf.scene.castShadow = true //enable shadows
        gltf.scene.receiveShadow = true

        scene.add(gltf.scene)

        camera.lookAt(character.position); // make camera look at character be default

        // Se animations
        mixer = new THREE.AnimationMixer(character)
        action = {
            idle: mixer.clipAction(characterAnimation[0]),
            run: mixer.clipAction(characterAnimation[1]),
            walk: mixer.clipAction(characterAnimation[2]),
            back: mixer.clipAction(characterAnimation[3])
        }
        prevAnim = "idle"; //default idle animation
        action.idle.play()
    }
)

/**
 * Floor
 */
 const pathToBlackHexagonGrassTexture = (texture) => `/textures/floor/${texture}.jpg` 
 
 /** Load textures */
 const textureLoader = new THREE.TextureLoader()
 const repeat = 40;
 const map = textureLoader.load(pathToBlackHexagonGrassTexture("GroundForest003_COL_VAR1_3K"))
 map.wrapS = THREE.RepeatWrapping
 map.wrapT = THREE.RepeatWrapping
 map.repeat.set(repeat, repeat)

 const displacementMap = textureLoader.load(pathToBlackHexagonGrassTexture("GroundForest003_DISP_3K"))
 displacementMap.wrapS = THREE.RepeatWrapping
 displacementMap.wrapT = THREE.RepeatWrapping
 displacementMap.repeat.set(repeat, repeat)

 const normalMap = textureLoader.load(pathToBlackHexagonGrassTexture("GroundForest003_NRM_3K"))
 normalMap.wrapS = THREE.RepeatWrapping
 normalMap.wrapT = THREE.RepeatWrapping
 normalMap.repeat.set(repeat, repeat)

 const roughnessMap = textureLoader.load(pathToBlackHexagonGrassTexture("GroundForest003_ROUGH_3K"))
 roughnessMap.wrapS = THREE.RepeatWrapping
 roughnessMap.wrapT = THREE.RepeatWrapping
 roughnessMap.repeat.set(repeat, repeat)

 const floor = {}

 const floor_material = new THREE.MeshStandardMaterial({
    map,
    normalMap,
    roughnessMap,
    displacementMap,
    normalScale: new THREE.Vector2(floor.normalScale, floor.normalScale),
    displacementScale: 0.1,
    roughness: 1
})

floor.geometry =  new THREE.PlaneGeometry(100, 100) //create floor geometry 100 x 100 size
floor.material = floor_material;

floor.geometry.setAttribute('uv2', new THREE.Float32BufferAttribute(floor.geometry.attributes.uv.array, 10))
floor.mesh= new THREE.Mesh(
    floor.geometry,floor.material
 )
floor.mesh.receiveShadow = true
floor.mesh.position.y=0
floor.mesh.rotation.x = - Math.PI * 0.5

scene.add(floor.mesh)

/**
 * Lights
 */

const ambientLight = new THREE.AmbientLight(0xffffff, 1)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.6)

/**  make wider light to cast shadow in bigger zone */
const lightDistance = 40;
directionalLight.castShadow = true;
directionalLight.shadow.camera.left = - lightDistance;
directionalLight.shadow.camera.right = lightDistance;
directionalLight.shadow.camera.top = lightDistance;
directionalLight.shadow.camera.bottom = - lightDistance;
directionalLight.shadow.camera.near = 1;
directionalLight.shadow.camera.far = 2000;

directionalLight.position.set(-5, 35, 100)
scene.add(directionalLight)


// Orbit Controls
const controls = new OrbitControls(camera, canvas)
controls.target.set(0, 0.75, 0)
controls.enableDamping = true

/**
 * Renderer
 */
 const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true
})
renderer.physicallyCorrectLights = true
renderer.outputEncoding = THREE.sRGBEncoding
renderer.toneMapping = THREE.LinearToneMapping
renderer.toneMappingExposure = 2
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))



/**
 * Animate
 */
const clock = new THREE.Clock()
let previousTime = 0

/** 
 * 
 * Crossfade action allows us
 * smoothly switch between animations
 * 
 * 
 */

function crossfadeAnimation(newAction){
    newAction.reset()
    newAction.play()
    newAction.crossFadeFrom(action[prevAnim], 0.3)
}

const tick = () =>
{
    updateAllMaterials()
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime

    // Model animation
    if(mixer)
    {
        mixer.update(deltaTime)
    }

    /*** Character control */

    // Running
    if (keyboard[87] && keyboard[16]) {
        speed = 0.2;

        if(action.run){
            if(prevAnim != "run")
             crossfadeAnimation(action["run"])

             prevAnim = 'run'
        }
      }
      
      //Walking
    if (keyboard[87] && !keyboard[16]) {
        speed = 0.09;

        if(action.walk){
            if(prevAnim != "walk")
                crossfadeAnimation(action["walk"])
                 
            prevAnim = 'walk'
        }
    }

       //Walking backwards
    if (keyboard[83]) {
        speed = -0.09;

        if(action.walk){
            if(prevAnim != "back")
              crossfadeAnimation(action["back"])
        
            prevAnim = 'back'
        }
    }

        //Stopped
    if (!keyboard[87] && !keyboard[83]) {
        speed = 0;
        if(action.idle && prevAnim != "idle"){
            if(prevAnim != "idle")
             crossfadeAnimation(action["idle"])

             prevAnim = "idle"
        }
      }


      /* Turns */
      if (keyboard[65]) {
       if(character){
        character.rotateY(0.05);
       }
      }
      if (keyboard[68]) {
       if(character){
        character.rotateY(-0.05);
       }
      }

      if(character){
        velocity += (speed - velocity) * .3;
        character.translateZ(velocity);
  
        a.lerp(character.position, 0.4);
        b.copy(tail.position);
  
        dir.copy( a ).sub( b ).normalize();
        const dis = a.distanceTo( b ) - distance;
        tail.position.addScaledVector( dir, dis );
        tail.position.lerp(t, 0.02);
        t.setFromMatrixPosition(follower.matrixWorld);
  
        const position = new THREE.Vector3(character.position.x, 2.2, character.position.z)
        camera.lookAt( position )
      }

    
     

    // Update orbit controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()