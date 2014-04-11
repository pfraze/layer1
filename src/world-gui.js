var util = require('./util');

function WorldGui(el, world) {
	this.element = el;
	this.world = world;
	this.currentEnt = null;

	// setup element
	el.innerHTML = '<div>'
		+'<iframe seamless="seamless" sandbox="allow-popups allow-same-origin allow-scripts"><html><head></head><body></body></html></iframe>'
		+'</div>';
}
module.exports = WorldGui;

WorldGui.prototype.renderEnt = function(ent) {
	this.currentEnt = ent;
	var iframe = this.element.querySelector('iframe');
	if (!ent || !ent.lastResponse) {
		iframe.setAttribute('srcdoc', '');
		return;
	}

	var body = (ent.lastResponse) ? ent.lastResponse.body : '';
	if (body && typeof body == 'object') {
		body = JSON.stringify(body);
	}
	var bootstrapUrl = local.joinUri(ent.getBaseUrl(window.location.toString()), 'css/bootstrap.min.css');
	var prependHTML = [
		'<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; font-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src *; script-src \'self\';" />',
		// ^ script-src 'self' enables the parent page to reach into the iframe
		'<base href="'+ent.getBaseUrl()+'">',
		'<link href="'+bootstrapUrl+'" rel="stylesheet">'
	].join('');
	body = prependHTML+util.stripScripts(body); // CSP stops inline or remote script execution, but we still want to stop inclusions of scripts from our domain

	// set iframe
	iframe.setAttribute('srcdoc', body);

	// :HACK: everything below here in this function kinda blows

	// Size the iframe to its content
	iframe.addEventListener('load', sizeIframe.bind(this, iframe)); // must be set every load

	// Bind request events
	// :TODO: can this go in .load() ? appears that it *cant*
	var attempts = 0;
	var reqHandler = iframeRequestEventHandler.bind(this);
	function tryEventBinding() {
		try {
			local.bindRequestEvents(iframe.contentDocument);
			iframe.contentDocument.addEventListener('request', reqHandler);
		} catch(e) {
			attempts++;
			if (attempts > 100) {
				console.error('Failed to bind iframe events, which meant FIVE SECONDS went by the browser constructing it. Who\'s driving this clown-car?');
			} else {
				setTimeout(tryEventBinding, 50); // try again
			}
		}
	}
	setTimeout(tryEventBinding, 50); // wait 50 ms for the page to setup
};


// when called, must be bound to Entity instance
function sizeIframe(iframe) {
	// reset so we can get a fresh measurement
	// iframe.width = null;
	iframe.height = null;

	var oh = iframe.contentDocument.body.offsetHeight;
	var sh = iframe.contentDocument.body.scrollHeight;
	var w = iframe.contentDocument.body.scrollWidth;
	// for whatever reason, chrome gives a minimum of 150 for scrollHeight, but is accurate if below that. Whatever.
	iframe.height = ((sh == 150) ? oh : sh) + 'px';
	// iframe.width = ((w < 800) ? w : 800) + 'px';

	// In 100ms, do it again - it seems styles aren't always in place
	var self = this;
	setTimeout(function() {
		var oh = iframe.contentDocument.body.offsetHeight;
		var sh = iframe.contentDocument.body.scrollHeight;
		var w = iframe.contentDocument.body.scrollWidth;
		iframe.height = ((sh == 150) ? oh : sh) + 'px';
		// iframe.width = ((w < 800) ? w : 800) + 'px';
	}, 100);
}

function iframeRequestEventHandler(e) {
	this.currentEnt.dispatch(e.detail).always(this.renderEnt.bind(this, this.currentEnt));
}