var World = require('./world');
var CameraControls = require('./camera-controls');
var CfgServer = require('./cfg-server');
var AgentServer = require('./agent-server');

// global state & behaviors
window.world = new World(); // a whole new woooooorld

// init
setup();
tick();

function setup() {
	// setup local
	local.logAllExceptions = true;
	local.schemes.register('local', local.schemes.get('httpl')); // use local://

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
		var agentEl = local.util.findParentNode.byClass(e.target, 'agent');
		if (!agentEl) throw "Request originated from outside of an agent in the world";
		agent = world.getAgent(agentEl);
		agent.dispatch(e.detail);
	});

	// setup services
	var configServer = new CfgServer({ domain: 'config' });
	local.addServer('config', configServer);
	local.addServer('agents', new AgentServer());

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