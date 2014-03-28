var camera, scene, renderer;
var cameraControls;

var worldsphere;
var objects = [];

init();
tick();

function init() {
	// setup camera
	camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
	camera.position.z = 3000;

	// setup scene
	scene = new THREE.Scene();

	// :TEST:
	var el = document.createElement('div');
	el.className = 'agent';
	el.innerText = 'Agent 1';

	var object = new THREE.CSS3DObject( el );
	scene.add( object );

	// setup renderer
	renderer = new THREE.CSS3DRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.domElement.style.position = 'absolute';
	document.body.appendChild(renderer.domElement);
	window.addEventListener('resize', onWindowResize, false);

	// setup controls
	cameraControls = new (require('./controls').CameraControls)(camera, renderer.domElement);
	cameraControls.minDistance = 100;
	cameraControls.maxDistance = 6000;
	cameraControls.noEdgePan = true;
	// cameraControls.addEventListener( 'change', render );
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