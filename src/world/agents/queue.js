var Agent = require('./base-agent');

function Queue(opts) {
	Agent.call(this, opts);
}
Queue.prototype = Object.create(Agent.prototype);
module.exports = Queue;