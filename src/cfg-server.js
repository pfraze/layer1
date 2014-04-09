var util = require('./util');
var esc = util.escapeHTML;

local.addServer('hello-world', function(req, res) {
	res.setHeader('link', [{ href: '/', rel: 'self todorel.com/agent', title: 'Hello World Agent', 'query-rel': 'collection' }]);
	res.writeHead(200, 'OK', {'Content-Type': 'text/html'}).end('<div style="margin:5px">Hello, world</div>');
});

function CfgServer(opts) {
	local.Server.call(this, opts);

	this.agents = [];

	// :DEBUG:
	this.agents.push({
		href: 'local://hello-world',
		rel: 'todorel.com/agent',
		'query-rel': 'service',
		title: 'Hello World Agent'
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
		if (!req.body || !req.body.url) {
			res.writeHead(422, 'Bad Ent', {'Content-Type':'text/html'});
			res.end(self.rootRenderHTML('<p class="text-danger">URL is required</p>'));
			return;
		}

		util.fetchMeta(req.body.url)
			.fail(function(res2) {
				var resSummary;
				if (res2.status) {
					resSummary = esc(res2.status)+' '+esc(res2.reason||'');
				} else {
					resSummary = 'Does not exist or not allowed to access.';
				}

				res.writeHead(502, 'Bad Upstream', {'Content-Type':'text/html'});
				res.end(self.rootRenderHTML('<p>Error: '+resSummary+'</p>'));
			})
			.then(function(res2) {
				var agentLink = local.queryLinks(res2, { rel: 'self todorel.com/agent' })[0];
				if (!agentLink) {
					res.writeHead(502, 'Bad Upstream', {'Content-Type':'text/html'});
					res.end(self.rootRenderHTML('<p>No agent link found</p>'));
					return;
				}

				self.agents.push(agentLink);
				res.writeHead(200, 'OK', {'Content-Type':'text/html'});
				res.end(self.rootRenderHTML());
			});
	});
};

CfgServer.prototype.rootRenderHTML = function(formMsg) {
	var html = '';
	html += '<div style="margin: 5px">';
	html += '<table class="table"><tr><th style="min-width:200px">Agent</th><th style="min-width:100px">Target</th></tr>';
	this.agents.forEach(function(agentLink) {
		html += '<tr><td><a href="'+esc(agentLink.href)+'">'+esc(agentLink.title)+'</a></td>';
		html += '<td>'+esc(agentLink['query-rel'])+'</td></tr>';
	});
	html += '</table>';
	html += '<form action="/" method="POST" class="form-inline">';
	html +=   '<div class="form-group">';
	html +=     '<label class="sr-only" for="url">URL</label>';
	html +=     '<input type="text" name="url" placeholder="Enter URL" class="form-control">';
	html +=   '</div>';
	if (formMsg) html += formMsg;
	html +=   '<button type="submit" class="btn btn-primary">Add Agent</button>';
	html += '</form>';
	html += '</div>';
	return html;
};