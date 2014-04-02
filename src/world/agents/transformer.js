var Agent = require('./base-agent');

function Transformer(opts) {
	Agent.call(this, opts);
}
Transformer.prototype = Object.create(Agent.prototype);
module.exports = Transformer;