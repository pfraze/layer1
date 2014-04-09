var util = require('./util');
var esc = util.escapeHTML;

local.addServer('hello-world', function(req, res) {
	res.setHeader('link', [{ href: '/', rel: 'self todorel.com/agent', title: 'Hello World Agent', 'query-rel': 'service' }]);
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
	res.header('Link', [{ href: '/', rel: 'self service', title: 'Base' }]);
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
		if (req.query.type != 'agent' && req.query.type != 'service') {
			return res.writeHead(404, 'Invalid ?type - must be "agent" or "service"').end();
		}
		if (!req.body || !req.body.url) {
			res.writeHead(422, 'Bad Ent');
			var agentErr   = (req.query.type == 'agent')   ? '<p class="text-danger">URL is required</p>' : null;
			var serviceErr = (req.query.type == 'service') ? '<p class="text-danger">URL is required</p>' : null;
			res.end(self.rootRenderHTML(agentErr, serviceErr));
			return;
		}

		util.fetchMeta(req.body.url)
			.fail(function(res2) {
				var resReason = 'Got from upstream: '+esc(res2.status)+' '+esc(res2.reason||'');
				var resSummary = '<p>Error: '+esc(res2.status)+' '+esc(res2.reason||'');
				if (!res2.status) {
					resSummary += ' (Does not exist or not allowed to access.)';
				}
				resSummary += '</p>';
				var agentSummary   = (req.query.type == 'agent')   ? resSummary : null;
				var serviceSummary = (req.query.type == 'service') ? resSummary : null;

				res.writeHead(502, resReason);
				res.end(self.rootRenderHTML(agentSummary, serviceSummary));
			})
			.then(function(res2) {
				if (req.query.type == 'agent') {
					var agentLink = local.queryLinks(res2, { rel: 'self todorel.com/agent' })[0];
					if (!agentLink) {
						res.writeHead(502, 'self+todorel.com/agent link not found in Link header');
						res.end(self.rootRenderHTML('<p>Not an agent</p>', null));
						return;
					}
					self.agents.push(agentLink);
				} else if (req.query.type == 'service') {
					var serviceLink = local.queryLinks(res2, { rel: 'self service' })[0];
					if (!serviceLink) {
						res.writeHead(502, 'self+service link not found in Link header');
						res.end(self.rootRenderHTML(null, '<p>Not a service</p>'));
						return;
					}
					self.services.push(serviceLink);
				}

				res.writeHead(200, 'OK');
				res.end(self.rootRenderHTML());
			});
	});
};

CfgServer.prototype.rootRenderHTML = function(agentMsg, serviceMsg) {
	var html = '';
	html += '<div style="margin: 5px">';

	// agents
	html += '<table class="table"><tr><th style="min-width:200px">Agent</th><th style="min-width:100px">Target</th></tr>';
	this.agents.forEach(function(agentLink) {
		html += '<tr><td><a href="'+esc(agentLink.href)+'">'+esc(agentLink.title)+'</a></td>';
		html += '<td>'+esc(agentLink['query-rel'])+'</td></tr>';
	});
	html += '</table>';
	html += '<form action="/?type=agent" method="POST" class="form-inline">';
	html +=   '<div class="form-group">';
	html +=     '<label class="sr-only" for="url">URL</label>';
	html +=     '<input type="text" name="url" placeholder="Enter URL" class="form-control">';
	html +=   '</div>';
	if (agentMsg) html += agentMsg;
	html +=   '<button type="submit" class="btn btn-primary">Add Agent</button>';
	html += '</form>';

	html += '<br>';

	// services
	html += '<table class="table"><tr><th style="min-width:200px">Service</th><th style="min-width:100px">Type</th></tr>';
	this.services.forEach(function(serviceLink) {
		var type = serviceLink.rel.split(' ').filter(function(r) { return (r != 'self'); }).join(' ');
		html += '<tr><td><a href="'+esc(serviceLink.href)+'">'+esc(serviceLink.title)+'</a></td>';
		html += '<td>'+esc(type)+'</td></tr>';
	});
	html += '</table>';
	html += '<form action="/?type=service" method="POST" class="form-inline">';
	html +=   '<div class="form-group">';
	html +=     '<label class="sr-only" for="url">URL</label>';
	html +=     '<input type="text" name="url" placeholder="Enter URL" class="form-control">';
	html +=   '</div>';
	if (serviceMsg) html += serviceMsg;
	html +=   '<button type="submit" class="btn btn-primary">Add Service</button>';
	html += '</form>';

	html += '</div>';
	return html;
};