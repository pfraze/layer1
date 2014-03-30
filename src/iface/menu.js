
function Menu(el) {
	this.doc = null;
	this.el = el;

	this.addEventListener('input', this.onInput.bind(this));

	this.activeFormItem = null;
	this.formValues = [];
}
Menu.prototype = Object.create(THREE.EventDispatcher.prototype);

Menu.prototype.set = function(doc) {
	this.doc = doc;
	this.activeFormItem = 0;
	this.formValues.length = 0;

	this.el.innerHTML = this.render();
};

Menu.prototype.reset = function() {
	this.set(null);
	this.dispatchEvent({ type: 'reset' });
};

Menu.prototype.getActiveFormItem = function() {
	if (!this.doc || !this.doc.form || this.activeFormItem === null) { return null; }
	return this.doc.form[this.activeFormItem];
};
Menu.prototype.getFormValues = function() { return this.formValues; };

Menu.prototype.render = function() {
	if (!this.doc) return '';
	var html = '', i;
	if (this.doc.form) {
		html += '<p>'+(this.doc.method||'POST').toUpperCase()+'</p>';
		for (i=0; i < this.doc.form.length; i++) {
			var fi = this.doc.form[i];
			var a = (i === this.activeFormItem);
			html += '<div class="form-item form-item-'+fi.type+' '+((a)?'form-item-active':'')+'" type="'+fi.type+'">'+this.renderFormItem(fi, a)+'</div>';
		}
	}
	if (this.doc.submenu) {
		var lis = [];
		for (i=0; i < this.doc.submenu.length; i++) {
			lis.push('<li><a class="menu-item" name="'+this.doc.submenu[i].name+'" href="javascript:void()">'+this.doc.submenu[i].label+'</a></li>');
		}
		html += '<ul>'+lis.join('')+'</ul>';
	}
	return html;
};

Menu.prototype.renderFormItem = function(formItem, isActive) {
	switch (formItem.type) {
	case 'text':
		var ctrl = (!formItem.rows || formItem.rows == 1) ? '<input type="text">' : '<textarea rows="'+formItem.rows+'"></textarea>';
		return '<p>'+formItem.label+'<br>'+ctrl+'</p>';
	case 'position':
		return '<p>'+formItem.label+' <small>Left-click on the map to choose the position</small></p>';
	case 'direction':
		return '<p>'+formItem.label+' <small>Left-click and drag to choose the direction</small></p>';
	case 'region':
		return '<p>'+formItem.label+' <small>Left-click and drag to create the region</small></p>';
	case 'agent':
		if (formItem.multiple) {
			return '<p>'+formItem.label+' <small>Left-click on agents on the map</small></p>';
		}
		return '<p>'+formItem.label+' <small>Left-click an agent on the map</small></p>';
	}
	return '<p>Form item type "'+formItem.type+'" is not valid.</p>';
};

Menu.prototype.onInput = function(e) {
	var fi = this.getActiveFormItem();
	if (fi && fi.type == e.valueType) {
		// Update form
		this.formValues[this.activeFormItem] = e.value;
		this.activeFormItem++;

		// Done? Emit submit
		if (this.activeFormItem >= this.doc.form.length) {
			this.dispatchEvent({ type: 'submit', values: this.formValues });
		}
	} else {
		console.error(e, fi);
		throw "Input event fired, but no active form item (or mismatched)";
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

Menu.prototype.makeFormBody = function() {
	var body = {};
	for (i=0; i < this.doc.form.length; i++) {
		body[this.doc.form[i].name] = this.formValues[i];
	}
	return body;
};

module.exports = Menu;