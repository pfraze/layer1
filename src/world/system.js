function SystemAgent(url) {
	// :TODO: add support for url in local.Agent constructor
	local.Agent.call(this, url);
	this.comtypes = [];

	// Fetch system definition
	var self = this;
	this.GET().then(function(res) {
		if (res.body && res.body.comtypes) {
			self.comtypes = res.body.comtypes;
		}
	}, function(res) { console.error('Failed to fetch system definition', self, res); });
}
SystemAgent.prototype = Object.create(local.Agent.prototype);
module.exports = SystemAgent;

SystemAgent.prototype.getComponentTypes = function() { return this.comtypes; };

SystemAgent.prototype.TICK = function(body) {
	return this.dispatch({ method: 'TICK', body: body, Content_Type: 'application/json', Accept: 'application/json' });
};