var Entity = require('./entity');
var Component = require('./component');
var SystemAgent = require('./system');

var Agent = require('./agent');
var WorldInterface = require('../iface').World;
var WorldControls = require('../controls').World;

var WORLD_SIZE = 5000;

function World() {
	this.scene = null;
	this.iface = new WorldInterface(this);
	this.controls = new WorldControls(this);

	this.entities = [];
	this.components = {};
	this.systems = [];
	this._systemTickPos = -1;

	this.agents = [];
	this.agentIdMap = {};

	this.selectedItems = [];
}
module.exports = new World();

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

	// setup subcomponents
	this.iface.setup();
	this.controls.setup();

	// :DEBUG: spawn an agent
	this.spawnAgent();
};

// run once a frame
World.prototype.tick = function() {
	var self = this;
	if (this._systemTickPos != -1) {
		console.error('World tick called with '+(this.systems.length-this._systemTickPos)+' items still in the queue; skipping tick');
		return;
	}

	// for now, simple ordered scheduling
	// - possible improvements:
	//  - add sync dispatch to local for thread-local servers
	//  - parallelize systems with no overlap in the datasets they operate on

	function handleTickSuccess(res) {
		if (res.body) {
			// was sent {comtype: {entid: {values} }}
			// returned same, but only with changed values so mix them in
			for (var comtype in res.body) {
				var coms = res.body[comtype];
				for (var entid in coms) {
					// :TODO: validation of all kinds
					self.entities[entid].components[comtype].mixin(coms[entid]);
				}
			}
		}
		doNextSystem();
	}

	function handleTickFail(res) {
		console.error('Tick failed for system', self._systemTickPos, self.systems[self._systemTickPos]);
		doNextSystem();
	}

	function doNextSystem() {
		// update queue position
		self._systemTickPos++;
		if (self._systemTickPos >= self.systems.length) { return; } // done
		var system = self.systems[self._systemTickPos];

		// collect components the system operates on
		var body = {};
		var types = system.getComponentTypes();
		for (var i=0; i < types.length; i++) { body[types[i]] = self.components[types[i]]; }

		// send tick request
		system.TICK(body).then(handleTickSuccess, handleTickFail);
	}
	doNextSystem();
};

// Entity System
// =============
// - `entdoc` = { comtype: {initvalues}|false }
World.prototype.addent = function(entdoc) {
	var ent = new Entity(this.entities.length);
	// init components
	for (var reltype in entdoc) {
		var initValues = entdoc[reltype];
		// put new component in entity and in the global list
		ent.addcom(this.addcom(ent.id, reltype, initValues));
	}
	this.entities.push(ent);
	return ent;
};

World.prototype.delent = function(ent) {
	for (var reltype in ent.components) {
		this.delcom(ent.components[reltype]);
	}
	delete this.entities[ent.id];
	// leave gap in array
};

World.prototype.addcom = function(entid, reltype, initValues) {
	if (!this.components[reltype]) { this.components[reltype] = {}; }
	var com = new Component(entid, reltype, initValues);
	this.components[reltype][entid] = com;
	return com;
};

World.prototype.delcom = function(com) {
	delete this.components[com.reltype][com.entid];
};


// Agents System
// =============

World.prototype.getAgent = function(idOrEl) {
	var id = (idOrEl instanceof HTMLElement) ? idOrEl.id.slice(7) : idOrEl;
	return this.agentIdMap[id];
};

World.prototype.spawnAgent = function(opts) {
	var agent = new Agent(opts);
	this.agentIdMap[agent.id] = agent;
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

World.prototype.selectionDispatch = function(method, body) {
	// :TEMP:
	if (method == 'MOVE') {
		this.selectedItems.forEach(function(item) { item.position.copy(body.dest); });
	}
};