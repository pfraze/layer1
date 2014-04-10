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

	// given an event, fills the dest vector with the position in the world
	this.getSizeInWorld = (function() {
		var projector = new THREE.Projector();
		return (function(width, height, destVector) {
			var vector = new THREE.Vector3(
				(width / window.innerWidth) * 2,
				-(height / window.innerHeight) * 2,
				0
			);

			projector.unprojectVector( vector, camera );
			var dir = vector.sub( camera.position ).normalize();

			var distance = - camera.position.z / dir.z;

			destVector.set(0,0,0);//copy(camera.position);
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

	this.moveToward = (function(){

		// var panAmt = new THREE.Vector2(),
		// 	objectUp = new THREE.Vector3(),
		// 	pan = new THREE.Vector3();
		var to;

		return function (position) {

			_panAmt.copy( position ).sub( _this.object.position );
			_panAmt.x *= -0.1 / _eye.z;
			_panAmt.y *=  0.1 / _eye.z;
			if (_panAmt.lengthSq() < 0.001) { // lower bound
				_panAmt.set(0,0);
			} else {
				setTimeout(function() { _panAmt.set(0,0); }, 150);
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

	this.centerAt = function(pos) {

		pos = pos.clone();

		pos.z = 0;
		_this.target.copy( pos );
		pos.z = _this.object.position.z;
		_this.object.position.copy( pos );
		_this.object.up.copy( _this.up0 );

		_eye.subVectors( _this.object.position, _this.target );
		_this.object.lookAt( _this.target );

		_this.dispatchEvent( changeEvent );

		lastPosition.copy( _this.object.position );

	};

	this.reset = function () {

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
		if (event.which == 1) { // left click
			_this.getMouseOnScreen(event, _panStart);
			_panEnd.copy(_panStart);
			setIframePointerEvents('none');
			_isPanning = true;
		}
	}
	function mouseup(event) {
		if (event.which == 1) { // left click
			setIframePointerEvents(null);
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

function setIframePointerEvents(v) {
	var iframes = document.querySelectorAll('iframe');
	for (var i=0; i < iframes.length; i++) {
		iframes[i].style.pointerEvents = v;
	}
}

module.exports = CameraControls;
},{}],2:[function(require,module,exports){
var util = require('./util');
var esc = util.escapeHTML;

function CfgServer(opts) {
	local.Server.call(this, opts);

	this.agents = [];
	this.services = [];
}
CfgServer.prototype = Object.create(local.Server.prototype);
module.exports = CfgServer;

CfgServer.prototype.queryAgents = function(searchLinks) {
	return this.agents.filter(function(agentLink) {
		var rel = agentLink['query-rel'];
		if (!rel) return;
		if (local.queryLinks(searchLinks, { rel: rel })[0]) {
			return true;
		}
		return false;
	});
};

CfgServer.prototype.handleLocalRequest = function(req, res) {
	if (req.path == '/') {
		this.root(req, res);
	} else {
		res.writeHead(404).end();
	}
};

CfgServer.prototype.root = function(req, res) {
	var type = local.preferredType(req, ['text/html', 'application/json']);
	if (!type) { return res.writeHead(406).end(); }

	res.header('Link', [{ href: '/', rel: 'self service', title: 'Program Load' }]);
	res.header('Content-Type', type);

	/**/ if (req.method == 'HEAD') { res.writeHead(204).end(); }
	else if (req.method == 'GET')  { this.rootGET(req, res); }
	else if (req.method == 'POST') { this.rootPOST(req, res); }
	else /***********************/ { res.writeHead(405).end(); }
};

CfgServer.prototype.rootGET = function(req, res) {
	res.writeHead(200, 'OK');
	this.rootRender(req, res);
};

CfgServer.prototype.rootPOST = function(req, res) {
	var self = this;
	req.on('end', function() {
		if (!req.body || !req.body.url) {
			res.writeHead(422, 'Bad Ent');
			self.rootRender(req, res, 'URL is required');
			return;
		}

		function prepLink(link) {
			link.rel = link.rel.split(' ').filter(function(r) { return (r != 'self'); }).join(' ');
		}

		util.fetchMeta(req.body.url)
			.fail(function(res2) {
				var resReason = 'Got from upstream: '+esc(res2.status)+' '+esc(res2.reason||'');
				var resSummary = 'Error: '+esc(res2.status)+' '+esc(res2.reason||'');
				if (!res2.status) {
					resSummary += ' (Does not exist or not allowed to access.)';
				}

				res.writeHead(502, resReason);
				self.rootRender(req, res, resSummary);
			})
			.then(function(res2) {
				var agentLink = local.queryLinks(res2, { rel: 'self todorel.com/agent' })[0];
				var serviceLink;
				if (agentLink) {
					prepLink(agentLink);
					self.agents.push(agentLink);
				} else {
					serviceLink = local.queryLinks(res2, { rel: 'self service' })[0];
					if (!serviceLink) {
						serviceLink = { href: req.body.url, title: req.body.url, rel: 'self service' };
					}
					prepLink(serviceLink);
					self.services.push(serviceLink);
				}

				if (res.header('Content-Type') == 'application/json') {
					res.writeHead(204, 'Ok no content').end();
				} else {
					res.writeHead(200, 'OK');
					self.rootRender(req, res);
				}
			});
	});
};

CfgServer.prototype.rootRender = function(req, res, formMsg) {
	if (res.header('Content-Type') == 'application/json') {
		if (formMsg) {
			res.end({ error: formMsg });
		} else {
			res.end({
				agents: this.agents,
				services: this.services
			});
		}
		return;
	}

	var html = '<style> p { font-size: 115%; margin: 4px 2px 16px } </style>';
	html += '<style> .form-control { margin-bottom: 10px } </style>';
	html += '<div style="padding: 10px 5px; min-width: 280px">';

	// agents
	this.agents.forEach(function(agentLink) {
		html += '<p><b class="glyphicon glyphicon-user" title="Agent"></b>';
		html += ' <a href="'+esc(agentLink.href)+'">'+esc(agentLink.title)+'</a></p>';
	});

	// services
	this.services.forEach(function(serviceLink) {
		html += '<p><b class="glyphicon glyphicon-barcode" title="Service"></b>';
		html += ' <a href="'+esc(serviceLink.href)+'">'+esc(serviceLink.title)+'</a></p>';
	});

	// form
	html += '<form action="/" method="POST" class="form-inline">';
	html +=   '<div class="form-group">';
	html +=     '<label class="sr-only" for="url">URL</label>';
	html +=     '<input type="text" name="url" placeholder="Enter URL" class="form-control">';
	html +=   '</div>';
	html +=   '<div style="height: 30px">';
	html +=     '<button type="submit" class="btn btn-primary pull-right">Add</button>';
	if (formMsg) html += '<p class="text-danger">'+formMsg+'</p>';
	html +=   '</div>';
	html += '</form>';

	html += '</div>';
	res.end(html);
};
},{"./util":6}],3:[function(require,module,exports){
var util = require('./util');
var esc = util.escapeHTML;

function EntityServer(opts) {
	local.Server.call(this, opts);
}
EntityServer.prototype = Object.create(local.Server.prototype);
module.exports = EntityServer;

EntityServer.prototype.handleLocalRequest = function(req, res) {
	if (req.path == '/') {
		this.root(req, res);
	} else {
		var entId = req.path.slice(1);
		var ent = world.getEntity(entId);
		if (!ent) { return res.writeHead(404).end(); }
		this.entity(req, res, ent);
	}
};

EntityServer.prototype.root = function(req, res) {
	if (req.method == 'GET') {
		this.rootGET(req, res);
	} else {
		res.writeHead(405, 'Bad Method').end();
	}
};

EntityServer.prototype.rootGET = function(req, res) {
	res.writeHead(200, 'OK', {'Content-Type':'text/html'});
	res.end(this.rootRenderHTML());
};

EntityServer.prototype.rootRenderHTML = function(formMsg) {
	return 'todo';
};

EntityServer.prototype.entity = function(req, res, ent) {
	if (req.method == 'DELETE') {
		this.entityDELETE(req, res, ent);
	} else {
		res.writeHead(405, 'Bad Method').end();
	}
};

EntityServer.prototype.entityDELETE = function(req, res, ent) {
	if (world.kill(ent)) {
		res.writeHead(307, 'Ok, Redirect to Null').end();
	} else {
		res.writeHead(404, 'Not Found').end();
	}

};
},{"./util":6}],4:[function(require,module,exports){
var util = require('./util');

function Entity(opts) {
	// setup options
	if (!opts) { opts = {}; }
	if (!opts.el) {
		opts.el = document.createElement('div');
		opts.el.className = 'ent';
	}
	this.url = opts.url || null;
	this.lastResponse = opts.lastResponse || null;
	this.parentEntity = opts.parentEntity || null;

	// super
	THREE.CSS3DObject.call(this, opts.el);
	this.element.id = 'ent-'+this.id;

	// initial state
	this.isSelected = false;
	this.isResolved = false;
	this.isBroken = false;
	this.links = [];
	this.selfLink = null;
	if (this.parentEntity) {
		this.position.copy(this.parentEntity.position);
		this.position.x += 500;
		this.moveTo(this.parentEntity);
	}

	// visual
	this.element.innerHTML = [
		'<div class="title">'+this.getTitle()+'</div>',
		'<div class="props-menu"></div>',
		'<iframe seamless="seamless" sandbox="allow-popups allow-same-origin allow-scripts"><html><head></head><body></body></html></iframe>'
	].join('');
}
Entity.prototype = Object.create(THREE.CSS3DObject.prototype);

Entity.prototype.setup = function() {
	if (!this.url) { throw "Entity must have a url to be set up"; }

	// load content
	if (this.lastResponse) {
		this.setResolved(true);
		this.links = this.lastResponse.parsedHeaders.link;
		this.selfLink = local.queryLinks(this.links, {rel:'self'})[0];
		if (this.selfLink) { prepLink(this.selfLink); }
		this.render();
	} else {
		this.fetch();
	}
};

Entity.prototype.destroy = function() {

};

Entity.prototype.isAgent = function() {
	return (this.selfLink && local.queryLink(this.selfLink, {rel:'todorel.com/agent'}));
};

Entity.prototype.getTitle = function() {
	var title = this.url;
	if (this.selfLink && this.selfLink.title) { title = this.selfLink.title; }
	if (this.isBroken) { title += ' [broken: '+this.lastResponse.status+' '+this.lastResponse.reason+']'; }
	else if (!this.isResolved) { title += ' [loading...]'; }
	return util.escapeHTML(title);
};

Entity.prototype.getPropsMenu = function() {
	var sl = this.selfLink;
	if (!sl) { return ''; }
	var html = '';
	if (sl.rel) { html += '<p>'+sl.rel+'</p>'; }
	html += '<p>';
	html += world.configServer.queryAgents([sl]).map(function(l) {
		var href = local.UriTemplate.parse(l.href).expand({ target: sl.href });
		return '<a href="'+href+'" title="'+l.title+'">'+(l.title||l.id||l.href)+'</a><br>';
	}).join('');
	html += '</p>';
	return html;
};

Entity.prototype.fetch = function() {
	var self = this;
	return util.fetch(this.url)
		.then(function(res) {
			self.lastResponse = res;
			self.setResolved(true);
			self.links = res.parsedHeaders.link;
			self.selfLink = local.queryLinks(res, {rel:'self'})[0];
			if (self.selfLink) { prepLink(self.selfLink); }
			self.render();
			return res;
		})
		.fail(function(res) {
			self.lastResponse = res;
			self.setBroken(true);
			self.links = res.parsedHeaders.link;
			self.selfLink = local.queryLinks(res, {rel:'self'})[0];
			if (self.selfLink) { prepLink(self.selfLink); }
			self.render();
			throw res;
		});
};

Entity.prototype.dispatch = function(req) {
	var self = this;
	var target = req.target; // local.Request() will strip `target`
	var body = req.body; delete req.body;

	if (!req.url) { req.url = this.url; }
	if (!req.headers) { req.headers = {}; }
	if (req.headers && !req.headers.accept) { req.headers.accept = 'text/html, */*'; }
	req = (req instanceof local.Request) ? req : (new local.Request(req));
	if (body !== null && body !== '' && typeof body != 'undefined' && !req.header('Content-Type')) {
		if (typeof body == 'object') {
			req.header('Content-Type', 'application/json');
		} else {
			req.header('Content-Type', 'text/plain');
		}
	}

	// relative link? make absolute
	if (!local.isAbsUri(req.url)) {
		req.url = local.joinRelPath(this.getBaseUrl(), req.url);
	}

	res_ = local.dispatch(req);
	res_.always(function(res) {
		var urld1 = local.parseUri(self.url);
		var urld2 = local.parseUri(req.url);
		if (urld1.protocol == urld2.protocol && urld1.authority == urld2.authority) {
			// in-place
			self.url = req.url;
			self.lastResponse = res;
			self.links = res.parsedHeaders.link;
			self.selfLink = local.queryLinks(res, {rel:'self'})[0];
			if (self.selfLink) { prepLink(self.selfLink); }
			self.render();
		} else {
			if (res.status == 307 && !res.header('Location')) { // temp redirect to null?
				return; // dont spawn
			}
			// spawn sub
			world.spawn({ url: req.url, lastResponse: res, parentEntity: self }, { select: true });
		}
	});

	req.end(body);
	return res_;
};

Entity.prototype.moveTo = function(dest) {
	if (dest instanceof Entity) {
		var destEnt = dest;
		dest = destEnt.position.clone();

		var rect = destEnt.element.getClientRects()[0];
		var vec = new THREE.Vector3();
		cameraControls.getSizeInWorld(rect.width, rect.height, vec);
		console.log(rect.width, vec.x);
		dest.x += vec.x + 50;
	}

	var self = this;
	new TWEEN.Tween({ x: this.position.x, y: this.position.y } )
		.to({ x: dest.x, y: dest.y }, 200)
		.easing(TWEEN.Easing.Quadratic.InOut)
		.onUpdate(function () { self.position.set(this.x, this.y, 0); })
		.start();
};

Entity.prototype.render = function() {
	// set title
	var icon = '<b class="glyphicon glyphicon-'+(this.isAgent()?'user':'barcode')+'"></b> ';
	this.element.querySelector('.title').innerHTML = [
		icon,
		this.getTitle(),
		'<a class="pull-right" href="httpl://ents/'+this.id+'" method=DELETE>&times;</a>'
	].join('');
	this.element.querySelector('.props-menu').innerHTML = [
		this.getPropsMenu()
	].join('');

	if (!this.lastResponse) {
		return;
	}

	// prep response body
	var body = (this.lastResponse) ? this.lastResponse.body : '';
	if (body && typeof body == 'object') {
		body = JSON.stringify(body);
	}
	var bootstrapUrl = local.joinUri(this.getBaseUrl(window.location.toString()), 'css/bootstrap.min.css');
	var prependHTML = [
		'<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; font-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src *; script-src \'self\';" />',
		// ^ script-src 'self' enables the parent page to reach into the iframe
		'<base href="'+this.getBaseUrl()+'">',
		'<link href="'+bootstrapUrl+'" rel="stylesheet">'
	].join('');
	body = prependHTML+util.stripScripts(body); // CSP stops inline or remote script execution, but we still want to stop inclusions of scripts from our domain

	// set iframe
	var iframe = this.element.querySelector('iframe');
	iframe.setAttribute('srcdoc', body);

	// :HACK: everything below here in this function kinda blows

	// Size the iframe to its content
	iframe.addEventListener('load', sizeIframe.bind(this, iframe)); // must be set every load

	// Bind request events
	// :TODO: can this go in .load() ? appears that it *cant*
	var attempts = 0;
	var reqHandler = iframeRequestEventHandler.bind(this);
	var redirHandler = iframeMouseEventRedispatcher.bind(this);
	var contextmenuHandler = iframeContextmenuHandler.bind(this);
	function tryEventBinding() {
		try {
			local.bindRequestEvents(iframe.contentDocument);
			iframe.contentDocument.addEventListener('request', reqHandler);
			iframe.contentDocument.addEventListener('click', redirHandler);
			iframe.contentDocument.addEventListener('dblclick', redirHandler);
			iframe.contentDocument.addEventListener('mousedown', redirHandler);
			iframe.contentDocument.addEventListener('mouseup', redirHandler);
			iframe.contentDocument.addEventListener('contextmenu', contextmenuHandler);
		} catch(e) {
			attempts++;
			if (attempts > 100) {
				console.error('Failed to bind iframe events, which meant FIVE SECONDS went by the browser constructing it. Who\'s driving this clown-car?');
			} else {
				// setTimeout(tryEventBinding, 50); // try again
			}
		}
	}
	setTimeout(tryEventBinding, 50); // wait 50 ms for the page to setup

};

// when called, must be bound to Entity instance
function sizeIframe(iframe) {
	iframe.height = null; // reset so we can get a fresh measurement

	var oh = iframe.contentDocument.body.offsetHeight;
	var sh = iframe.contentDocument.body.scrollHeight;
	var w = iframe.contentDocument.body.scrollWidth;
	// for whatever reason, chrome gives a minimum of 150 for scrollHeight, but is accurate if below that. Whatever.
	iframe.height = ((sh == 150) ? oh : sh) + 'px';
	iframe.width = ((w < 800) ? w : 800) + 'px';
	this.element.querySelector('.props-menu').style.left = iframe.width;

	// In 100ms, do it again - it seems styles aren't always in place
	var self = this;
	setTimeout(function() {
		var oh = iframe.contentDocument.body.offsetHeight;
		var sh = iframe.contentDocument.body.scrollHeight;
		var w = iframe.contentDocument.body.scrollWidth;
		iframe.height = ((sh == 150) ? oh : sh) + 'px';
		iframe.width = ((w < 800) ? w : 800) + 'px';
		self.element.querySelector('.props-menu').style.left = iframe.width;
	}, 100);
}

function iframeRequestEventHandler(e) {
	this.dispatch(e.detail);
}

function iframeMouseEventRedispatcher(e) {
	var newEvent = {};
	for (var k in e) { newEvent[k] = e[k]; }
	var rect = this.element.getClientRects()[0];

	newEvent.clientX = rect.left + e.clientX;
	newEvent.clientY = rect.top + e.clientY;
	this.element.dispatchEvent(new MouseEvent(e.type, newEvent));
}

function iframeContextmenuHandler(e) {
	// :TODO: only disrupt event if something is selected
	e.preventDefault();
	e.stopPropagation();

	var newEvent = {};
	for (var k in e) { newEvent[k] = e[k]; }
	var rect = this.element.getClientRects()[0];

	newEvent.clientX = rect.left + e.clientX;
	newEvent.clientY = rect.top + e.clientY;
	this.element.dispatchEvent(new MouseEvent(e.type, newEvent));
}

Entity.prototype.setSelected = function(v) {
	this.isSelected = v;
	if (v) {
		this.element.classList.add('selected');
	} else {
		this.element.classList.remove('selected');
	}
};

Entity.prototype.setResolved = function(v) {
	this.isResolved = v;
	if (v) {
		this.isBroken = false;
		this.element.classList.remove('broken');
		this.element.classList.add('resolved');
	} else {
		this.element.classList.remove('resolved');
	}
};

Entity.prototype.setBroken = function(v) {
	this.isBroken = v;
	if (v) {
		this.isResolved = false;
		this.element.classList.remove('resolved');
		this.element.classList.add('broken');
	} else {
		this.element.classList.remove('broken');
	}
};

Entity.prototype.getBaseUrl = function(url) {
	if (!url) url = this.url;
	if (!url) return '';
	var urld = local.parseUri(url);
	var basepath = urld.path.slice(0, urld.path.lastIndexOf('/'));
	return urld.protocol + '://' + urld.authority + basepath + '/';
};

function prepLink(link) {
	link.rel = link.rel.split(' ').filter(function(r) { return (r != 'self'); }).join(' ');
}

module.exports = Entity;
},{"./util":6}],5:[function(require,module,exports){
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

	// :DEBUG:
	local.addServer('time', function(req, res) {
		res.setHeader('link', [{ href: '/', rel: 'self service', title: 'Time' }]);
		var type = local.preferredType(req, ['text/html', 'text/plain', 'application/json']);
		if (!type || type == 'text/html') {
			res.writeHead(200, 'OK', {'Content-Type': 'text/html'}).end('<div style="margin:5px"><b class="glyphicon glyphicon-time"></b> '+(new Date()).toLocaleString()+'</div>');
		} else if (type == 'text/plain') {
			res.writeHead(200, 'OK', {'Content-Type': 'text/plain'}).end((new Date()).toLocaleString());
		} else if (type == 'application/json') {
			res.writeHead(200, 'OK', {'Content-Type': 'application/json'}).end({ time: (new Date()).toLocaleString() });
		}
	});

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
},{"./camera-controls":1,"./cfg-server":2,"./entity-server":3,"./worker-proxy":7,"./world":8}],6:[function(require,module,exports){
var lbracket_regex = /</g;
var rbracket_regex = />/g;
function escapeHTML(str) {
	return (''+str).replace(lbracket_regex, '&lt;').replace(rbracket_regex, '&gt;');
}

var quoteRegex = /"/g;
function escapeQuotes(str) {
	return (''+str).replace(quoteRegex, '&quot;');
}

var sanitizeHtmlRegexp = /<script(.*?)>(.*?)<\/script>/g;
function stripScripts (html) {
	// CSP stops inline or remote script execution, but we still want to stop inclusions of scripts on our domain
	// :TODO: this approach probably naive in some important way
	return html.replace(sanitizeHtmlRegexp, '');
}

function renderResponse(req, res) {
	if (res.body !== '') {
		if (typeof res.body == 'string') {
			if (res.header('Content-Type').indexOf('text/html') !== -1)
				return res.body;
			if (res.header('Content-Type').indexOf('image/') === 0) {
				return '<img src="'+req.url+'">';
				// :HACK: it appears that base64 encoding cant occur without retrieving the data as a binary array buffer
				// - this could be done by first doing a HEAD request, then deciding whether to use binary according to the reported content-type
				// - but that relies on consistent HEAD support, which is unlikely
				// return '<img src="data:'+res.header('Content-Type')+';base64,'+btoa(res.body)+'">';
			}
			if (res.header('Content-Type').indexOf('javascript') !== -1)
				return '<link href="css/prism.css" rel="stylesheet"><pre><code class="language-javascript">'+escapeHTML(res.body)+'</code></pre>';
			return '<pre>'+escapeHTML(res.body)+'</pre>';
		} else {
			return '<link href="css/prism.css" rel="stylesheet"><pre><code class="language-javascript">'+escapeHTML(JSON.stringify(res.body))+'</code></pre>';
		}
	}
	return res.status + ' ' + res.reason;
}

function fetch(url, useHead) {
	var lookupReq;

	var method = (useHead) ? 'HEAD' : 'GET';
	var p = local.promise();
	var urld = local.parseUri(url);
	if (!urld || !urld.authority) {
		p.fulfill(false); // bad url, dont even try it!
		return p;
	}

	var triedProxy = false;
	var attempts = [new local.Request({ method: method, url: url })]; // first attempt, as given
	if (!urld.protocol) {
		// No protocol? Two more attempts - 1 with https, then one with plain http
		attempts.push(new local.Request({ method: method, url: 'https://'+urld.authority+urld.relative }));
		attempts.push(new local.Request({ method: method, url: 'http://'+urld.authority+urld.relative }));
	}

	function makeAttempt() {
		if (lookupReq) lookupReq.close();
		lookupReq = attempts.shift();
		local.dispatch(lookupReq).always(handleAttempt);
		lookupReq.end();
	}
	makeAttempt();

	function handleAttempt(res) {
		if (res.status >= 200 && res.status < 300) {
			p.fulfill(res); // Done!
		} /* :TODO: proxy?
		else if (!attempts.length && res.status === 0 && !triedProxy) {
			// May be a CORS issue, try the proxy
			triedProxy = true;
			globals.fetchProxyUA.resolve({ nohead: true }).always(function(proxyUrl) {
				if (!urld.protocol) {
					if (useHead) {
						attempts.push(new local.Request({ method: 'HEAD', url: proxyUrl, query: { url: 'https://'+urld.authority+urld.relative } }));
						attempts.push(new local.Request({ method: 'HEAD', url: proxyUrl, query: { url: 'http://'+urld.authority+urld.relative } }));
						attempts.push(new local.Request({ method: 'GET', url: proxyUrl, query: { url: 'https://'+urld.authority+urld.relative } }));
						attempts.push(new local.Request({ method: 'GET', url: proxyUrl, query: { url: 'http://'+urld.authority+urld.relative } }));
					} else {
						attempts.push(new local.Request({ method: 'GET', url: proxyUrl, query: { url: 'https://'+urld.authority+urld.relative } }));
						attempts.push(new local.Request({ method: 'GET', url: proxyUrl, query: { url: 'http://'+urld.authority+urld.relative } }));
					}
				} else {
					if (useHead) {
						attempts.push(new local.Request({ method: 'HEAD', url: proxyUrl, query: { url: url } }));
						attempts.push(new local.Request({ method: 'GET', url: proxyUrl, query: { url: url } }));
					} else {
						attempts.push(new local.Request({ method: 'GET', url: proxyUrl, query: { url: url } }));
					}
				}
				makeAttempt();
			});
		}*/ else {
			// No dice, any attempts left?
			if (attempts.length) {
				makeAttempt(); // try the next one
			} else {
				p.reject(res); // no dice
			}
		}
	}

	return p;
}

module.exports = {
	escapeHTML: escapeHTML,
	makeSafe: escapeHTML,
	escapeQuotes: escapeQuotes,
	stripScripts: stripScripts,
	renderResponse: renderResponse,
	fetch: fetch,
	fetchMeta: function(url) { return fetch(url, true); }
};
},{}],7:[function(require,module,exports){
var util = require('./util');

function WorkerProxy(opts) {
	local.Server.call(this, opts);
}
WorkerProxy.prototype = Object.create(local.Server.prototype);
module.exports = WorkerProxy;

WorkerProxy.prototype.handleLocalRequest = function(req, res, worker) {
	if (req.path == '/') {
		this.root(req, res, worker);
	} else {
		this.proxy(req, res, worker);
	}
};

WorkerProxy.prototype.root = function(req, res, worker) {
	var via = [{proto: {version:'1.0', name:'HTTPL'}, hostname: req.header('Host')}];

	var links = [];
	links.unshift({ href: '/', rel: 'self service via', title: 'Host Page', noproxy: true });
	links.push({ href: '/{uri}', rel: 'service', hidden: true });

	// :TODO: add hosts

	// Respond
	res.setHeader('Link', links);
	res.setHeader('Via', via);
	res.header('Proxy-Tmpl', 'httpl://host.page/{uri}');
	res.writeHead(204).end();
};

WorkerProxy.prototype.proxy = function(req, res, worker) {
	var via = [{proto: {version:'1.0', name:'HTTPL'}, hostname: req.header('Host')}];

	// Proxy the request through
	var req2 = new local.Request({
		method: req.method,
		url: decodeURIComponent(req.path.slice(1)),
		query: local.util.deepClone(req.query),
		headers: local.util.deepClone(req.headers),
		stream: true
	});

	// Check perms
	// :DEBUG: temporary, simple no external
	var urld = local.parseUri(req2.url);
	if (urld.protocol == 'http' || urld.protocol == 'https') {
		res.writeHead(403, 'Forbidden', { 'Content-Type': 'text/plain' });
		res.end('External requests currently disabled.');
		return;
	}

	// Set headers
	req2.header('From', 'local://'+worker.config.domain);
	req2.header('Via', (req.parsedHeaders.via||[]).concat(via));

	console.log('proxy request out');
	var res2_ = local.dispatch(req2);
	res2_.always(function(res2) {
		// Set headers
		res2.header('Link', res2.parsedHeaders.link); // use parsed headers, since they'll all be absolute now
		res2.header('Via', via.concat(res2.parsedHeaders.via||[]));
		res2.header('Proxy-Tmpl', ((res2.header('Proxy-Tmpl')||'')+' local://host.page/{uri}').trim());

		// Pipe back
		res.writeHead(res2.status, res2.reason, res2.headers);
		res2.on('data', function(chunk) { res.write(chunk); });
		res2.on('end', function() { res.end(); });
		res2.on('close', function() { res.close(); });
	});
	req.on('data', function(chunk) { req2.write(chunk); });
	req.on('end', function() { req2.end(); });
};
},{"./util":6}],8:[function(require,module,exports){
var Entity = require('./entity');
var WORLD_SIZE = 5000;

function World() {
	this.scene = null;
	this.configServer = null;

	this.entities = {};
	this.selectedEntity = null;
}
module.exports = World;

World.prototype.setup = function(scene, configServer) {
	this.scene = scene;
	this.configServer = configServer;
	this.leftIsDown = false;

	// create background
	var gridEl = document.createElement('div');
	gridEl.id = 'grid-bg';
	gridEl.style.width = WORLD_SIZE+'px';
	gridEl.style.height = WORLD_SIZE+'px';
	this.gridBg = new THREE.CSS3DObject(gridEl);
	this.gridBg.position.x = -(WORLD_SIZE/2);
	this.gridBg.position.y = (WORLD_SIZE/2);
	this.gridBg.position.z = -10;
	this.scene.add(this.gridBg);

	// setup event handlers
	document.body.addEventListener('click', clickHandler.bind(this));
	document.body.addEventListener('dblclick', dblclickHandler.bind(this));
	document.body.addEventListener('mousedown', mousedownHandler.bind(this));
	document.body.addEventListener('mouseup', mouseupHandler.bind(this));
	document.body.addEventListener('contextmenu', contextmenuHandler.bind(this));

	var cfgagent = this.spawn({ url: 'local://config' });
	cfgagent.dispatch({ method: 'POST', body: {url:'local://dev.grimwire.com(layer1/pfraze/mimepipe.js)/'} });
	cfgagent.dispatch({ method: 'POST', body: {url:'local://time/'} });
};

World.prototype.getEntity = function(idOrEl) {
	var id = (idOrEl instanceof HTMLElement) ? idOrEl.id.slice(4) : idOrEl; // slice 4 to pass 'ent-' and go to the number
	return this.entities[id];
};

World.prototype.getSelection = function() {
	return this.selectedEntity;
};

World.prototype.spawn = function(cfg, opts) {
	opts = opts || {};
	var entity = new Entity(cfg);
	entity.setup();
	this.entities[entity.id] = entity;
	this.scene.add(entity);
	if (opts.select) {
		this.select(entity);
	}
	return entity;
};

World.prototype.kill = function(entOrId) {
	if (entOrId && !(entOrId instanceof Entity)) {
		entOrId = this.getEntity(entOrId);
	}
	var entity = entOrId;
	if (!entity) {
		return false;
	}
	entity.destroy();
	if (this.selectedEntity == entity) {
		this.select(null);
	}
	this.scene.remove(entity);
	delete this.entities[entity.id];
	return entity;
};

World.prototype.select = function(entity) {
	// clear attackable classes
	var attackables = document.querySelectorAll('.ent.attackable');
	for (var i=0; i < attackables.length; i++) {
		attackables[i].classList.remove('attackable');
		try {
			attackables[i].querySelector('iframe').contentDocument.body.style.cursor = null;
		} catch(e) {}
	}

	// clear current selection
	if (this.selectedEntity) {
		this.selectedEntity.setSelected(false);
	}

	// set new selection
	this.selectedEntity = entity;
	if (entity) {
		entity.setSelected(true);

		if (entity.isAgent()) {
			var query = { rel: entity.selfLink['query-rel'] };
			// highlight attackable ents
			for (var id in this.entities) {
				var target = this.entities[id];
				if (target.selfLink && local.queryLink(target.selfLink, query)) {
					target.element.classList.add('attackable');
					try {
						target.element.querySelector('iframe').contentDocument.body.style.cursor = 'crosshair';
					} catch(e) {}
				}
			}
		}
	}
};

function clickHandler(e) {
	if (e.which == 1) { // left mouse
		var entityEl = local.util.findParentNode.byClass(e.target, 'ent');
		if (entityEl) {
			var entity = this.getEntity(entityEl);
			this.select(entity);
		} else {
			this.select(null);
		}
	}
}

function dblclickHandler(e) {
	if (e.which == 1) { // left mouse
		var worldPos = new THREE.Vector3();
		window.cameraControls.getMouseInWorld(e, worldPos);
		cameraControls.centerAt(worldPos);
	}
}

function mousedownHandler(e) {
	if (e.which == 1) {
		this.leftIsDown = true;
	}
}

function mouseupHandler(e) {
	if (e.which == 1) {
		this.leftIsDown = false;
	}
}

function contextmenuHandler(e) {
	// never allow default in the world
	e.preventDefault();
	e.stopPropagation();

	var entityEl = local.util.findParentNode.byClass(e.target, 'ent');
	if (entityEl && entityEl != this.selectedEntity.element) {
		// "attack"
		var agent = this.selectedEntity;
		var target = this.getEntity(entityEl);
		if (agent && target && local.queryLink(agent.selfLink, { rel: 'todorel.com/agent'})) {
			// agent targetting another entity, of the right type?
			var rel = agent.selfLink['query-rel'];
			if (rel && local.queryLink(target.selfLink, { rel: rel })) {
				// move agent to target
				agent.moveTo(target);
				// reload agent with this new target
				agent.url = local.UriTemplate
					.parse(agent.selfLink.href)
					.expand({ target: target.selfLink.href });
				agent.fetch();
			}
		}
	} else {
		// move selection
		if (!this.getSelection()) { return; }
		var worldPos = new THREE.Vector3();
		window.cameraControls.getMouseInWorld(e, worldPos);
		this.getSelection().moveTo(worldPos);
	}
}
},{"./entity":4}]},{},[5])
;