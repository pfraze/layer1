var util = require('./util');
var esc = util.escapeHTML;

function EntityServer(opts) {
	local.Server.call(this, opts);
}
EntityServer.prototype = Object.create(local.Server.prototype);
module.exports = EntityServer;

EntityServer.prototype.handleLocalRequest = function(req, res) {
	if (req.path == '/') {
		this.root(req, res);
	} else {
		var entId = req.path.slice(1);
		var ent = world.getEntity(entId);
		if (!ent) { return res.writeHead(404).end(); }
		this.entity(req, res, ent);
	}
};

EntityServer.prototype.root = function(req, res) {
	if (req.method == 'GET') {
		this.rootGET(req, res);
	} else {
		res.writeHead(405, 'Bad Method').end();
	}
};

EntityServer.prototype.rootGET = function(req, res) {
	res.writeHead(200, 'OK', {'Content-Type':'text/html'});
	res.end(this.rootRenderHTML());
};

EntityServer.prototype.rootRenderHTML = function(formMsg) {
	return 'todo';
};

EntityServer.prototype.entity = function(req, res, ent) {
	if (req.method == 'DELETE') {
		this.entityDELETE(req, res, ent);
	} else {
		res.writeHead(405, 'Bad Method').end();
	}
};

EntityServer.prototype.entityDELETE = function(req, res, ent) {
	if (world.kill(ent)) {
		res.writeHead(307, 'Ok, Redirect to Null').end();
	} else {
		res.writeHead(404, 'Not Found').end();
	}

};