;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Based on TrackballControls.js
 * @author Paul Frazee
 * @author Eberhard Graether / http://egraether.com/
 * @author Mark Lundin 	/ http://mark-lundin.com
 */

var CameraControls = function ( object, domElement ) {

	var _this = this;

	this.object = object;
	this.domElement = ( domElement !== undefined ) ? domElement : document;

	// API

	this.enabled = true;

	this.screen = { left: 0, top: 0, width: 0, height: 0 };

	this.zoomSpeed = 1.2;
	this.panSpeed = 0.5;

	this.noZoom = false;
	this.noPan = false;
	this.noEdgePan = false;

	this.staticMoving = false;
	this.dynamicDampingFactor = 0.2;

	this.minDistance = 0;
	this.maxDistance = Infinity;

	this.panThreshold = 0.05;

	var KEY_LEFT = 37;
	var KEY_UP = 38;
	var KEY_RIGHT = 39;
	var KEY_DOWN = 40;
	var _keysDown = {};

	// internals

	this.target = new THREE.Vector3();

	var lastPosition = new THREE.Vector3();

	var _eye = new THREE.Vector3(),

	_zoomStart = new THREE.Vector2(),
	_zoomEnd = new THREE.Vector2(),

	_touchZoomDistanceStart = 0,
	_touchZoomDistanceEnd = 0,

	_isPanning = false,
	_panStart = new THREE.Vector2(),
	_panEnd = new THREE.Vector2(),
	_panAmt = new THREE.Vector2();

	// for reset

	this.target0 = this.target.clone();
	this.position0 = this.object.position.clone();
	this.up0 = this.object.up.clone();

	// events

	var changeEvent = { type: 'change' };
	var startEvent = { type: 'start'};
	var endEvent = { type: 'end'};


	// methods

	this.handleResize = function () {

		if ( this.domElement === document ) {

			this.screen.left = 0;
			this.screen.top = 0;
			this.screen.width = window.innerWidth;
			this.screen.height = window.innerHeight;

		} else {

			this.screen = this.domElement.getBoundingClientRect();
			// adjustments come from similar code in the jquery offset() function
			var d = this.domElement.ownerDocument.documentElement
			this.screen.left += window.pageXOffset - d.clientLeft
			this.screen.top += window.pageYOffset - d.clientTop

		}

	};

	this.getMouseOnScreen = function ( pageX, pageY, vector ) {

		return vector.set(
			( pageX - _this.screen.left ) / _this.screen.width,
			( pageY - _this.screen.top ) / _this.screen.height
		);

	};

	this.zoomCamera = function () {

		var factor = 1.0 + ( _zoomEnd.y - _zoomStart.y ) * _this.zoomSpeed;

		if ( factor !== 1.0 && factor > 0.0 ) {

			_eye.multiplyScalar( factor );

			if ( _this.staticMoving ) {

				_zoomStart.copy( _zoomEnd );

			} else {

				_zoomStart.y += ( _zoomEnd.y - _zoomStart.y ) * this.dynamicDampingFactor;

			}

		}

	};

	this.panCamera = (function(){

		var panAmt = new THREE.Vector2(),
			objectUp = new THREE.Vector3(),
			pan = new THREE.Vector3();

		return function () {

			if (_isPanning) {
				panAmt.copy( _panEnd ).sub( _panStart );
			} else {
				panAmt.copy(_panAmt);
			}


			if (_keysDown[KEY_LEFT])  { panAmt.x -= 0.05; }
			if (_keysDown[KEY_RIGHT]) { panAmt.x += 0.05; }
			if (_keysDown[KEY_UP])    { panAmt.y -= 0.05; }
			if (_keysDown[KEY_DOWN])  { panAmt.y += 0.05; }

			if ( panAmt.lengthSq() ) {

				panAmt.multiplyScalar( _eye.length() * _this.panSpeed );

				pan.copy( _eye ).cross( _this.object.up ).setLength( panAmt.x );
				pan.add( objectUp.copy( _this.object.up ).setLength( panAmt.y ) );

				_this.object.position.add( pan );
				_this.target.add( pan );

				if ( _this.staticMoving ) {

					_panStart.copy( _panEnd );

				} else {

					_panStart.add( panAmt.subVectors( _panEnd, _panStart ).multiplyScalar( _this.dynamicDampingFactor ) );

				}

			}
		}

	}());

	this.checkDistances = function () {

		if ( !_this.noZoom || !_this.noPan ) {

			if ( _eye.lengthSq() > _this.maxDistance * _this.maxDistance ) {

				_this.object.position.addVectors( _this.target, _eye.setLength( _this.maxDistance ) );

			}

			if ( _eye.lengthSq() < _this.minDistance * _this.minDistance ) {

				_this.object.position.addVectors( _this.target, _eye.setLength( _this.minDistance ) );

			}

		}

	};

	this.update = function () {

		_eye.subVectors( _this.object.position, _this.target );

		if ( !_this.noZoom ) {

			_this.zoomCamera();

		}

		if ( !_this.noPan ) {

			_this.panCamera();

		}

		_this.object.position.addVectors( _this.target, _eye );

		_this.checkDistances();

		_this.object.lookAt( _this.target );

		if ( lastPosition.distanceToSquared( _this.object.position ) > 0 ) {

			_this.dispatchEvent( changeEvent );

			lastPosition.copy( _this.object.position );

		}

	};

	this.reset = function () {

		_state = STATE.NONE;
		_prevState = STATE.NONE;

		_this.target.copy( _this.target0 );
		_this.object.position.copy( _this.position0 );
		_this.object.up.copy( _this.up0 );

		_eye.subVectors( _this.object.position, _this.target );

		_this.object.lookAt( _this.target );

		_this.dispatchEvent( changeEvent );

		lastPosition.copy( _this.object.position );

	};

	// listeners

	function keydown( event ) {

		if ( _this.enabled === false ) return;

		_keysDown[event.which] = true;

	}

	function keyup( event ) {

		if ( _this.enabled === false ) return;

		_keysDown[event.which] = false;
	}

	function mousedown(event) {
		if (event.which == 2) { // middle click
			_this.getMouseOnScreen(event.pageX, event.pageY, _panStart);
			_panEnd.copy(_panStart);
			_isPanning = true;
		}
	}
	function mouseup(event) {
		if (event.which == 2) { // middle click
			_isPanning = false;
		}
	}

	var mousepos = new THREE.Vector2();
	function mousemove( event ) {

		if ( _this.enabled === false ) return;

		// get a normalized position
		_this.getMouseOnScreen( event.pageX, event.pageY, mousepos );

		// pan if panning due to mode
		if (_isPanning) {
			_panEnd.copy(mousepos);
		} else if (!_this.noEdgePan) {
			// pan if at an edge
			if (mousepos.x <= _this.panThreshold) {
				_panAmt.x = (mousepos.x - _this.panThreshold);
			} else if (1 - mousepos.x <= _this.panThreshold) {
				_panAmt.x = (_this.panThreshold - (1 - mousepos.x));
			} else {
				_panAmt.x = 0;
			}
			if (mousepos.y <= _this.panThreshold) {
				_panAmt.y = (mousepos.y - _this.panThreshold);
			} else if (1 - mousepos.y <= _this.panThreshold) {
				_panAmt.y = (_this.panThreshold - (1 - mousepos.y));
			} else {
				_panAmt.y = 0;
			}
		}
	}

	function mouseout(event) {
		_panAmt.x = _panAmt.y = 0;
	}

	function mousewheel( event ) {

		if ( _this.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		var delta = 0;

		if ( event.wheelDelta ) { // WebKit / Opera / Explorer 9

			delta = event.wheelDelta / 40;

		} else if ( event.detail ) { // Firefox

			delta = - event.detail / 3;

		}

		_zoomStart.y += delta * 0.01;
		_this.dispatchEvent( startEvent );
		_this.dispatchEvent( endEvent );

	}

	this.domElement.addEventListener( 'mousedown', mousedown, false );
	this.domElement.addEventListener( 'mouseup', mouseup, false );
	this.domElement.addEventListener( 'mousemove', mousemove, false );
	this.domElement.addEventListener( 'mouseout', mouseout, false );
	this.domElement.addEventListener( 'mousewheel', mousewheel, false );
	this.domElement.addEventListener( 'DOMMouseScroll', mousewheel, false ); // firefox

	window.addEventListener( 'keydown', keydown, false );
	window.addEventListener( 'keyup', keyup, false );

	this.handleResize();

};

CameraControls.prototype = Object.create( THREE.EventDispatcher.prototype );

module.exports = CameraControls;
},{}],2:[function(require,module,exports){
module.exports = {
	Camera: require('./camera'),
	World: require('./world')
};
},{"./camera":1,"./world":3}],3:[function(require,module,exports){
function WorldControls(world, domElement) {
	this.world = world;
	this.domElement = domElement || document.body;
	this.setup();
}
module.exports = WorldControls;

WorldControls.prototype.setup = function() {
	this.domElement.addEventListener('click', this.onClick.bind(this), false);
};

WorldControls.prototype.onClick = function(e) {
	if (e.which == 1) { // left click
		var agentEl = local.util.findParentNode.byClass(e.target, 'agent');
		if (agentEl) {
			this.onLeftClickAgent(e, agentEl);
		} else {
			this.onLeftClickNothing(e);
		}
	}
};

WorldControls.prototype.onLeftClickAgent = function(e, agentEl) {
	var agent = this.world.getAgent(agentEl);
	this.world.select(agent);
};

WorldControls.prototype.onLeftClickNothing = function(e, agentEl) {
	var agent = this.world.getAgent(agentEl);
	this.world.select(null);
};
},{}],4:[function(require,module,exports){
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
},{"./controls":2,"./world":6}],5:[function(require,module,exports){
function Agent(opts) {
	// setup options
	if (!opts) { opts = {}; }
	if (!opts.el) {
		opts.el = document.createElement('div');
		opts.el.className = 'agent';
		opts.el.innerHTML = '<div style="background:red">test</div>';
	}

	// parent
	THREE.CSS3DObject.call(this, opts.el);
	this.element.id = 'object-'+this.id;

	// initial state
	this.isSelected = false;
}
Agent.prototype = Object.create(THREE.CSS3DObject.prototype);

Agent.prototype.setSelected = function(v) {
	this.isSelected = v;
	if (v) {
		this.element.classList.add('selected');
	} else {
		this.element.classList.remove('selected');
	}
};

module.exports = Agent;
},{}],6:[function(require,module,exports){
var Agent = require('./agent');

function World() {
	this.scene = null;

	this.agents = [];
	this.agentIdMap = {};

	this.selectedItems = [];
}
module.exports = new World();

World.prototype.setup = function(scene) {
	this.scene = scene;
	this.spawnAgent();
};

World.prototype.getAgent = function(idOrEl) {
	var id = (idOrEl instanceof HTMLElement) ? idOrEl.id.slice(7) : idOrEl;
	return this.agentIdMap[id];
};

World.prototype.spawnAgent = function(opts) {
	var agent = new Agent(opts);
	this.agentIdMap[agent.id] = agent;
	this.scene.add(agent);
	return agent;
};

World.prototype.select = function(items) {
	// clear current selection
	this.selectedItems.forEach(function(item) { item.setSelected(false); });

	// set new selection
	if (items) {
		this.selectedItems = (Array.isArray(items)) ? items : [items];
		this.selectedItems.forEach(function(item) { item.setSelected(true); });
	} else {
		this.selectedItems.length = 0;
	}
};
},{"./agent":5}]},{},[4])
;