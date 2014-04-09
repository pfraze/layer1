;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var util = require('./util');

function Agent(opts) {
	// setup options
	if (!opts) { opts = {}; }
	if (!opts.el) {
		opts.el = document.createElement('div');
		opts.el.className = 'agent';
	}
	this.url = opts.url || null;
	this.lastResponse = opts.lastResponse || null;
	this.parentAgent = opts.parentAgent || null;

	// super
	THREE.CSS3DObject.call(this, opts.el);
	this.element.id = 'agent-'+this.id;

	// initial state
	this.isSelected = false;
	this.isResolved = false;
	this.isBroken = false;
	this.links = [];
	if (this.parentAgent) {
		this.position.copy(this.parentAgent.position);
		this.position.x += 500;
	}

	// visual
	this.element.innerHTML = '<div class="title">'+this.getTitle()+'</div><iframe seamless="seamless" sandbox="allow-popups allow-same-origin allow-scripts"><html><head></head><body></body></html></iframe>';
	if (this.lastResponse) {
		local.util.nextTick(this.render.bind(this));
	}
}
Agent.prototype = Object.create(THREE.CSS3DObject.prototype);

Agent.prototype.setup = function() {
	if (!this.url) { throw "Agent must have a url to be set up"; }
	this.fetch();
};

Agent.prototype.getTitle = function() {
	var title = this.url;
	if (this.isBroken) { title += ' [broken: '+this.lastResponse.status+' '+this.lastResponse.reason+']'; }
	else if (!this.isResolved) { title += ' [loading...]'; }
	return util.escapeHTML(title);
};

Agent.prototype.fetch = function() {
	var self = this;
	return util.fetch(this.url).then(
		function(res) {
			self.lastResponse = res;
			self.setResolved(true);
			self.links = res.parsedHeaders.link;
			self.render();
			return res;
		},
		function(res) {
			self.lastResponse = res;
			self.setBroken(true);
			self.render();
			throw res;
		}
	);
};

Agent.prototype.dispatch = function(req) {
	var self = this;
	var target = req.target; // local.Request() will strip `target`
	var body = req.body; delete req.body;

	if (!req.headers) { req.headers = {}; }
	if (req.headers && !req.headers.accept) { req.headers.accept = 'text/html, */*'; }
	req = (req instanceof local.Request) ? req : (new local.Request(req));

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
			self.render();
		} else {
			// spawn sub
			world.spawn({ url: req.url, lastResponse: res, parentAgent: self });
		}
	});

	req.end(body);
	return res_;
};

Agent.prototype.moveTo = function(dest) {
	var self = this;
	new TWEEN.Tween({ x: this.position.x, y: this.position.y } )
		.to({ x: dest.x, y: dest.y }, 300)
		.easing(TWEEN.Easing.Quadratic.InOut)
		.onUpdate(function () { self.position.set(this.x, this.y, 0); })
		.start();
};

Agent.prototype.render = function() {
	// set title
	this.element.querySelector('.title').innerHTML = [
		this.getTitle(),
		'<a class="pull-right" href="httpl://agents/'+this.id+'" method=DELETE>&times;</a>'
	].join('');

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
	iframe.addEventListener('load', sizeIframe); // must be set every load

	// Bind request events
	// :TODO: can this go in .load() ? appears that it *cant*
	var attempts = 0;
	var reqHandler = iframeRequestEventHandler.bind(this);
	var clickHandler = iframeClickEventHandler.bind(this);
	var bindPoller = setInterval(function() {
		try {
			local.bindRequestEvents(iframe.contentDocument.body);
			iframe.contentDocument.body.addEventListener('request', reqHandler);
			iframe.contentDocument.addEventListener('click', clickHandler);
			clearInterval(bindPoller);
		} catch(e) {
			attempts++;
			if (attempts > 100) {
				console.error('Failed to bind iframe events, which meant FIVE SECONDS went by the browser constructing it. Who\'s driving this clown-car?');
				clearInterval(bindPoller);
			}
		}
	}, 50); // wait 50 ms for the page to setup

};

