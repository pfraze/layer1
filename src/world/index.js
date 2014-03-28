var Agent = require('./agent');
var Menu = require('./menu');

function World() {
	this.scene = null;
	this.mainMenu = new Menu(document.getElementById('menu'));

	this.agents = [];
	this.agentIdMap = {};

	this.selectedItems = [];
}
module.exports = new World();
World.prototype.getMainMenu = function() { return this.mainMenu; };

World.prototype.setup = function(scene) {
	this.scene = scene;
	this.mainMenu.addEventListener('execute', this.onMenuExecute.bind(this));
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

		// set menu
		this.mainMenu.setCommands(this.selectedItems[0].getMenu()); // :TODO: multiple selections
	} else {
		this.selectedItems.length = 0;
		this.mainMenu.setCommands(null);
	}
};

World.prototype.onMenuExecute = function(e) {
	var item = this.selectedItems[0];
	if (!item) { throw "Menu execute but no selected item"; }
	this.mainMenu.setCmds(item.getMenu(e.cmd.id));
};