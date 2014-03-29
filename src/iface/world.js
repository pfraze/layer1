var Menu = require('./menu');
var MenuControls = require('../controls').Menu;

function WorldInterface() {
	this.mainMenu = new Menu(document.getElementById('menu'));
	this.mainMenuControls = new MenuControls(this.mainMenu);
	this.mainMenuCursor = [];

	this.selectedWorldItems = null;
}
module.exports = WorldInterface;
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

	this.recreateMenu();
	this.mainMenuControls.setup();
};

// called when the active selection has changed
WorldInterface.prototype.setWorldSelection = function(items) {
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

// :TEMP:
function getDefaultMenudoc(path) {
	switch (path) {
	case '/':
		return {
			submenu: [
				{ name: 'create', label: '(C)reate', hotkey: 'c' },
			]
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
}