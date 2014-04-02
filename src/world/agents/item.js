var Agent = require('./base-agent');

function Item(opts) {
	Agent.call(this, opts);
	this.element.style.backgroundImage = 'url(img/icons/document_index.png)';
}
Item.prototype = Object.create(Agent.prototype);
module.exports = Item;