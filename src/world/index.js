var Agent = require('./agent');

function World() {
	this.scene = null;

	this.agents = [];
	this.agentIdMap = {};

	this.selectedItems = [];
}
module.exports = new World();

World.prototype.setup = function(scene) {
	this.scene = scene;
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
};