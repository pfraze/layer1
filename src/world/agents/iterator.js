var Agent = require('./base-agent');

function Iterator(opts) {
	Agent.call(this, opts);
}
Iterator.prototype = Object.create(Agent.prototype);
module.exports = Iterator;