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

	// :DEBUG:
	this.spawnAgent({ url: 'http://stdrel.com' });
};

World.prototype.getAgent = function(idOrEl) {
	var id = (idOrEl instanceof HTMLElement) ? idOrEl.id.slice(6) : idOrEl; // slice 6 to pass 'agent-' and go to the number
	return this.agents[id];
};

World.prototype.getSelection = function() {
	return this.selectedAgent;
};

World.prototype.spawnAgent = function(opts) {
	var agent = new Agent(opts);
	agent.setup();
	this.agents[agent.id] = agent;
	this.scene.add(agent);
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
	var agentEl = local.util.findParentNode.byClass(e.target, 'agent');
	if (agentEl) {
		var agent = this.getAgent(agentEl);
		this.select(agent);
	} else {
		this.select(null);
	}
}