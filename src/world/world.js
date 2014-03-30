var Agent = require('./agent');
var WorldInterface = require('../iface').World;
var WorldControls = require('../controls').World;

var WORLD_SIZE = 5000;

function World() {
	this.scene = null;
	this.iface = new WorldInterface(this);
	this.controls = new WorldControls(this);

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