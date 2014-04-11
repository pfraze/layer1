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
		'<div class="props-menu"></div>'
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
};

Entity.prototype.render = function() {
	// set title
	var icon = '<b class="glyphicon glyphicon-'+(this.isAgent()?'user':'barcode')+'"></b> ';
	this.element.querySelector('.title').innerHTML = icon + this.getTitle();
	this.element.querySelector('.props-menu').innerHTML = this.getPropsMenu();
};

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