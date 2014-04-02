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

// :TEMP: this will eventually be replaced with HTTP
Agent.prototype.getMenuDoc = function(path) {
	switch (path) {
	case '/':
		return {
			submenu: [
				{ name: 'action', label: '(A)ction', hotkey: 'a' },
				{ name: 'create', label: '(C)reate', hotkey: 'c' },
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
	case '/create':
		return {
			submenu: [
				{ name: 'agent', label: '(A)gent', hotkey: 'a' },
				{ name: 'group', label: '(G)roup', hotkey: 'g' },
				{ name: 'formation', label: '(F)ormation', hotkey: 'f' }
			]
		};
	}
	return null;
};

module.exports = Agent;