function sizeIframe() {
	this.height = null; // reset so we can get a fresh measurement

	var oh = this.contentDocument.body.offsetHeight;
	var sh = this.contentDocument.body.scrollHeight;
	var w = this.contentDocument.body.scrollWidth;
	// for whatever reason, chrome gives a minimum of 150 for scrollHeight, but is accurate if below that. Whatever.
	this.height = ((sh == 150) ? oh : sh) + 'px';
	this.width = ((w < 800) ? w : 800) + 'px';

	// In 100ms, do it again - it seems styles aren't always in place
	var self = this;
	setTimeout(function() {
		var oh = self.contentDocument.body.offsetHeight;
		var sh = self.contentDocument.body.scrollHeight;
		var w = self.contentDocument.body.scrollWidth;
		self.height = ((sh == 150) ? oh : sh) + 'px';
		self.width = ((w < 800) ? w : 800) + 'px';
	}, 100);
}

function iframeRequestEventHandler(e) {
	this.dispatch(e.detail);
}

function iframeClickEventHandler(e) {
	this.element.dispatchEvent(new MouseEvent(e.type, e));
}

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

Agent.prototype.getBaseUrl = function(url) {
	if (!url) url = this.url;
	if (!url) return '';
	var urld = local.parseUri(url);
	var basepath = urld.path.slice(0, urld.path.lastIndexOf('/'));
	return urld.protocol + '://' + urld.authority + basepath + '/';
};

