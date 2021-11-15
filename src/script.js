import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

/**
 * 
 * Theme
 * 
 */

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

// Canvas selector
const canvas = document.querySelector('canvas.canvasGL')

// Initialize Scene
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

/** Set scene background color */
// TODO add skybox
scene.background = new THREE.Color( Theme.backgroundColor );


/**
 *  Create Perspective Camera
 */


const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 1, 1000)
camera.position.set( 0, 0.8, 0 );
camera.lookAt(new THREE.Vector3(0,0,0));
scene.add(camera)


/**
 * 
 * 
 * Character controls helper variables.
 * We create these vectors to calculate camera offset and adjust its position
 * see tick function
 *  
 * */ 

const character_position = new THREE.Vector3;
const camera_position = new THREE.Vector3;
const tail_position = new THREE.Vector3;
const camera_offset = new THREE.Vector3;

const distance = 4;
let velocity = 0.0; // velocity provides smooth speed gain
let speed = 0.0; // default idle speed

// Helper objects to provide camera movements
let tail =  new THREE.Object3D;
let follower = new THREE.Object3D;

tail.position.y = 0.5
tail.position.z = -distance;

follower.add(camera) 

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
        /** Scale character  */
        gltf.scene.scale.set(1, 1, 1)

        /** Make scene and animation available outside the scope */
        character = gltf.scene 
        characterAnimation = gltf.animations 

        /** Apply tail object to the character */
        character.add(tail) 

        /** Enable shadows */
        gltf.scene.castShadow = true 
        gltf.scene.receiveShadow = true

        scene.add(gltf.scene)

        /** Set camare to look at the character by default */
        camera.lookAt(character.position);

        // Get animations
        mixer = new THREE.AnimationMixer(character)
        action = {
            idle: mixer.clipAction(characterAnimation[0]),
            run: mixer.clipAction(characterAnimation[1]),
            walk: mixer.clipAction(characterAnimation[2]),
            back: mixer.clipAction(characterAnimation[3])
        }
        prevAnim = "idle"; // set default idle animation
        action.idle.play() // play animation
    }
)

/**
 * Floor
 */
 const pathToGrassTexture = (texture) => `/textures/floor/${texture}.jpg` 
 
 /** Load textures */
 const textureLoader = new THREE.TextureLoader()
 const repeat = 40;
 const map = textureLoader.load(pathToGrassTexture("GroundForest003_COL_VAR1_3K"))
 map.wrapS = THREE.RepeatWrapping
 map.wrapT = THREE.RepeatWrapping
 map.repeat.set(repeat, repeat)

 const displacementMap = textureLoader.load(pathToGrassTexture("GroundForest003_DISP_3K"))
 displacementMap.wrapS = THREE.RepeatWrapping
 displacementMap.wrapT = THREE.RepeatWrapping
 displacementMap.repeat.set(repeat, repeat)

 const normalMap = textureLoader.load(pathToGrassTexture("GroundForest003_NRM_3K"))
 normalMap.wrapS = THREE.RepeatWrapping
 normalMap.wrapT = THREE.RepeatWrapping
 normalMap.repeat.set(repeat, repeat)

 const roughnessMap = textureLoader.load(pathToGrassTexture("GroundForest003_ROUGH_3K"))
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

/** cast shadows in wider zone */
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


// Orbit Controls (vertical mouse control)
// TODO add joystick mobile control
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

//** Tick function to update */
const tick = () =>
{
    /** Calculate shades */
    updateAllMaterials()

    /** Count elapsed time */
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime

    /** Update animation mixer on each frame */
    if(mixer)
    {
        mixer.update(deltaTime)
    }

    /*** Character controls  */

    /** Running forwards */
    if (keyboard[87] && keyboard[16]) {
        speed = 0.2;

        if(action.run){
            if(prevAnim != "run")
             crossfadeAnimation(action["run"])

             prevAnim = 'run'
        }
      }
      
     /** Walking forward */
    if (keyboard[87] && !keyboard[16]) {
        speed = 0.09;

        if(action.walk){
            if(prevAnim != "walk")
                crossfadeAnimation(action["walk"])
                 
            prevAnim = 'walk'
        }
    }

     /** Walking backwards */
    if (keyboard[83]) {
        speed = -0.09;

        if(action.walk){
            if(prevAnim != "back")
              crossfadeAnimation(action["back"])
        
            prevAnim = 'back'
        }
    }

    /** Ilde state */
    if (!keyboard[87] && !keyboard[83]) {
        speed = 0;
        if(action.idle && prevAnim != "idle"){
            if(prevAnim != "idle")
             crossfadeAnimation(action["idle"])

             prevAnim = "idle"
        }
      }


      /* Turn character */
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


        /**
         * 
         *  Move character along Z axis
         */
   
        velocity += (speed - velocity) * .3;

        character.translateZ(velocity);

       
        /** 
         * Smoothly move character position Vector3 to actiual character position 
         * 
         */
        character_position.lerp(character.position, 0.4);

        /**
         * Set default camera position Vector3 to the follower
         */
        camera_position.copy(follower.position);

        /**
         * Set tail_position Vector3 to absolute tail position
         */
        tail_position.setFromMatrixPosition(tail.matrixWorld);


        /*  
        *
        *    Calculate a offset camera vector, based on the character's 
        *   position. Offset represented by the direction vector3 from
        *   the camera (follower) to the character 
        */

        camera_offset.copy( character_position ).sub( camera_position ).normalize();
        const distanceDifference = character_position.distanceTo( camera_position ) - distance;
        follower.position.addScaledVector( camera_offset, distanceDifference );


        /**
         * Lerp camera to the tail position
         */
        follower.position.lerp(tail_position, 0.02);
       
        /**
         * Update position of the character 
         * to point camera
         */
  
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