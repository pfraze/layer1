function WorldControls(world, domElement) {
	this.world = world;
	this.domElement = domElement || document.body;
	this.setup();
}
module.exports = WorldControls;

WorldControls.prototype.setup = function() {
	this.domElement.addEventListener('click', this.onClick.bind(this), false);
};

WorldControls.prototype.onClick = function(e) {
	if (e.which == 1) { // left click
		var agentEl = local.util.findParentNode.byClass(e.target, 'agent');
		if (agentEl) {
			this.onLeftClickAgent(e, agentEl);
		} else {
			this.onLeftClickNothing(e);
		}
	}
};

WorldControls.prototype.onLeftClickAgent = function(e, agentEl) {
	var agent = this.world.getAgent(agentEl);
	this.world.select(agent);
};

WorldControls.prototype.onLeftClickNothing = function(e, agentEl) {
	var agent = this.world.getAgent(agentEl);
	this.world.select(null);
};