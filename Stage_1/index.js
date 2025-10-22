import * as THREE from './libs/three.module.js';
import * as CONTROL from './libs/OrbitControls.js';
import {Ground} from "./Ground.js";
import {Tree} from "./obstacles/Tree.js";
import {OldCar} from "./3DCar.js";
import {Obstacles} from "./obstacles/Obstacles.js";
import {wall} from "./obstacles/wall.js";

let GameState;
let scene , camera, renderer,controls,car3d , obstacle = [];
let OldX = 0;
let collectables = [];
let miniMapCamera;
let miniMapSize = { width: 200, height: 200 };
let carArrow;

// 🧮 Score UI
let score = 0;
let scoreDisplay = document.createElement('div');
scoreDisplay.style.position = 'absolute';
scoreDisplay.style.top = '20px';
scoreDisplay.style.left = '20px';
scoreDisplay.style.color = 'white';
scoreDisplay.style.fontSize = '24px';
scoreDisplay.style.fontFamily = 'monospace';
scoreDisplay.innerHTML = `Score: ${score}`;
document.body.appendChild(scoreDisplay);

// //min map oveerlay
// const miniMapBorder = document.createElement('div');
// miniMapBorder.style.position = 'absolute';
// miniMapBorder.style.bottom = '20px';
// miniMapBorder.style.right = '20px';
// miniMapBorder.style.width = miniMapSize.width + 'px';
// miniMapBorder.style.height = miniMapSize.height + 'px';
// miniMapBorder.style.border = '2px solid white';
// miniMapBorder.style.pointerEvents = 'none';
// document.body.appendChild(miniMapBorder);

const StartButton = document.getElementById("play_game"); // Get the Start Button
StartButton.addEventListener('click',() => {
        let menu = document.getElementById("menu"); // Get the Menu Dom
        menu.style.display = "none" // Hide the Menu
        CreateEnvironment(); // Create Environment
        GameState = true; // Game is Playable
});


let resume = document.getElementById("resume_game"); // Get the resume Button DOM
let PauseMenu = document.getElementById("pause_menu"); // get the PauseMenu Button DOM
    resume.addEventListener('click',() => {
        PauseMenu.style.display = "none" // Hide the pause menu
        car3d.returnGame(); // returns the GameState to True
    });


const MiniMapSetup = () => {
    // Orthographic top-down camera
    const aspect = window.innerWidth / window.innerHeight;
    const d = 10; // visible area size (adjust as needed)

    miniMapCamera = new THREE.OrthographicCamera(
        -d * aspect, d * aspect, d, -d, 1, 1000
    );

    // Position high above, looking down the Y-axis
    miniMapCamera.position.set(0, 100, 0);

    // Rotate so +X (your forward direction) points up on the minimap
    miniMapCamera.rotation.x = -Math.PI / 2; // look straight down
    miniMapCamera.rotation.z = -Math.PI / 2; // rotate so +X is “up”
};


const CreateEnvironment = () => {

    scene = new THREE.Scene();

    CameraSetUp();      // Creates the Camera
    MiniMapSetup();     //minmap camers 
    LightSetup();       // Adds the Lights to the Scene
    RendererSetUp();    // Sets up the Renderer
    ControlsSetUp();    // Initialises the Controls for thr Player

    window.addEventListener('resize',()=>{
        renderer.setSize(window.innerWidth,window.innerHeight);
        camera.aspect = window.innerWidth/window.innerHeight;
        camera.updateProjectionMatrix();
    });

    AddMiscObjects();

}

const animate = (time) =>{

    if(GameState && car3d.isPlayable()){
        car3d.animateCar(time , obstacle);
        OptimiseObstacles();
    }

    // 🗺️ Update minimap camera to follow the car
    if (car3d && car3d._car) {
        const carPos = car3d._car.position;

        // Keep minimap above the car and follow it
        miniMapCamera.position.x = carPos.x;
        // miniMapCamera.position.z = carPos.z;
    }
    if (car3d && car3d._car && carArrow) {
        const car = car3d._car;
        carArrow.position.copy(car.position).add(new THREE.Vector3(0, 5, 0)); // slightly above
    }

    renderer.render(scene,camera);

    // Render minimap
    const { width, height } = renderer.getSize(new THREE.Vector2());
    renderer.clearDepth(); // clear depth buffer for second pass

    // Bottom-right corner of screen
    renderer.setViewport(width - miniMapSize.width - 20, 20, miniMapSize.width, miniMapSize.height);
    renderer.setScissor(width - miniMapSize.width - 20, 20, miniMapSize.width, miniMapSize.height);
    renderer.setScissorTest(true);

    renderer.render(scene, miniMapCamera);

    // Reset
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, width, height);

    

    // ✅ Collectable check
    for (let i = collectables.length - 1; i >= 0; i--) {
        const sphere = collectables[i];
        if (car3d && car3d._car) {
        const playerBox = new THREE.Box3().setFromObject(car3d._car);
        const sphereBox = new THREE.Box3().setFromObject(sphere);
        if (playerBox.intersectsBox(sphereBox)) {
            scene.remove(sphere);
            collectables.splice(i, 1);
            score++;
            scoreDisplay.innerHTML = `Score: ${score}`;
        }
        }
    }
}

