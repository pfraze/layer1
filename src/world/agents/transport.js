var Agent = require('./base-agent');

function Transport(opts) {
	Agent.call(this, opts);
}
Transport.prototype = Object.create(Agent.prototype);
module.exports = Transport;