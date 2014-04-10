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
	this.selfLink = null;
	if (this.parentAgent) {
		this.position.copy(this.parentAgent.position);
		this.position.x += 500;
	}

	// visual
	this.element.innerHTML = [
		'<div class="title">'+this.getTitle()+'</div>',
		'<div class="props-menu"></div>',
		'<iframe seamless="seamless" sandbox="allow-popups allow-same-origin allow-scripts"><html><head></head><body></body></html></iframe>'
	].join('');
	if (this.lastResponse) {
		local.util.nextTick(this.render.bind(this));
	}
}
Agent.prototype = Object.create(THREE.CSS3DObject.prototype);

Agent.prototype.setup = function() {
	if (!this.url) { throw "Agent must have a url to be set up"; }
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

Agent.prototype.destroy = function() {

};

Agent.prototype.getTitle = function() {
	var title = this.url;
	if (this.selfLink && this.selfLink.title) { title = this.selfLink.title; }
	if (this.isBroken) { title += ' [broken: '+this.lastResponse.status+' '+this.lastResponse.reason+']'; }
	else if (!this.isResolved) { title += ' [loading...]'; }
	return util.escapeHTML(title);
};

Agent.prototype.getPropsMenu = function() {
	if (!this.selfLink) { return ''; }
	var html = '';
	if (this.selfLink.rel) { html += '<p>'+this.selfLink.rel+'</p>'; }
	return html;
};

Agent.prototype.fetch = function() {
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
			if (res.status == 307 && !res.header('Location')) { // temp redirect to null?
				return; // dont spawn
			}
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
		.to({ x: dest.x, y: dest.y }, 200)
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
	this.element.querySelector('.props-menu').innerHTML = [
		this.getPropsMenu()
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
	iframe.addEventListener('load', sizeIframe.bind(this, iframe)); // must be set every load

	// Bind request events
	// :TODO: can this go in .load() ? appears that it *cant*
	var attempts = 0;
	var reqHandler = iframeRequestEventHandler.bind(this);
	var clickHandler = iframeMouseEventRedispatcher.bind(this);
	var dblclickHandler = iframeMouseEventRedispatcher.bind(this);
	var bindPoller = setInterval(function() {
		try {
			local.bindRequestEvents(iframe.contentDocument.body);
			iframe.contentDocument.body.addEventListener('request', reqHandler);
			iframe.contentDocument.addEventListener('click', clickHandler);
			iframe.contentDocument.addEventListener('dblclick', dblclickHandler);
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

// when called, must be bound to Agent instance
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

function prepLink(link) {
	link.rel = link.rel.split(' ').filter(function(r) { return (r != 'self'); }).join(' ');
}

module.exports = Agent;