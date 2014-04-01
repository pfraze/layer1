var registry = {};

function register(reltype, comdoc) {
	registry[reltype] = comdoc;
}

function unregister(reltype) {
	delete registry[reltype];
}

function setupcom(component) {
	var comdoc = registry[component.reltype];
	if (!comdoc) throw "Component reltype not found in registry: "+component.reltype;
	component.mixin(comdoc.values);
}

module.exports = {
	register: register,
	unregister: unregister,
	setupcom: setupcom
};