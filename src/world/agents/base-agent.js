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