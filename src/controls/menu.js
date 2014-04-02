function MenuControls(menu, domElement) {
	this.menu = menu;
	this.domElement = domElement || document.body;
}
module.exports = MenuControls;

MenuControls.prototype.setup = function() {
	document.body.addEventListener('keydown', this.onKeyDown.bind(this), false);
	document.body.addEventListener('keypress', this.onKeyPress.bind(this), false);
	document.body.addEventListener('click', this.onClick.bind(this), true); // on bubble
};

MenuControls.prototype.onKeyDown = function(e) {
	if (e.keyCode == 27) { // escape, must be handled in keydown (not supported in keypress in all browsers)
		this.menu.dispatchEvent({ type: 'unselect' }); // go back
	}
};

MenuControls.prototype.onKeyPress = function(e) {
	var c = String.fromCharCode(e.which||e.keyCode);

	// awaiting a keypress
	var fi = this.menu.getActiveFormItem();
	if (fi && fi.type == 'text') {
		if (e.target.tagName == 'INPUT' && e.which == 13) {
			this.menu.dispatchEvent({ type: 'input', valueType: 'text', value: e.target.value });
			e.preventDefault();
		}
		e.stopPropagation();
		return;
	}

	// menu hotkey
	var id = this.menu.hotkeyToItemName(c);
	if (id) {
		this.menu.dispatchEvent({ type: 'select', item: id });
	}
};

MenuControls.prototype.onClick = function(e) {
	if (e.which !== 1) return; // left click only

	// menu items
	var itemEl = local.util.findParentNode.byClass(e.target, 'menu-item');
	if (itemEl && itemEl.attributes.getNamedItem('name')) {
		this.menu.dispatchEvent({ type: 'select', item: itemEl.attributes.getNamedItem('name').value });
		e.preventDefault();
		e.stopPropagation();
		return;
	}

	// in a form
	var fi = this.menu.getActiveFormItem();
	if (fi) {
		// awaiting a click
		if (fi.type == 'position') {
			var pos = new THREE.Vector3();
			window.cameraControls.getMouseInWorld(e, pos);
			this.menu.dispatchEvent({ type: 'input', valueType: 'position', value: pos });
		}
		// stop event
		e.preventDefault();
		e.stopPropagation();
	}
};