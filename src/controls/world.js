function WorldControls(world, domElement) {
	this.world = world;
	this.domElement = domElement || document.body;
}
module.exports = WorldControls;

WorldControls.prototype.setup = function() {
	this.domElement.addEventListener('click', this.onClick.bind(this), false);
	this.domElement.addEventListener('contextmenu', this.onContextmenu.bind(this), false);
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

WorldControls.prototype.onContextmenu = function(e) {
	var sel = this.world.getSelection();
	if (!sel[0]) return;

	e.worldPos = new THREE.Vector3();
	window.cameraControls.getMouseInWorld(e, e.worldPos);
	var req = sel[0].getRightClickReq(e);
	if (!req) return;

	this.world.selectionDispatch(req);
	e.preventDefault();
	e.stopPropagation();
};

WorldControls.prototype.onLeftClickAgent = function(e, agentEl) {
	var agent = this.world.getAgent(agentEl);
	this.world.select(agent);
};

WorldControls.prototype.onLeftClickNothing = function(e, agentEl) {
	var agent = this.world.getAgent(agentEl);
	this.world.select(null);
};