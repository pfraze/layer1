var util = require('./util');
var esc = util.escapeHTML;

function CfgServer(opts) {
	local.Server.call(this, opts);

	this.agents = [];
	this.services = [];
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
	var type = local.preferredType(req, ['text/html', 'application/json']);
	if (!type) { return res.writeHead(406).end(); }

	res.header('Link', [{ href: '/', rel: 'self service', title: 'Program Load' }]);
	res.header('Content-Type', type);

	/**/ if (req.method == 'HEAD') { res.writeHead(204).end(); }
	else if (req.method == 'GET')  { this.rootGET(req, res); }
	else if (req.method == 'POST') { this.rootPOST(req, res); }
	else /***********************/ { res.writeHead(405).end(); }
};

CfgServer.prototype.rootGET = function(req, res) {
	res.writeHead(200, 'OK');
	this.rootRender(req, res);
};

CfgServer.prototype.rootPOST = function(req, res) {
	var self = this;
	req.on('end', function() {
		if (!req.body || !req.body.url) {
			res.writeHead(422, 'Bad Ent');
			self.rootRender(req, res, 'URL is required');
			return;
		}

		function prepLink(link) {
			link.rel = link.rel.split(' ').filter(function(r) { return (r != 'self'); }).join(' ');
		}

		util.fetchMeta(req.body.url)
			.fail(function(res2) {
				var resReason = 'Got from upstream: '+esc(res2.status)+' '+esc(res2.reason||'');
				var resSummary = 'Error: '+esc(res2.status)+' '+esc(res2.reason||'');
				if (!res2.status) {
					resSummary += ' (Does not exist or not allowed to access.)';
				}

				res.writeHead(502, resReason);
				self.rootRender(req, res, resSummary);
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

				if (res.header('Content-Type') == 'application/json') {
					res.writeHead(204, 'Ok no content').end();
				} else {
					res.writeHead(200, 'OK');
					self.rootRender(req, res);
				}
			});
	});
};

CfgServer.prototype.rootRender = function(req, res, formMsg) {
	if (res.header('Content-Type') == 'application/json') {
		if (formMsg) {
			res.end({ error: formMsg });
		} else {
			res.end({
				agents: this.agents,
				services: this.services
			});
		}
		return;
	}

	var html = '<style> p { font-size: 115%; margin: 4px 2px 16px } </style>';
	html += '<style> .form-control { margin-bottom: 10px } </style>';
	html += '<div style="padding: 10px 5px; min-width: 280px">';

	// agents
	this.agents.forEach(function(agentLink) {
		html += '<p><b class="glyphicon glyphicon-user" title="Agent"></b>';
		html += ' <a href="'+esc(agentLink.href)+'">'+esc(agentLink.title)+'</a></p>';
	});

	// services
	this.services.forEach(function(serviceLink) {
		html += '<p><b class="glyphicon glyphicon-barcode" title="Service"></b>';
		html += ' <a href="'+esc(serviceLink.href)+'">'+esc(serviceLink.title)+'</a></p>';
	});

	// form
	html += '<form action="/" method="POST" class="form-inline">';
	html +=   '<div class="form-group">';
	html +=     '<label class="sr-only" for="url">URL</label>';
	html +=     '<input type="text" name="url" placeholder="Enter URL" class="form-control">';
	html +=   '</div>';
	html +=   '<div style="height: 30px">';
	html +=     '<button type="submit" class="btn btn-primary pull-right">Add</button>';
	if (formMsg) html += '<p class="text-danger">'+formMsg+'</p>';
	html +=   '</div>';
	html += '</form>';

	html += '</div>';
	res.end(html);
};