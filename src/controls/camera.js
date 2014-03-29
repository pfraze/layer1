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


			if (_keysDown[KEY_LEFT])  { panAmt.x += _this.panSpeedKeyboard; }
			if (_keysDown[KEY_RIGHT]) { panAmt.x -= _this.panSpeedKeyboard; }
			if (_keysDown[KEY_UP])    { panAmt.y += _this.panSpeedKeyboard; }
			if (_keysDown[KEY_DOWN])  { panAmt.y -= _this.panSpeedKeyboard; }

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