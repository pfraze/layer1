var registry = {};

function register(reltype, comdoc) {
	registry[reltype] = comdoc;
}

function unregister(reltype) {
	delete registry[reltype];
}

function setupcom(component, initValues) {
	var comdoc = registry[component.reltype];
	if (!comdoc) throw "Component reltype not found in registry: "+component.reltype;
	mixin(comdoc.state, comdoc.values);
	mixin(comdoc.state, initValues);
}

function mixin(target, src) {
	for (var k in src) {
		if (typeof src[k] == 'object') {
			target[k] = {};
			mixin(target[k], src[k]);
		} else {
			targetk[k] = src[k];
		}
	}
}

module.exports = {
	register: register,
	unregister: unregister,
	setupcom: setupcom
};