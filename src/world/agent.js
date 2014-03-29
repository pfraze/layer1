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

Agent.prototype.getMenuCmds = function(id) {
	switch (id) {
	case undefined:
		return {
			action: { label: '<strong>A</strong>ction', hotkey: 'a' },
			create: { label: '<strong>C</strong>reate', hotkey: 'c' },
		};
	case 'action':
		return {
			go: { label: '<strong>G</strong>o to', hotkey: 'g' },
			deploy: { label: '<strong>D</strong>eploy', hotkey: 'd' }
		};
	case 'create':
		return {
			agent: { label: '<strong>A</strong>gent', hotkey: 'a' },
			group: { label: '<strong>G</strong>roup', hotkey: 'g' },
			formation: { label: '<strong>F</strong>ormation', hotkey: 'f' }
		};
	}
	return null;
};

module.exports = Agent;