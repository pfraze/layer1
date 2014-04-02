var Agent = require('./base-agent');

function Collection(opts) {
	Agent.call(this, opts);
	this.element.style.backgroundImage = 'url(img/icons/document_folder.png)';
}
Collection.prototype = Object.create(Agent.prototype);
module.exports = Collection;