var World = require('./world');
var CameraControls = require('./camera-controls');
var WorkerProxy = require('./worker-proxy');
var CfgServer = require('./cfg-server');
var EntityServer = require('./entity-server');

// global state & behaviors
window.world = new World(); // a whole new woooooorld

// init
setup();
tick();

function setup() {
	// setup local
	local.logAllExceptions = true;

	// log all traffic
	local.setDispatchWrapper(function(req, res, dispatch) {
		var res_ = dispatch(req, res);
		res_.then(
			function() { console.log(req, res); },
			function() { console.error(req, res); }
		);
	});

	// request events
	try { local.bindRequestEvents(document.body); }
	catch (e) { console.error('Failed to bind body request events.', e); }
	document.body.addEventListener('request', function(e) {
		var entityEl = local.util.findParentNode.byClass(e.target, 'ent');
		if (!entityEl) throw "Request originated from outside of an entity in the world";
		entity = world.getEntity(entityEl);
		entity.dispatch(e.detail);
	});

	// setup services
	var configServer = new CfgServer({ domain: 'config' });
	local.addServer('worker-bridge', new WorkerProxy());
	local.addServer('config', configServer);
	local.addServer('ents', new EntityServer());

	// setup camera
	window.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
	camera.position.z = 1500;

	// setup scene
	window.scene = new THREE.Scene();
	world.setup(scene, configServer);

	// setup renderer
	window.renderer = new THREE.CSS3DRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.domElement.style.position = 'absolute';
	document.getElementById('world-div').appendChild(renderer.domElement);
	window.addEventListener('resize', onWindowResize, false);

	// setup controls
	window.cameraControls = new CameraControls(camera, renderer.domElement);
	cameraControls.minDistance = 100;
	cameraControls.maxDistance = 6000;
	cameraControls.noEdgePan = true;
	cameraControls.noKeyboardPan = true;
	cameraControls.staticMousePan = true;
	cameraControls.addEventListener( 'change', render );
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
	TWEEN.update();
	render();
}

function render() {
	renderer.render(scene, camera);
}