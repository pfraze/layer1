var Agent = require('./agent');
var WORLD_SIZE = 5000;

function World() {
	this.scene = null;

	this.agents = {};
	this.selectedAgent = null;
}
module.exports = World;

World.prototype.setup = function(scene) {
	this.scene = scene;

	// create background
	var gridEl = document.createElement('div');
	gridEl.id = 'grid-bg';
	gridEl.style.width = WORLD_SIZE+'px';
	gridEl.style.height = WORLD_SIZE+'px';
	this.gridBg = new THREE.CSS3DObject(gridEl);
	this.gridBg.position.z = -10;
	this.scene.add(this.gridBg);

	// setup event handlers
	document.body.addEventListener('click', clickHandler.bind(this));
	document.body.addEventListener('dblclick', dblclickHandler.bind(this));
	document.body.addEventListener('contextmenu', contextmenuHandler.bind(this));

	this.spawn({ url: 'local://config' });
};

World.prototype.getAgent = function(idOrEl) {
	var id = (idOrEl instanceof HTMLElement) ? idOrEl.id.slice(6) : idOrEl; // slice 6 to pass 'agent-' and go to the number
	return this.agents[id];
};

World.prototype.getSelection = function() {
	return this.selectedAgent;
};

World.prototype.spawn = function(opts) {
	var agent = new Agent(opts);
	agent.setup();
	this.agents[agent.id] = agent;
	this.scene.add(agent);
	return agent;
};

World.prototype.kill = function(agentOrId) {
	if (agentOrId && !(agentOrId instanceof Agent)) {
		agentOrId = this.getAgent(agentOrId);
	}
	var agent = agentOrId;
	if (!agent) {
		return false;
	}
	agent.destroy();
	this.scene.remove(agent);
	delete this.agents[agent.id];
	return agent;
};

World.prototype.select = function(agent) {
	// clear current selection
	if (this.selectedAgent) {
		this.selectedAgent.setSelected(false);
	}

	// set new selection
	this.selectedAgent = agent;
	if (agent) {
		agent.setSelected(true);
	}
};

function clickHandler(e) {
	if (e.which == 1) { // left mouse
		var agentEl = local.util.findParentNode.byClass(e.target, 'agent');
		if (agentEl) {
			var agent = this.getAgent(agentEl);
			this.select(agent);
		} else {
			this.select(null);
		}
	}
}

function dblclickHandler(e) {
	if (e.which == 1) { // left mouse
		var agentEl = local.util.findParentNode.byClass(e.target, 'agent');
		if (!agentEl) { // not in an agent (in world space)
			var worldPos = new THREE.Vector3();
			window.cameraControls.getMouseInWorld(e, worldPos);
			cameraControls.centerAt(worldPos);
		}
	}
}

function contextmenuHandler(e) {
	var agentEl = local.util.findParentNode.byClass(e.target, 'agent');
	if (!agentEl) {
		e.preventDefault();
		e.stopPropagation();

		if (!this.getSelection()) { return; }
		var worldPos = new THREE.Vector3();
		window.cameraControls.getMouseInWorld(e, worldPos);
		this.getSelection().moveTo(worldPos);
	}
}