module.exports = Agent;
},{"./util":5}],2:[function(require,module,exports){
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
},{}],3:[function(require,module,exports){
var util = require('./util');
var esc = util.escapeHTML;

local.addServer('hello-world', function(req, res) {
	res.setHeader('link', [{ href: '/', rel: 'self todorel.com/agent', title: 'Hello World Agent', 'query-rel': 'collection' }]);
	res.writeHead(200, 'OK', {'Content-Type': 'text/html'}).end('<div style="margin:5px">Hello, world</div>');
});

function CfgServer(opts) {
	local.Server.call(this, opts);

	this.agents = [];

	// :DEBUG:
	this.agents.push({
		href: 'local://hello-world',
		rel: 'todorel.com/agent',
		'query-rel': 'service',
		title: 'Hello World Agent'
	});
}
CfgServer.prototype = Object.create(local.Server.prototype);
module.exports = CfgServer;

CfgServer.prototype.handleLocalRequest = function(req, res) {
	if (req.path == '/') {
		this.root(req, res);
	} else {
		res.writeHead(404).end();
	}
};

CfgServer.prototype.root = function(req, res) {
	if (req.method == 'GET') {
		this.rootGET(req, res);
	} else if (req.method == 'POST') {
		this.rootPOST(req, res);
	} else {
		res.writeHead(405).end();
	}
};

CfgServer.prototype.rootGET = function(req, res) {
	res.writeHead(200, 'OK', {'Content-Type':'text/html'});
	res.end(this.rootRenderHTML());
};

CfgServer.prototype.rootPOST = function(req, res) {
	var self = this;
	req.on('end', function() {
		if (!req.body || !req.body.url) {
			res.writeHead(422, 'Bad Ent', {'Content-Type':'text/html'});
			res.end(self.rootRenderHTML('<p class="text-danger">URL is required</p>'));
			return;
		}

		util.fetchMeta(req.body.url)
			.fail(function(res2) {
				var resSummary;
				if (res2.status) {
					resSummary = esc(res2.status)+' '+esc(res2.reason||'');
				} else {
					resSummary = 'Does not exist or not allowed to access.';
				}

				res.writeHead(502, 'Bad Upstream', {'Content-Type':'text/html'});
				res.end(self.rootRenderHTML('<p>Error: '+resSummary+'</p>'));
			})
			.then(function(res2) {
				var agentLink = local.queryLinks(res2, { rel: 'self todorel.com/agent' })[0];
				if (!agentLink) {
					res.writeHead(502, 'Bad Upstream', {'Content-Type':'text/html'});
					res.end(self.rootRenderHTML('<p>No agent link found</p>'));
					return;
				}

				self.agents.push(agentLink);
				res.writeHead(200, 'OK', {'Content-Type':'text/html'});
				res.end(self.rootRenderHTML());
			});
	});
};

CfgServer.prototype.rootRenderHTML = function(formMsg) {
	var html = '';
	html += '<div style="margin: 5px">';
	html += '<table class="table"><tr><th style="min-width:200px">Agent</th><th style="min-width:100px">Target</th></tr>';
	this.agents.forEach(function(agentLink) {
		html += '<tr><td><a href="'+esc(agentLink.href)+'">'+esc(agentLink.title)+'</a></td>';
		html += '<td>'+esc(agentLink['query-rel'])+'</td></tr>';
	});
	html += '</table>';
	html += '<form action="/" method="POST" class="form-inline">';
	html +=   '<div class="form-group">';
	html +=     '<label class="sr-only" for="url">URL</label>';
	html +=     '<input type="text" name="url" placeholder="Enter URL" class="form-control">';
	html +=   '</div>';
	if (formMsg) html += formMsg;
	html +=   '<button type="submit" class="btn btn-primary">Add Agent</button>';
	html += '</form>';
	html += '</div>';
	return html;
};
},{"./util":5}],4:[function(require,module,exports){
var World = require('./world');
var CameraControls = require('./camera-controls');
var CfgServer = require('./cfg-server');

// global state & behaviors
window.world = new World(); // a whole new woooooorld

// init
setup();
tick();

function setup() {
	// setup local
	local.logAllExceptions = true;
	local.schemes.register('local', local.schemes.get('httpl')); // use local://
	local.setDispatchWrapper(function(req, res, dispatch) {
		var res_ = dispatch(req, res);
		res_.then(
			function() { console.log(req, res); },
			function() { console.error(req, res); }
		);
	});

	// setup services
	local.addServer('config', new CfgServer());

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
},{"./camera-controls":2,"./cfg-server":3,"./world":6}],5:[function(require,module,exports){
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
},{}],6:[function(require,module,exports){
var Agent = require('./agent');
var WORLD_SIZE = 5000;

function World() {
	this.scene = null;

	this.agents = {};
	this.selectedAgent = null;
}
module.exports = World;

World.prototype.setup = function(scene) {
	this.scene = scene;

	// create background
	var gridEl = document.createElement('div');
	gridEl.id = 'grid-bg';
	gridEl.style.width = WORLD_SIZE+'px';
	gridEl.style.height = WORLD_SIZE+'px';
	this.gridBg = new THREE.CSS3DObject(gridEl);
	this.gridBg.position.z = -10;
	this.scene.add(this.gridBg);

	// setup event handlers
	document.body.addEventListener('click', clickHandler.bind(this));
	document.body.addEventListener('contextmenu', contextmenuHandler.bind(this));

	this.spawn({ url: 'local://config' });
};

World.prototype.getAgent = function(idOrEl) {
	var id = (idOrEl instanceof HTMLElement) ? idOrEl.id.slice(6) : idOrEl; // slice 6 to pass 'agent-' and go to the number
	return this.agents[id];
};

World.prototype.getSelection = function() {
	return this.selectedAgent;
};

World.prototype.spawn = function(opts) {
	var agent = new Agent(opts);
	agent.setup();
	this.agents[agent.id] = agent;
	this.scene.add(agent);
	return agent;
};

World.prototype.select = function(agent) {
	// clear current selection
	if (this.selectedAgent) {
		this.selectedAgent.setSelected(false);
	}

	// set new selection
	this.selectedAgent = agent;
	if (agent) {
		agent.setSelected(true);
	}
};

function clickHandler(e) {
	if (e.which == 1) { // left mouse
		var agentEl = local.util.findParentNode.byClass(e.target, 'agent');
		if (agentEl) {
			var agent = this.getAgent(agentEl);
			this.select(agent);
		} else {
			this.select(null);
		}
	}
}

function contextmenuHandler(e) {
	var agentEl = local.util.findParentNode.byClass(e.target, 'agent');
	if (!agentEl) {
		e.preventDefault();
		e.stopPropagation();

		if (!this.getSelection()) { return; }
		var worldPos = new THREE.Vector3();
		window.cameraControls.getMouseInWorld(e, worldPos);
		this.getSelection().moveTo(worldPos);
	}
}
},{"./agent":1}]},{},[4])
;