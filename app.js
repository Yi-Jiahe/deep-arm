import 'regenerator-runtime/runtime'
import * as THREE from 'three';
import * as tf from '@tensorflow/tfjs';

const rad2deg = 180/Math.PI;

let modelLoaded = false;
let model;

async function init(){
  model = await tf.loadGraphModel('model.json');
  // const model = await tf.loadLayersModel('model.json');

  modelLoaded = true;
  console.log('Model Loaded');
}

init();

function predict(x, y, z){
  let inputTensor = tf.tensor([[x, -z, y]]);
  let prediction = model.predict(inputTensor);
  inputTensor.dispose();
  let [theta1, phi1, theta2, phi2] = prediction.dataSync();
  prediction.dispose();
  // console.log(tf.memory());

  // console.log(theta1 + " " + phi1 + " " + theta2 + " " + phi2);
  return [theta1, phi1, theta2, phi2];
}

const canvas = document.querySelector('#c');
const renderer = new THREE.WebGLRenderer({canvas, alpha: true});

const fov = 75;
const aspect = 2;  // the canvas default
const near = 0.1;
const far = 20;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.y = 1
camera.position.z = 3;

const scene = new THREE.Scene();

{
  const color = 0xFFFFFF;
  const intensity = 1;
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(-1, 2, 4);
  scene.add(light);
}

{
  const grid_size = 20;
  const gridHelper = new THREE.GridHelper(grid_size, grid_size);
  scene.add(gridHelper);
}

const radius = 0.1;
const widthSegments = 12;
const heightSegments = 8;
const jointGeometry = new THREE.SphereBufferGeometry(
    radius, widthSegments, heightSegments);

const jointMaterial = new THREE.MeshPhongMaterial({color: 0xFF00FF});

const radiusTop = 0.1;
const radiusBottom = 0.1;
const height = 1;
const radialSegments = 12;
const cylinderHeightSegments =  6;
const linkGeometry = new THREE.CylinderBufferGeometry(
    radiusTop, radiusBottom, height, radialSegments, cylinderHeightSegments);

const linkMaterial = new THREE.MeshPhongMaterial({color: 0xFFFF00});

const armSegments = [];

const joint1 = new THREE.Object3D();
scene.add(joint1);

const cylinder1 = new THREE.Mesh(linkGeometry, linkMaterial);
joint1.add(cylinder1);
armSegments.push(cylinder1);
cylinder1.position.y = 0.5;

const joint2 = new THREE.Object3D();
joint1.add(joint2);
joint2.position.y = 1;

const cylinder2 = new THREE.Mesh(linkGeometry, linkMaterial);
joint2.add(cylinder2);
armSegments.push(cylinder2);
cylinder2.position.y = 0.5;

const hand = new THREE.Mesh(jointGeometry, jointMaterial);
joint2.add(hand);
hand.position.y = 1;

const target = new THREE.Mesh(jointGeometry, linkMaterial);
scene.add(target)
target.position.x = 0.3;
target.position.y = 0.6;
target.position.z = 0.9;
  
window.addEventListener('keydown', (e) => {
  if (e.defaultPrevented) {
    return; // Do nothing if event already handled
  }

  switch(e.code){
    case 'ArrowUp':
    case 'KeyW':
      target.position.z -= 0.1;
      break;
    case 'ArrowDown':
    case 'KeyS':
      target.position.z += 0.1;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      target.position.x -= 0.1;
      break;
    case 'ArrowRight':
    case 'KeyD':
      target.position.x += 0.1;
      break;
    case 'KeyQ':
      target.position.y += 0.1;
      break;
    case 'KeyE':
      target.position.y -= 0.1;
      break;
  }
  e.preventDefault();
});

function smooth_movement(joint, axis, desired_angle){
    const threshold = 0.05;
    const difference = joint.rotation[axis] - desired_angle;
    if (Math.abs(difference) >= threshold){
      joint.rotation[axis] -= (difference / Math.abs(difference)) * (threshold / 2) ;
    }
}

function resizeRendererToDisplaySize(renderer) {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {  // Update the renderer with the canvas size to prevent streching
    renderer.setSize(width, height, false);
  }
  return needResize;
}

function render(time) {
  time *= 0.001;  // convert time to seconds

  if (resizeRendererToDisplaySize(renderer)) {
    // Update camera aspect ratio based on window size to preserve object shape
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }

  if(modelLoaded){
    let {x, y, z} = target.position;
    console.log(target.position);
    document.getElementById('targetPosition').innerText = `Target at x=${x.toFixed(2)}, y=${y.toFixed(2)}, z=${z.toFixed(2)}`
    let [theta1, phi1, theta2, phi2] = predict(x, y, z);
    document.getElementById('angles').innerText = 'Joint Angles:\n' 
    + `Link 1 Yaw = ${(theta1*rad2deg).toFixed(1)+String.fromCharCode(176)},\n`
    + `Link 1 Pitch = ${(phi1*rad2deg).toFixed(1)+String.fromCharCode(176)},\n`
    + `Link 2 Yaw = ${(theta2*rad2deg).toFixed(1)+String.fromCharCode(176)},\n`
    + `Link 2 Pitch = ${(phi2*rad2deg).toFixed(1)+String.fromCharCode(176)}`
    smooth_movement(joint1, 'y', theta1);
    smooth_movement(joint1, 'z', phi1);
    smooth_movement(joint2, 'y', theta2);
    smooth_movement(joint2, 'z', phi2);
  }

  renderer.render(scene, camera);

  requestAnimationFrame(render);
}
requestAnimationFrame(render);
