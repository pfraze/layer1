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
	this.panEdgesThreshold = 0.05;
	this.panSpeedMouse = 1;
	this.panSpeedKeyboard = 0.025;

	this.noZoom = false;
	this.noPan = false;
	this.noEdgePan = false;
	this.noKeyboardPan = false;

	this.staticMousePan = false;
	this.staticKeyboardPan = true; // :TODO: support for false
	this.staticMouseZoom = false;
	this.dynamicDampingFactor = 0.2;

	this.minDistance = 0;
	this.maxDistance = Infinity;

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
			var d = this.domElement.ownerDocument.documentElement;
			this.screen.left += window.pageXOffset - d.clientLeft;
			this.screen.top += window.pageYOffset - d.clientTop;

		}

	};

	this.getMouseOnScreen = function ( event, vector ) {

		return vector.set(
			( event.pageX - _this.screen.left ) / _this.screen.width,
			( event.pageY - _this.screen.top ) / _this.screen.height
		);

	};

	// given an event, fills the dest vector with the position in the world
	this.getMouseInWorld = (function() {
		var projector = new THREE.Projector();
		return (function(event, destVector) {
			var vector = new THREE.Vector3(
				(event.clientX / window.innerWidth) * 2 - 1,
				-(event.clientY / window.innerHeight) * 2 + 1,
				0.5
			);

			projector.unprojectVector( vector, camera );
			var dir = vector.sub( camera.position ).normalize();

			var distance = - camera.position.z / dir.z;

			destVector.copy(camera.position);
			destVector.add(dir.multiplyScalar(distance));
		});
	})();

	this.zoomCamera = function () {

		var factor = 1.0 + ( _zoomEnd.y - _zoomStart.y ) * _this.zoomSpeed;

		if ( factor !== 1.0 && factor > 0.0 ) {

			_eye.multiplyScalar( factor );

			if ( _this.staticMouseZoom ) {

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
				panAmt.multiplyScalar( _this.panSpeedMouse );
			} else {
				panAmt.copy(_panAmt);
			}

			if (!_this.noKeyboardPan) {
				if (_keysDown[KEY_LEFT])  { panAmt.x += _this.panSpeedKeyboard; }
				if (_keysDown[KEY_RIGHT]) { panAmt.x -= _this.panSpeedKeyboard; }
				if (_keysDown[KEY_UP])    { panAmt.y += _this.panSpeedKeyboard; }
				if (_keysDown[KEY_DOWN])  { panAmt.y -= _this.panSpeedKeyboard; }
			}

			if ( panAmt.lengthSq() ) {

				panAmt.multiplyScalar( _eye.length() );

				pan.copy( _eye ).cross( _this.object.up ).setLength( panAmt.x );
				pan.add( objectUp.copy( _this.object.up ).setLength( panAmt.y ) );

				_this.object.position.add( pan );
				_this.target.add( pan );

				if ( _this.staticMousePan ) {

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
			_this.getMouseOnScreen(event, _panStart);
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
		_this.getMouseOnScreen( event, mousepos );

		// pan if panning due to mode
		if (_isPanning) {
			_panEnd.copy(mousepos);
		} else if (!_this.noEdgePan) {
			// pan if at an edge
			if (mousepos.x <= _this.panEdgesThreshold) {
				_panAmt.x = (mousepos.x - _this.panEdgesThreshold);
			} else if (1 - mousepos.x <= _this.panEdgesThreshold) {
				_panAmt.x = (_this.panEdgesThreshold - (1 - mousepos.x));
			} else {
				_panAmt.x = 0;
			}
			if (mousepos.y <= _this.panEdgesThreshold) {
				_panAmt.y = (mousepos.y - _this.panEdgesThreshold);
			} else if (1 - mousepos.y <= _this.panEdgesThreshold) {
				_panAmt.y = (_this.panEdgesThreshold - (1 - mousepos.y));
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
	Menu: require('./menu'),
	World: require('./world')
};
},{"./camera":1,"./menu":3,"./world":4}],3:[function(require,module,exports){
function MenuControls(menu, domElement) {
	this.menu = menu;
	this.domElement = domElement || document.body;
}
module.exports = MenuControls;

MenuControls.prototype.setup = function() {
	document.body.addEventListener('keydown', this.onKeyDown.bind(this), false);
	document.body.addEventListener('keypress', this.onKeyPress.bind(this), false);
	document.body.addEventListener('click', this.onClick.bind(this), true); // on bubble
};

MenuControls.prototype.onKeyDown = function(e) {
	if (e.keyCode == 27) { // escape, must be handled in keydown (not supported in keypress in all browsers)
		this.menu.dispatchEvent({ type: 'unselect' }); // go back
	}
};

MenuControls.prototype.onKeyPress = function(e) {
	var c = String.fromCharCode(e.which||e.keyCode);

	// awaiting a keypress
	var fi = this.menu.getActiveFormItem();
	if (fi && fi.type == 'text') {
		if (e.target.tagName == 'INPUT' && e.which == 13) {
			this.menu.dispatchEvent({ type: 'input', valueType: 'text', value: e.target.value });
			e.preventDefault();
		}
		e.stopPropagation();
		return;
	}

	// menu hotkey
	var id = this.menu.hotkeyToItemName(c);
	if (id) {
		this.menu.dispatchEvent({ type: 'select', item: id });
	}
};

MenuControls.prototype.onClick = function(e) {
	if (e.which !== 1) return; // left click only

	// menu items
	var itemEl = local.util.findParentNode.byClass(e.target, 'menu-item');
	if (itemEl && itemEl.attributes.getNamedItem('name')) {
		this.menu.dispatchEvent({ type: 'select', item: itemEl.attributes.getNamedItem('name').value });
		e.preventDefault();
		e.stopPropagation();
		return;
	}

	// in a form
	var fi = this.menu.getActiveFormItem();
	if (fi) {
		// awaiting a click
		if (fi.type == 'position') {
			var pos = new THREE.Vector3();
			window.cameraControls.getMouseInWorld(e, pos);
			this.menu.dispatchEvent({ type: 'input', valueType: 'position', value: pos });
		}
		// stop event
		e.preventDefault();
		e.stopPropagation();
	}
};
},{}],4:[function(require,module,exports){
function WorldControls(world, domElement) {
	this.world = world;
	this.domElement = domElement || document.body;
}
module.exports = WorldControls;

WorldControls.prototype.setup = function() {
	this.domElement.addEventListener('click', this.onClick.bind(this), false);
	this.domElement.addEventListener('contextmenu', this.onContextmenu.bind(this), false);
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

WorldControls.prototype.onContextmenu = function(e) {
	var sel = this.world.getSelection();
	if (!sel[0]) return;

	e.worldPos = new THREE.Vector3();
	window.cameraControls.getMouseInWorld(e, e.worldPos);
	var req = sel[0].getRightClickReq(e);
	if (!req) return;

	this.world.selectionDispatch(req);
	e.preventDefault();
	e.stopPropagation();
};

WorldControls.prototype.onLeftClickAgent = function(e, agentEl) {
	var agent = this.world.getAgent(agentEl);
	this.world.select(agent);
};

WorldControls.prototype.onLeftClickNothing = function(e, agentEl) {
	var agent = this.world.getAgent(agentEl);
	this.world.select(null);
};
},{}],5:[function(require,module,exports){
module.exports = {
	Menu: require('./menu'),
	World: require('./world')
};
},{"./menu":6,"./world":7}],6:[function(require,module,exports){

function Menu(el) {
	this.doc = null;
	this.el = el;

	this.addEventListener('input', this.onInput.bind(this));

	this.activeFormItem = null;
	this.formValues = [];
}
Menu.prototype = Object.create(THREE.EventDispatcher.prototype);

Menu.prototype.set = function(doc) {
	this.doc = doc;
	this.activeFormItem = 0;
	this.formValues.length = 0;

	this.el.innerHTML = this.render();

	// do any
};

Menu.prototype.reset = function() {
	this.set(null);
	this.dispatchEvent({ type: 'reset' });
};

Menu.prototype.getActiveFormItem = function() {
	if (!this.doc || !this.doc.form || this.activeFormItem === null) { return null; }
	return this.doc.form[this.activeFormItem];
};
Menu.prototype.getFormValues = function() { return this.formValues; };

Menu.prototype.render = function() {
	if (!this.doc) return '';
	var html = '', i;
	if (this.doc.title) {
		html += '<p class="form-title">'+this.doc.title+'</p>';
	}
	if (this.doc.form) {
		html += '<p>'+(this.doc.method||'POST').toUpperCase()+'</p>';
		for (i=0; i < this.doc.form.length; i++) {
			var fi = this.doc.form[i];
			var a = (i === this.activeFormItem);
			if (fi.type == 'hidden') { continue; }
			html += '<div class="form-item form-item-'+fi.type+' '+((a)?'form-item-active':'')+'" type="'+fi.type+'">'+this.renderFormItem(fi, a)+'</div>';
		}
	}
	if (this.doc.submenu) {
		var lis = [];
		for (i=0; i < this.doc.submenu.length; i++) {
			lis.push('<li><a class="menu-item" name="'+this.doc.submenu[i].name+'" href="javascript:void()">'+this.doc.submenu[i].label+'</a></li>');
		}
		html += '<ul>'+lis.join('')+'</ul>';
	}
	return html;
};

Menu.prototype.renderFormItem = function(formItem, isActive) {
	switch (formItem.type) {
	case 'text':
		var ctrl = (!formItem.rows || formItem.rows == 1) ? '<input type="text" '+((isActive)?'autofocus':'')+'>' : '<textarea rows="'+formItem.rows+'"></textarea>';
		return '<p>'+formItem.label+'<br>'+ctrl+'</p>';
	case 'position':
		return '<p>'+formItem.label+' <small>Left-click on the map to choose the position</small></p>';
	case 'direction':
		return '<p>'+formItem.label+' <small>Left-click and drag to choose the direction</small></p>';
	case 'region':
		return '<p>'+formItem.label+' <small>Left-click and drag to create the region</small></p>';
	case 'agent':
		if (formItem.multiple) {
			return '<p>'+formItem.label+' <small>Left-click on agents on the map</small></p>';
		}
		return '<p>'+formItem.label+' <small>Left-click an agent on the map</small></p>';
	case 'hidden':
		return '';
	}
	return '<p>Form item type "'+formItem.type+'" is not valid.</p>';
};

Menu.prototype.goNextFormItem = function() {
	this.activeFormItem++;
	// advance past any hiddens
	for (; this.activeFormItem < this.doc.form.length; this.activeFormItem++) {
		if (this.doc.form[this.activeFormItem].type != 'hidden') {
			break;
		}
		// copy over hidden item's value
		this.formValues[this.activeFormItem] = this.doc.form[this.activeFormItem].value;
	}
};

Menu.prototype.onInput = function(e) {
	var fi = this.getActiveFormItem();
	if (fi && fi.type == e.valueType) {
		// Update form
		this.formValues[this.activeFormItem] = e.value;
		this.goNextFormItem();

		// Done? Emit submit
		if (this.activeFormItem >= this.doc.form.length) {
			this.dispatchEvent({ type: 'submit', values: this.formValues });
		}
	} else {
		console.error(e, fi);
		throw "Input event fired, but no active form item (or mismatched)";
	}
};

Menu.prototype.hotkeyToItemName = function(c) {
	if (!this.doc.submenu) return null;
	for (var i=0; i < this.doc.submenu.length; i++) {
		if (this.doc.submenu[i].hotkey === c)
			return this.doc.submenu[i].name;
	}
	return null;
};

Menu.prototype.makeFormBody = function() {
	var body = {};
	for (i=0; i < this.doc.form.length; i++) {
		body[this.doc.form[i].name] = this.formValues[i];
	}
	return body;
};

module.exports = Menu;
},{}],7:[function(require,module,exports){
var Menu = require('./menu');
var MenuControls = require('../controls').Menu;

function WorldInterface(world) {
	this.world = world;

	this.mainMenu = new Menu(document.getElementById('menu'));
	this.mainMenuControls = new MenuControls(this.mainMenu);
	this.mainMenuCursor = [];

	this.selectedWorldItems = null;
}
module.exports = WorldInterface;
WorldInterface.prototype = Object.create(THREE.EventDispatcher.prototype);
WorldInterface.prototype.getMainMenu = function() { return this.mainMenu; };

WorldInterface.prototype.setup = function() {
	var self = this;
	this.mainMenu.addEventListener('select', function(e) {
		self.mainMenuCursor.push(e.item);
		self.recreateMenu();
	});
	this.mainMenu.addEventListener('unselect', function(e) {
		self.mainMenuCursor.pop();
		self.recreateMenu();
	});
	this.mainMenu.addEventListener('reset', function(e) {
		self.mainMenuCursor.length = 0;
		self.recreateMenu();
	});
	this.mainMenu.addEventListener('submit', this.onFormSubmit.bind(this));

	this.recreateMenu();
	this.mainMenuControls.setup();
};

// called when the active selection has changed
WorldInterface.prototype.updateWorldSelection = function(items) {
	this.selectedWorldItems = items;

	// reset menu for new selection
	this.mainMenuCursor.length = 0;
	this.recreateMenu();
};

WorldInterface.prototype.recreateMenu = function() {
	// get menudoc endpoint
	var item = (this.selectedWorldItems) ? this.selectedWorldItems[0] : null;
	var getMenuDoc = (item) ? item.getMenuDoc.bind(item) : getDefaultMenudoc;
	var path = '/' + this.mainMenuCursor.join('/');

	// fetch menudoc and update menu
	this.mainMenu.set(getMenuDoc(path));
};

WorldInterface.prototype.onFormSubmit = function(e) {
	this.world.selectionDispatch({
		method: this.mainMenu.doc.method.toUpperCase(),
		body: this.mainMenu.makeFormBody()
	});
	this.mainMenu.reset();
};

// :TEMP:
function getDefaultMenudoc(path) {
	switch (path) {
	case '/':
		return {
			title: 'World',
			submenu: [
				{ name: 'spawn', label: '(S)pawn', hotkey: 's' },
			]
		};
	case '/spawn':
		return {
			title: 'World',
			submenu: [
				{ name: 'service', label: '(S)ervice', hotkey: 's' }
			]
		};
	case '/spawn/service':
		return {
			title: 'World',
			method: 'SPAWN',
			form: [{ type: 'text', name: 'url', label: 'URL' }, { type: 'hidden', name: 'type', value: 'service' }]
		};
	}
	return null;
}
},{"../controls":2,"./menu":6}],8:[function(require,module,exports){
var world = require('./world');
var controls = require('./controls');

// init
setup();
tick();

// global state & behaviors
window.world = world;

function setup() {
	// setup camera
	window.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
	camera.position.z = 1500;

	// setup scene
	window.scene = new THREE.Scene();
	world.setup(scene);

	// setup renderer
	window.renderer = new THREE.CSS3DRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.domElement.style.position = 'absolute';
	document.getElementById('world').appendChild(renderer.domElement);
	window.addEventListener('resize', onWindowResize, false);

	// setup controls
	window.cameraControls = new controls.Camera(camera, renderer.domElement);
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
	render();
}

function render() {
	renderer.render(scene, camera);
}
},{"./controls":2,"./world":19}],9:[function(require,module,exports){
function Agent(opts) {
	// setup options
	if (!opts) { opts = {}; }
	if (!opts.el) {
		opts.el = document.createElement('div');
		opts.el.className = 'agent';
	}

	// parent
	THREE.CSS3DObject.call(this, opts.el);
	this.element.id = 'object-'+this.id;

	// initial state
	this.isSelected = false;
	this.isResolved = false;
	this.isBroken = false;
	this.url = opts.url || null;
	this.links = [];
	this.fetchMetaResponse = null;

	// visual
	this.element.innerHTML = '<div style="position:relative;top:75px;white-space:pre">'+this.url+'</div>';
}
Agent.prototype = Object.create(THREE.CSS3DObject.prototype);

Agent.prototype.setup = function() {
	this.fetchMeta();
};

Agent.prototype.setSelected = function(v) {
	this.isSelected = v;
	if (v) {
		this.element.classList.add('selected');
	} else {
		this.element.classList.remove('selected');
	}
};

Agent.prototype.setResolved = function(v) {
	this.isResolved = v;
	if (v) {
		this.isBroken = false;
		this.element.classList.remove('broken');
		this.element.classList.add('resolved');
	} else {
		this.element.classList.remove('resolved');
	}
};

Agent.prototype.setBroken = function(v) {
	this.isBroken = v;
	if (v) {
		this.isResolved = false;
		this.element.classList.remove('resolved');
		this.element.classList.add('broken');
	} else {
		this.element.classList.remove('broken');
	}
};

Agent.prototype.getTitle = function() {
	var title = 'Agent @'+this.url;
	if (this.isBroken) { title += ' [broken: '+this.fetchMetaResponse.status+' '+this.fetchMetaResponse.reason+']'; }
	else if (!this.isResolved) { title += ' [building...]'; }
	return title;
};

Agent.prototype.getRightClickReq = function(evt) {
	return {
		method: 'MOVE',
		body: { dest: evt.worldPos }
	};
};

Agent.prototype.getMenuDoc = function(path) {
	switch (path) {
	case '/':
		return {
			title: this.getTitle(),
			submenu: [
				{ name: 'action', label: '(A)ction', hotkey: 'a' },
			]
		};
	case '/action':
		return {
			title: this.getTitle(),
			submenu: [
				{ name: 'go', label: '(G)o to', hotkey: 'g' }
			]
		};
	case '/action/go':
		return {
			title: this.getTitle(),
			method: 'MOVE',
			form: [{ type: 'position', name: 'dest', label: 'Destination' }]
		};
	}
	return null;
};

Agent.prototype.fetchMeta = function() {
	var self = this;
	return local.HEAD(this.url).then(
		function(res) {
			self.fetchMetaResponse = res;
			self.setResolved(true);
			self.links = res.parsedHeaders.link;
			self.element.innerHTML = '<div style="position:relative;top:75px;white-space:pre">'+self.url+'</div>';
			return res;
		},
		function(res) {
			self.fetchMetaResponse = res;
			self.setBroken(true);
			self.element.innerHTML = '<div style="position:relative;top:75px;white-space:pre">'+self.url+'</div>';
			throw res;
		}
	);
};

module.exports = Agent;
},{}],10:[function(require,module,exports){
var Agent = require('./base-agent');

function Collection(opts) {
	Agent.call(this, opts);
	this.element.style.backgroundImage = 'url(img/icons/document_folder.png)';
}
Collection.prototype = Object.create(Agent.prototype);
module.exports = Collection;
},{"./base-agent":9}],11:[function(require,module,exports){
module.exports = {
	collection: require('./collection'),
	item: require('./item'),
	iterator: require('./iterator'),
	query: require('./query'),
	queue: require('./queue'),
	service: require('./service'),
	transformer: require('./transformer'),
	transport: require('./transport')
};
},{"./collection":10,"./item":12,"./iterator":13,"./query":14,"./queue":15,"./service":16,"./transformer":17,"./transport":18}],12:[function(require,module,exports){
var Agent = require('./base-agent');

function Item(opts) {
	Agent.call(this, opts);
	this.element.style.backgroundImage = 'url(img/icons/document_index.png)';
}
Item.prototype = Object.create(Agent.prototype);
module.exports = Item;
},{"./base-agent":9}],13:[function(require,module,exports){
var Agent = require('./base-agent');

function Iterator(opts) {
	Agent.call(this, opts);
}
Iterator.prototype = Object.create(Agent.prototype);
module.exports = Iterator;
},{"./base-agent":9}],14:[function(require,module,exports){
var Agent = require('./base-agent');

function Query(opts) {
	Agent.call(this, opts);
}
Query.prototype = Object.create(Agent.prototype);
module.exports = Query;
},{"./base-agent":9}],15:[function(require,module,exports){
var Agent = require('./base-agent');

function Queue(opts) {
	Agent.call(this, opts);
}
Queue.prototype = Object.create(Agent.prototype);
module.exports = Queue;
},{"./base-agent":9}],16:[function(require,module,exports){
var Agent = require('./base-agent');

function Service(opts) {
	Agent.call(this, opts);

	// setup visuals
	this.element.style.backgroundImage = 'url(img/icons/computer.png)';

	// load data about endpoint
	this.fetchMeta();
}
Service.prototype = Object.create(Agent.prototype);
module.exports = Service;

/*Service.prototype.getMenuDoc = function(path) {
	switch (path) {
	case '/':
		return {
			submenu: [
				{ name: 'action', label: '(A)ction', hotkey: 'a' },
			]
		};
	case '/action':
		return {
			submenu: [
				{ name: 'go', label: '(G)o to', hotkey: 'g' }
			]
		};
	case '/action/go':
		return {
			method: 'MOVE',
			form: [{ type: 'position', name: 'dest', label: 'Destination' }]
		};
	}
	return null;
};*/
},{"./base-agent":9}],17:[function(require,module,exports){
var Agent = require('./base-agent');

function Transformer(opts) {
	Agent.call(this, opts);
}
Transformer.prototype = Object.create(Agent.prototype);
module.exports = Transformer;
},{"./base-agent":9}],18:[function(require,module,exports){
var Agent = require('./base-agent');

function Transport(opts) {
	Agent.call(this, opts);
}
Transport.prototype = Object.create(Agent.prototype);
module.exports = Transport;
},{"./base-agent":9}],19:[function(require,module,exports){
module.exports = require('./world');
},{"./world":20}],20:[function(require,module,exports){
var AgentTypes = require('./agents');
var WorldInterface = require('../iface').World;
var WorldControls = require('../controls').World;

var WORLD_SIZE = 5000;

function World() {
	this.scene = null;
	this.iface = new WorldInterface(this);
	this.controls = new WorldControls(this);

	this.agents = {};

	this.selectedItems = [];
}
module.exports = new World();

World.prototype.setup = function(scene) {
	this.scene = scene;

	// create background
	// var gridEl = document.createElement('div');
	// gridEl.id = 'grid-bg';
	// gridEl.style.width = WORLD_SIZE+'px';
	// gridEl.style.height = WORLD_SIZE+'px';
	// this.gridBg = new THREE.CSS3DObject(gridEl);
	// this.gridBg.position.z = -10;
	// this.scene.add(this.gridBg);

	// setup subcomponents
	this.iface.setup();
	this.controls.setup();
};

World.prototype.getAgent = function(idOrEl) {
	var id = (idOrEl instanceof HTMLElement) ? idOrEl.id.slice(7) : idOrEl;
	return this.agents[id];
};

World.prototype.getSelection = function() {
	return this.selectedItems;
};

World.prototype.spawnAgent = function(opts) {
	var type = opts ? opts.type : undefined;
	var AgentCtor = AgentTypes[type];
	if (!AgentCtor) AgentCtor = AgentTypes.service;

	var agent = new AgentCtor(opts);
	agent.setup();
	this.agents[agent.id] = agent;
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

	// update interface
	this.iface.updateWorldSelection(this.selectedItems);
};

World.prototype.selectionDispatch = function(req) {
	// :TEMP:
	if (req.method == 'SPAWN') {
		this.spawnAgent(req.body);
	}
	else if (req.method == 'MOVE') {
		this.selectedItems.forEach(function(item) { item.position.copy(req.body.dest); });
	} else {
		throw "Unknown method: "+method;
	}
};
},{"../controls":2,"../iface":5,"./agents":11}]},{},[8])
;