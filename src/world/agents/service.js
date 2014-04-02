var Agent = require('./base-agent');

function Service(opts) {
	Agent.call(this, opts);

	// setup visuals
	this.element.style.backgroundImage = 'url(img/icons/computer.png)';

	// load data about endpoint
	this.fetchMeta();
}
Service.prototype = Object.create(Agent.prototype);
module.exports = Service;

/*Service.prototype.getMenuDoc = function(path) {
	switch (path) {
	case '/':
		return {
			submenu: [
				{ name: 'action', label: '(A)ction', hotkey: 'a' },
			]
		};
	case '/action':
		return {
			submenu: [
				{ name: 'go', label: '(G)o to', hotkey: 'g' }
			]
		};
	case '/action/go':
		return {
			method: 'MOVE',
			form: [{ type: 'position', name: 'dest', label: 'Destination' }]
		};
	}
	return null;
};*/