const LoadCar = () => {
    const carEngine = document.getElementById("engine");
    car3d = new OldCar(carEngine, camera);
    car3d.getCar().then(carObj => {
        scene.add(carObj);
        const carMapIconMaterial = new THREE.SpriteMaterial({ color: 0xff0000 });
        carArrow = new THREE.Sprite(carMapIconMaterial);
        carArrow.scale.set(2, 2, 1);
        scene.add(carArrow);

    });
}

const genTree = (dir = 1) =>{

    let tree = new Tree("light");

    for(let i = 0;i < 500;i++){

        let j = -520;
        let clone_tree = tree._group.clone();
        clone_tree.scale.set(3,3,3);
        clone_tree.position.x += i + j - 10;
        clone_tree.position.y += 5;
        if(i % 2 === 0) {
            clone_tree.position.z += dir * 10;
        }
        else{
            clone_tree.position.z += dir * 9;
        }
        scene.add(clone_tree);

    }
}

const genTreeDark = (dir = 1) =>{

    let tree = new Tree("dark");

    for(let i = 0;i < 500;i++){

        let j = -20;
        let clone_tree = tree._group.clone();

        clone_tree.scale.set(3,3,3);
        clone_tree.position.x += i + j - 10;
        clone_tree.position.y += 5;

        if(i % 2 === 0) {
            clone_tree.position.z += dir * 10;
        }
        else{
            clone_tree.position.z += dir * 9;
        }
        scene.add(clone_tree);

    }
}



const LightSetup = () =>{

    let ambient = new THREE.AmbientLight(0xFFFFFF); //some ambient lighting to reveal the smoke
    scene.add(ambient);

    const spotLight = new THREE.SpotLight( 0xffffff );
    spotLight.position.set( 100, 100, 100 );
    scene.add( spotLight );

    const spotLightRed = new THREE.SpotLight( 0xff0000 );
    spotLight.position.set( 0, 5, 0 );
    scene.add( spotLightRed );


    let keyLight = new THREE.DirectionalLight(new THREE.Color('hsl(38,10%,84%)'), 1.0);
    keyLight.position.set(-500, 0, 100);

    let fillLight = new THREE.DirectionalLight(new THREE.Color('hsl(240,11%,93%)'), 0.75);
    fillLight.position.set(500, 0, 100);

    let backLight = new THREE.DirectionalLight(0xffffff, 1.0);
    backLight.position.set(100, 0, -100).normalize();

    let moon = new THREE.DirectionalLight(new THREE.Color('hsl(38,10%,84%)'), 1.0);
    keyLight.position.set(-500, 50, 0);

    scene.add(moon);
    scene.add(keyLight);
    scene.add(fillLight);
    scene.add(backLight);
}

const setupKeyControls = () => {
    document.onkeydown = function(e) {
        car3d.bindKeyPress(e.key, true);
    }

    document.onkeyup = function (e) {
        car3d.bindKeyPress(e.key, false);
    }
}

function CreateSky(){
    const loader = new THREE.TextureLoader();
    scene.background = loader.load('./textures/front.png');
}
const CameraSetUp = () =>{
    camera = new THREE.PerspectiveCamera(50,window.innerWidth/window.innerHeight,0.1,200);
    camera.position.x = -513;
    camera.position.y += 0.9;
    camera.position.z = -3;
}

const RendererSetUp = () => {
    renderer = new THREE.WebGLRenderer({antialias : true});
    renderer.setSize(window.innerWidth,window.innerHeight);
    renderer.setAnimationLoop(animate);
    document.body.appendChild(renderer.domElement);
}
const ControlsSetUp = () =>{
    controls = new CONTROL.OrbitControls(camera,renderer.domElement);
    // to disable zoom
    controls.enableZoom = false;
    // to disable rotation
    controls.enableRotate = false;
    // to disable pan
    controls.enablePan = false;
}

// 💎 Collectables
function generateCollectables() {
  const sphereGeo = new THREE.SphereGeometry(0.4, 16, 16);
  const sphereMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0xffff00,
    emissiveIntensity: 1,
  });

  for (let i = 0; i < 20; i++) {
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);

    // X → forward direction (runway)
    // Z → side-to-side (lane)
    sphere.position.set(
      camera.position.x + 100 + i * 50,         // ahead along +X
      1,                                       // height above ground
      (Math.random() - 0.5) * 14.6              // stays within -7.3 to +7.3
    );

    scene.add(sphere);
    collectables.push(sphere);
  }
}

const AddMiscObjects = () => {
    let floor = new Ground();
    scene.add(floor.BuildFloor);

    genTree();
    genTree(-1);
    genTreeDark(1)
    genTreeDark(-1);
    CreateSky();
    generateCollectables();

    LoadCar(); //loads the 3d Model
    setupKeyControls(); // movement

    let obj_array = new Obstacles();
    obstacle = obj_array.get_Obstacles(); // assign global obstacle array
    scene.add(obj_array.GetObstacles);

    let test = new wall();
    let gate = test.gen_Gate();
    gate.position.x = 480;
    gate.position.y = 3.5;
    scene.add(gate);
}

const OptimiseObstacles = () =>{
    if(car3d){
        if(Math.abs(OldX - car3d._car.position.x) > 25){
            obstacle.pop();
            OldX = car3d._car.position.x;
        }

        if (car3d._car.position.x > 420){
            scene.fog = new THREE.FogExp2(0x000000,0.02);
        }
    }
}