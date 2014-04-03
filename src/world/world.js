var AgentTypes = require('./agents');
var WorldInterface = require('../iface').World;
var WorldControls = require('../controls').World;

var WORLD_SIZE = 5000;

function World() {
	this.scene = null;
	this.iface = new WorldInterface(this);
	this.controls = new WorldControls(this);

	this.agents = {};

	this.selectedItems = [];
}
module.exports = new World();

World.prototype.setup = function(scene) {
	this.scene = scene;

	// create background
	// var gridEl = document.createElement('div');
	// gridEl.id = 'grid-bg';
	// gridEl.style.width = WORLD_SIZE+'px';
	// gridEl.style.height = WORLD_SIZE+'px';
	// this.gridBg = new THREE.CSS3DObject(gridEl);
	// this.gridBg.position.z = -10;
	// this.scene.add(this.gridBg);

	// setup subcomponents
	this.iface.setup();
	this.controls.setup();
};

World.prototype.getAgent = function(idOrEl) {
	var id = (idOrEl instanceof HTMLElement) ? idOrEl.id.slice(7) : idOrEl;
	return this.agents[id];
};

World.prototype.getSelection = function() {
	return this.selectedItems;
};

World.prototype.spawnAgent = function(opts) {
	var type = opts ? opts.type : undefined;
	var AgentCtor = AgentTypes[type];
	if (!AgentCtor) AgentCtor = AgentTypes.service;

	var agent = new AgentCtor(opts);
	agent.setup();
	this.agents[agent.id] = agent;
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

World.prototype.selectionDispatch = function(req) {
	// :TEMP:
	if (req.method == 'SPAWN') {
		this.spawnAgent(req.body);
	}
	else if (req.method == 'MOVE') {
		this.selectedItems.forEach(function(item) {
			new TWEEN.Tween({ x: item.position.x, y: item.position.y } )
				.to({ x: req.body.dest.x, y: req.body.dest.y }, 300)
				.easing(TWEEN.Easing.Quadratic.InOut)
				.onUpdate(function () { item.position.set(this.x, this.y, 0); })
				.start();
			// item.position.copy(req.body.dest);
		});
	} else {
		throw "Unknown method: "+method;
	}
};