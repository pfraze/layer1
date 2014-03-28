var world = require('./world');
var controls = require('./controls');

// init
setup();
tick();

// expose some globals
window.world = world;

// main state & behaviors

var camera, scene, renderer;
var cameraControls, worldControls;

function setup() {
	// setup camera
	camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
	camera.position.z = 3000;

	// setup scene
	scene = new THREE.Scene();
	world.setup(scene);

	// setup renderer
	renderer = new THREE.CSS3DRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.domElement.style.position = 'absolute';
	document.body.appendChild(renderer.domElement);
	window.addEventListener('resize', onWindowResize, false);

	// setup controls
	cameraControls = new controls.Camera(camera, renderer.domElement);
	cameraControls.minDistance = 100;
	cameraControls.maxDistance = 6000;
	cameraControls.noEdgePan = true;
	// cameraControls.addEventListener( 'change', render );
	worldControls = new controls.World(world, renderer.domElement);
}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);

	render();

}

function tick() {
	requestAnimationFrame(tick);
	cameraControls.update();
	render();
}

function render() {
	renderer.render(scene, camera);
}