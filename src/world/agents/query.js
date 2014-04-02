var Agent = require('./base-agent');

function Query(opts) {
	Agent.call(this, opts);
}
Query.prototype = Object.create(Agent.prototype);
module.exports = Query;