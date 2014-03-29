var Agent = require('./agent');
var Menu = require('./menu');
var getDefaultMenudoc = require('./unselected-menu');

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

	this.mainMenu.addEventListener('select', this.onMenuSelect.bind(this));
	this.mainMenu.addEventListener('unselect', this.onMenuUnselect.bind(this));
	this.mainMenu.addEventListener('reset', this.onMenuReset.bind(this));
	this.onMenuReset();

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

World.prototype.onMenuSelect = function(e) {
	this.mainMenuCursor.push(e.item);
	this.recreateMenu();
};

World.prototype.onMenuUnselect = function(e) {
	this.mainMenuCursor.pop();
	this.recreateMenu();
};

World.prototype.onMenuReset = function(e) {
	this.mainMenuCursor.length = 0;
	this.recreateMenu();
};

World.prototype.recreateMenu = function() {
	// get menudoc endpoint
	var item = this.selectedItems[0];
	var getMenuDoc = (item) ? item.getMenuDoc.bind(item) : getDefaultMenudoc;
	var path = '/' + this.mainMenuCursor.join('/');

	// fetch menudoc and update menu
	this.mainMenu.set(getMenuDoc(path));
};