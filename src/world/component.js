var comtypes = require('./comtypes');

function Component(entid, reltype, initValues) {
	Object.defineProperty(this, 'entid',   { value: entid }); // not changeable or enumerable
	Object.defineProperty(this, 'reltype', { value: reltype }); // not changeable or enumerable

	comtypes.setupcom(this);
	if (initValues) {
		this.mixin(initValues);
	}
}
module.exports = Component;

Component.prototype.mixin = function(obj, target) {
	if (!target) { target = this; }
	for (var k in obj) {
		if (typeof obj[k] == 'object') {
			target[k] = {};
			this.mixin(obj[k], target[k]);
		} else {
			targetk[k] = obj[k];
		}
	}
};