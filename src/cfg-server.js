var util = require('./util');
var esc = util.escapeHTML;

local.addServer('hello-world', function(req, res) {
	res.setHeader('link', [{ href: '/', rel: 'self todorel.com/agent', title: 'Hello World', 'query-rel': 'service' }]);
	res.writeHead(200, 'OK', {'Content-Type': 'text/html'}).end('<div style="margin:5px">Hello, world</div>');
});

local.addServer('time', function(req, res) {
	res.setHeader('link', [{ href: '/', rel: 'self service', title: 'Time' }]);
	res.writeHead(200, 'OK', {'Content-Type': 'text/html'}).end('<div style="margin:5px"><b class="glyphicon glyphicon-time"></b> '+(new Date()).toLocaleString()+'</div>');
});

function CfgServer(opts) {
	local.Server.call(this, opts);

	this.agents = [];
	this.services = [];

	// :DEBUG:
	this.agents.push({
		href: 'local://hello-world',
		rel: 'todorel.com/agent',
		'query-rel': 'service',
		title: 'Hello World'
	});
}
CfgServer.prototype = Object.create(local.Server.prototype);
module.exports = CfgServer;

CfgServer.prototype.queryAgents = function(searchLinks) {
	return this.agents.filter(function(agentLink) {
		var rel = agentLink['query-rel'];
		if (!rel) return;
		if (local.queryLinks(searchLinks, { rel: rel })[0]) {
			return true;
		}
		return false;
	});
};

CfgServer.prototype.handleLocalRequest = function(req, res) {
	if (req.path == '/') {
		this.root(req, res);
	} else {
		res.writeHead(404).end();
	}
};

CfgServer.prototype.root = function(req, res) {
	res.header('Link', [{ href: '/', rel: 'self service', title: 'Program Loader' }]);
	res.header('Content-Type', 'text/html');
	/**/ if (req.method == 'HEAD') { res.writeHead(204).end(); }
	else if (req.method == 'GET')  { this.rootGET(req, res); }
	else if (req.method == 'POST') { this.rootPOST(req, res); }
	else /***********************/ { res.writeHead(405).end(); }
};

CfgServer.prototype.rootGET = function(req, res) {
	res.writeHead(200, 'OK');
	res.end(this.rootRenderHTML());
};

CfgServer.prototype.rootPOST = function(req, res) {
	var self = this;
	req.on('end', function() {
		if (!req.body || !req.body.url) {
			res.writeHead(422, 'Bad Ent');
			res.end(self.rootRenderHTML('<p class="text-danger">URL is required</p>'));
			return;
		}

		function prepLink(link) {
			link.rel = link.rel.split(' ').filter(function(r) { return (r != 'self'); }).join(' ');
		}

		util.fetchMeta(req.body.url)
			.fail(function(res2) {
				var resReason = 'Got from upstream: '+esc(res2.status)+' '+esc(res2.reason||'');
				var resSummary = '<p>Error: '+esc(res2.status)+' '+esc(res2.reason||'');
				if (!res2.status) {
					resSummary += ' (Does not exist or not allowed to access.)';
				}
				resSummary += '</p>';

				res.writeHead(502, resReason);
				res.end(self.rootRenderHTML(resSummary));
			})
			.then(function(res2) {
				var agentLink = local.queryLinks(res2, { rel: 'self todorel.com/agent' })[0];
				var serviceLink;
				if (agentLink) {
					prepLink(agentLink);
					self.agents.push(agentLink);
				} else {
					serviceLink = local.queryLinks(res2, { rel: 'self service' })[0];
					if (!serviceLink) {
						serviceLink = { href: req.body.url, title: req.body.url, rel: 'self service' };
					}
					prepLink(serviceLink);
					self.services.push(serviceLink);
				}

				res.writeHead(200, 'OK');
				res.end(self.rootRenderHTML());
			});
	});
};

CfgServer.prototype.rootRenderHTML = function(formMsg) {
	var html = '';
	html += '<div style="margin: 5px">';

	// agents
	html += '<table class="table"><tr><th style="min-width:200px">Agent</th><th style="min-width:100px">Target</th></tr>';
	this.agents.forEach(function(agentLink) {
		html += '<tr><td><a href="'+esc(agentLink.href)+'">'+esc(agentLink.title)+'</a></td>';
		html += '<td>'+esc(agentLink['query-rel'])+'</td></tr>';
	});
	html += '</table>';

	html += '<br>';

	// services
	html += '<table class="table"><tr><th style="min-width:200px">Service</th><th style="min-width:100px">Type</th></tr>';
	this.services.forEach(function(serviceLink) {
		html += '<tr><td><a href="'+esc(serviceLink.href)+'">'+esc(serviceLink.title)+'</a></td>';
		html += '<td>'+esc(serviceLink.rel)+'</td></tr>';
	});
	html += '</table>';

	// form
	html += '<form action="/" method="POST" class="form-inline">';
	html +=   '<div class="form-group">';
	html +=     '<label class="sr-only" for="url">URL</label>';
	html +=     '<input type="text" name="url" placeholder="Enter URL" class="form-control">';
	html +=   '</div>';
	if (formMsg) html += formMsg;
	html +=   '<button type="submit" class="btn btn-primary">Add</button>';
	html += '</form>';

	html += '</div>';
	return html;
};