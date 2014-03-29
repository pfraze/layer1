
function Menu(el) {
	this.doc = null;
	this.el = el;
}
Menu.prototype = Object.create(THREE.EventDispatcher.prototype);

Menu.prototype.set = function(doc) {
	this.doc = doc;
	this.el.innerHTML = this.render();
};

Menu.prototype.render = function() {
	if (!this.doc) return '';
	if (this.doc.submenu) {
		var lis = [];
		for (var i=0; i < this.doc.submenu.length; i++) {
			lis.push('<li><a class="menu-item" name="'+this.doc.submenu[i].name+'" href="javascript:void()">'+this.doc.submenu[i].label+'</a></li>');
		}
		return '<ul>'+lis.join('')+'</ul>';
	}
};

Menu.prototype.hotkeyToItemName = function(c) {
	if (!this.doc.submenu) return null;
	for (var i=0; i < this.doc.submenu.length; i++) {
		if (this.doc.submenu[i].hotkey === c)
			return this.doc.submenu[i].name;
	}
	return null;
};

module.exports = Menu;