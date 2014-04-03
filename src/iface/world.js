var Menu = require('./menu');
var MenuControls = require('../controls').Menu;

function WorldInterface(world) {
	this.world = world;

	this.mainMenu = new Menu(document.getElementById('menu'));
	this.mainMenuControls = new MenuControls(this.mainMenu);
	this.mainMenuCursor = [];

	this.selectedWorldItems = null;
}
module.exports = WorldInterface;
WorldInterface.prototype = Object.create(THREE.EventDispatcher.prototype);
WorldInterface.prototype.getMainMenu = function() { return this.mainMenu; };

WorldInterface.prototype.setup = function() {
	var self = this;
	this.mainMenu.addEventListener('select', function(e) {
		self.mainMenuCursor.push(e.item);
		self.recreateMenu();
	});
	this.mainMenu.addEventListener('unselect', function(e) {
		self.mainMenuCursor.pop();
		self.recreateMenu();
	});
	this.mainMenu.addEventListener('reset', function(e) {
		self.mainMenuCursor.length = 0;
		self.recreateMenu();
	});
	this.mainMenu.addEventListener('submit', this.onFormSubmit.bind(this));

	this.recreateMenu();
	this.mainMenuControls.setup();
};

// called when the active selection has changed
WorldInterface.prototype.updateWorldSelection = function(items) {
	this.selectedWorldItems = items;

	// reset menu for new selection
	this.mainMenuCursor.length = 0;
	this.recreateMenu();
};

WorldInterface.prototype.recreateMenu = function() {
	// get menudoc endpoint
	var item = (this.selectedWorldItems) ? this.selectedWorldItems[0] : null;
	var getMenuDoc = (item) ? item.getMenuDoc.bind(item) : getDefaultMenudoc;
	var path = '/' + this.mainMenuCursor.join('/');

	// fetch menudoc and update menu
	this.mainMenu.set(getMenuDoc(path));
};

WorldInterface.prototype.onFormSubmit = function(e) {
	this.world.selectionDispatch({
		method: this.mainMenu.doc.method.toUpperCase(),
		body: this.mainMenu.makeFormBody()
	});
	this.mainMenu.reset();
};

// :TEMP:
function getDefaultMenudoc(path) {
	switch (path) {
	case '/':
		return {
			title: 'World',
			submenu: [
				{ name: 'spawn', label: '(S)pawn', hotkey: 's' },
			]
		};
	case '/spawn':
		return {
			title: 'World',
			submenu: [
				{ name: 'service', label: '(S)ervice', hotkey: 's' }
			]
		};
	case '/spawn/service':
		return {
			title: 'World',
			method: 'SPAWN',
			form: [{ type: 'text', name: 'url', label: 'URL' }, { type: 'hidden', name: 'type', value: 'service' }]
		};
	}
	return null;
}