var Agent = require('./agent');
var Menu = require('./menu');

var WORLD_SIZE = 5000;

function World() {
	this.scene = null;
	this.mainMenu = new Menu(document.getElementById('menu'));
	this.mainMenuCursor = [];

	this.agents = [];
	this.agentIdMap = {};

	this.selectedItems = [];
}
module.exports = new World();
World.prototype.getMainMenu = function() { return this.mainMenu; };

World.prototype.setup = function(scene) {
	this.scene = scene;

	this.mainMenu.addEventListener('execute', this.onMenuExecute.bind(this));
	this.mainMenu.addEventListener('reset', this.onMenuReset.bind(this));

	// create background
	var gridEl = document.createElement('div');
	gridEl.id = 'grid-bg';
	gridEl.style.width = WORLD_SIZE+'px';
	gridEl.style.height = WORLD_SIZE+'px';
	this.gridBg = new THREE.CSS3DObject(gridEl);
	this.gridBg.position.z = -10;
	this.scene.add(this.gridBg);

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

	// set menu
	this.onMenuReset();
};

World.prototype.onMenuExecute = function(e) {
	var item = this.selectedItems[0];
	if (!item) { throw "Menu execute but no selected item"; }
	this.mainMenuCursor.push(e.cmd.id);
	this.mainMenu.setCmds(item.getMenu(e.cmd.id));
	console.debug('main menu cursor', this.mainMenuCursor);
};

World.prototype.onMenuReset = function(e) {
	this.mainMenuCursor.length = 0;
	var item = this.selectedItems[0];
	if (!item) {
		this.mainMenu.setCmds(null);
	} else {
		this.mainMenu.setCmds(this.selectedItems[0].getMenu()); // :TODO: multiple selections
	}
};