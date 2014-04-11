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
	this.dockedEntities = [];
	if (this.parentEntity) {
		this.position.copy(this.parentEntity.position);
		this.position.x += 500;
		this.dockTo(this.parentEntity);
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
	html += world.configServer.queryAgents([sl]).map(function(l) {
		var href = local.UriTemplate.parse(l.href).expand({ target: sl.href });
		return '<p><a href="'+href+'" title="'+l.title+'">'+(l.title||l.id||l.href)+'</a></p>';
	}).join('');
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
		dest.x += vec.x + 50;
	}

	var delta = new THREE.Vector3(
		dest.x - this.position.x,
		dest.y - this.position.y,
		0
	);

	var self = this;
	new TWEEN.Tween({ x: this.position.x, y: this.position.y } )
		.to({ x: dest.x, y: dest.y }, 200)
		.easing(TWEEN.Easing.Quadratic.InOut)
		.onUpdate(function () { self.position.set(this.x, this.y, 0); })
		.start();

	this.dockedEntities.forEach(function(ent) {
		ent.moveTo(delta.clone().add(ent.position));
	});
};

Entity.prototype.dockTo = function(ent) {
	var wasSelected = this.isSelected;
	if (wasSelected) { this.setSelected(false); }

	if (this.parentEntity) { this.parentEntity.undock(this); }
	this.parentEntity = ent;
	if (this.parentEntity) { this.parentEntity.dock(this); }

	if (wasSelected) { this.setSelected(true); }
	this.moveTo(ent);
};

Entity.prototype.dock = function(ent) {
	this.dockedEntities.push(ent);
};

Entity.prototype.undock = function(ent) {
	this.dockedEntities = this.dockedEntities.filter(function(e) { return e !== ent; });
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
		if (this.parentEntity) { this.parentEntity.element.classList.add('selected-parent'); }
	} else {
		this.element.classList.remove('selected');
		if (this.parentEntity) { this.parentEntity.element.classList.remove('selected-parent'); }
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