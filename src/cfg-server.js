var util = require('./util');
var esc = util.escapeHTML;

function CfgServer(opts) {
	local.Server.call(this, opts);

	this.agents = [];

	// :DEBUG:
	this.agents.push({
		href: 'httpl://service-agent',
		rel: 'todorel.com/agent',
		'query-rel': 'service',
		title: 'Service Agent'
	});
}
CfgServer.prototype = Object.create(local.Server.prototype);
module.exports = CfgServer;

CfgServer.prototype.handleLocalRequest = function(req, res) {
	if (req.path == '/') {
		this.root(req, res);
	} else {
		res.writeHead(404).end();
	}
};

CfgServer.prototype.root = function(req, res) {
	if (req.method == 'GET') {
		this.rootGET(req, res);
	} else if (req.method == 'POST') {
		this.rootPOST(req, res);
	} else {
		res.writeHead(405).end();
	}
};

CfgServer.prototype.rootGET = function(req, res) {
	res.writeHead(200, 'OK', {'Content-Type':'text/html'});
	res.end(this.rootRenderHTML());
};

CfgServer.prototype.rootPOST = function(req, res) {
	var self = this;
	req.on('end', function() {
		res.writeHead(200, 'OK', {'Content-Type':'text/html'});
		res.end(self.rootRenderHTML('<p>TODO</p>'));
	});
};

CfgServer.prototype.rootRenderHTML = function(formMsg) {
	var html = '';
	html += '<div style="margin: 5px">';
	html += '<table class="table"><tr><th>Agent</th><th>Target</th></tr>';
	this.agents.forEach(function(agentLink) {
		html += '<tr><td><a href="'+esc(agentLink.href)+'">'+esc(agentLink.title)+'</a></td>';
		html += '<td>'+esc(agentLink['query-rel'])+'</td></tr>';
	});
	html += '</table>';
	html += '<form action="/" method="POST" class="form-inline">';
	html +=   '<div class="form-group">';
	html +=     '<label class="sr-only" for="url">URL</label>';
	html +=     '<input type="url" name="url" placeholder="Enter URL" class="form-control">';
	html +=   '</div>';
	if (formMsg) html += formMsg;
	html +=   '<button type="submit" class="btn btn-primary">Add Agent</button>';
	html += '</form>';
	html += '</div>';
	return html;
};