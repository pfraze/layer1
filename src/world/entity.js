function Entity(id) {
	this.id = id;
	this.components = {};
}
module.exports = Entity;

Entity.prototype.addcom = function(com) {
	if (this.components[com.reltype]) { throw "Component type already present: "+com.reltype; }
	this.components[com.reltype] = com;
};

Entity.prototype.delcom = function(com) {
	delete this.components[com.reltype];
};

Entity.prototype.getcom = function(reltype) {
	return this.components[reltype];
};