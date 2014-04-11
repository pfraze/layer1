importScripts('../js/local.js');

var mimes = {
	json: 'application/json',
	plaintext: 'text/plain'
};

function main(req, res) {
	var type = req.query.type;
	if (!type || !mimes[type]) { req.query.type = type = 'json'; }

	res.setHeader('link', [{ href: '/?type='+type+'{&target}', rel: 'self todorel.com/agent', title: 'MIME Pipe', 'query-rel': 'service' }]);
	res.writeHead(200, 'OK', {'Content-Type': 'text/html'});

	if (req.query.target) {
		local.GET({ url: 'local://host.page/'+req.query.target, Accept: mimes[type]+', */*;q=0.8' })
			.always(function(res2) {
				render(req, res, res2);
			});
	} else {
		render(req, res);
	}
}

function render(req, res, res2) {
	var html = '';
	html += '<style>';
	html +=   '#main > :last-child { margin-bottom:0 }';
	html += '</style>';
	html += '<div id=main style="padding:5px; min-width: 300px">';

	// menu
	var type = req.query.type;
	var tar = '';
	if (req.query.target) {
		tar = 'target='+encodeURIComponent(req.query.target)+'&';
	}
	html += '<style>.btn { margin-right: 2px; }</style>';
	html += '<p>';
	html += '<a href="/?'+tar+'type=json" class="btn btn-default'+((type=='json')?' active':'')+'">Get JSON</a>';
	html += '<a href="/?'+tar+'type=plaintext" class="btn btn-default'+((type=='plaintext')?' active':'')+'">Get Text</a>';
	html += '</p>';

	// target info
	if (req.query.target) {
		html += '<p><strong>'+esc(req.query.target)+'</strong></p>';
	} else {
		html += '<p><em>No target selected</em></p>';
	}

	// target content
	if (res2) {
		html += renderContent(req, res, res2);
	}

	html += '</div>';

	res.end(html);
}

function renderContent(req, res, res2) {
	var type = req.query.type;

	if (res2.body && res2.header('Content-Type').indexOf(type) !== -1) {
		if (type == 'json') {
			return '<pre>'+esc(JSON.stringify(res2.body, false, 2))+'</pre>';
		}
		if (type == 'plaintext') {
			return '<pre>'+esc(newlines(res2.body))+'</pre>';
		}
	}

	if (res2.body) { // if res.body is true, then we failed the content-type check
		if (type == 'json') {
			var obj = {};
			obj[res2.header('Content-Type')||'orig'] = esc(res2.body);
			return '<pre>'+esc(JSON.stringify(obj, false, 2))+'</pre>';
		} else if (type == 'plaintext') {
			return '<pre>'+esc(newlines(res2.body))+'</pre>';
		}
	}

	if (res2.status == 406) {
		return '<p><em>Error: not available in this type.</em></p>';
	}

	return '<p><em>Error: '+esc(res2.status)+' '+esc(res2.reason||'')+'</em></p>';
}

function esc(str) {
	if (str) {
		return (''+str).replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}
	return '';
}

function newlines(str) {
	// make sure there's a newline once every 60 chars at most
	return str.replace(/([^\n]{0,60})/g, function(a, b) {
		if (b.length == 60) { return b+'\n'; }
		return b;
	});
}