var util = require('./util');
var esc = util.escapeHTML;

function AgentServer(opts) {
	local.Server.call(this, opts);
}
AgentServer.prototype = Object.create(local.Server.prototype);
module.exports = AgentServer;

AgentServer.prototype.handleLocalRequest = function(req, res) {
	if (req.path == '/') {
		this.root(req, res);
	} else {
		var agentId = req.path.slice(1);
		var agent = world.getAgent(agentId);
		if (!agent) { return res.writeHead(404).end(); }
		this.agent(req, res, agent);
	}
};

AgentServer.prototype.root = function(req, res) {
	if (req.method == 'GET') {
		this.rootGET(req, res);
	} else {
		res.writeHead(405, 'Bad Method').end();
	}
};

AgentServer.prototype.rootGET = function(req, res) {
	res.writeHead(200, 'OK', {'Content-Type':'text/html'});
	res.end(this.rootRenderHTML());
};

AgentServer.prototype.rootRenderHTML = function(formMsg) {
	return 'todo';
};

AgentServer.prototype.agent = function(req, res, agent) {
	if (req.method == 'DELETE') {
		this.agentDELETE(req, res, agent);
	} else {
		res.writeHead(405, 'Bad Method').end();
	}
};

AgentServer.prototype.agentDELETE = function(req, res, agent) {
	if (world.kill(agent)) {
		res.writeHead(307, 'Ok, Redirect to Null').end();
	} else {
		res.writeHead(404, 'Not Found').end();
	}

};