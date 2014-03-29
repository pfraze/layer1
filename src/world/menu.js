
function Menu(el) {
	this.commands = null;
	this.el = el;
}
Menu.prototype = Object.create(THREE.EventDispatcher.prototype);

Menu.prototype.getCommands = Menu.prototype.getCmds = function() { return this.commands; };
Menu.prototype.getCommand = Menu.prototype.getCmd = function(id) { return this.commands[id]; };

Menu.prototype.setCommands = Menu.prototype.setCmds = function(commands) {
	this.commands = commands;
	for (var id in this.commands) { this.commands[id].id = id; }
	this.el.innerHTML = this.renderMenu();
};

Menu.prototype.renderMenu = function() {
	if (!this.commands) return '';
	var lis = [];
	for (var id in this.commands) {
		lis.push('<li><a class="menu-cmd" data-cmd="'+id+'" href="javascript:void()">'+this.commands[id].label+'</a></li>');
	}
	return '<ul>'+lis.join('')+'</ul>';
};

Menu.prototype.hotkeyToCmdId = function(c) {
	for (var id in this.commands) {
		if (this.commands[id].hotkey == c)
			return id;
	}
	return null;
};

module.exports = Menu;