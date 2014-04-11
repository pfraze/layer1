var Entity = require('./entity');
var WorldGui = require('./world-gui');
var WORLD_SIZE = 5000;

function World() {
	this.scene = null;
	this.gui = null;
	this.configServer = null;

	this.entities = {};
	this.selectedEntity = null;
}
module.exports = World;

World.prototype.setup = function(scene, configServer) {
	this.scene = scene;
	this.gui = new WorldGui(document.getElementById('world-gui'), this);
	this.configServer = configServer;
	this.leftIsDown = false;

	// create background
	var gridEl = document.createElement('div');
	gridEl.id = 'grid-bg';
	gridEl.style.width = WORLD_SIZE+'px';
	gridEl.style.height = WORLD_SIZE+'px';
	this.gridBg = new THREE.CSS3DObject(gridEl);
	this.gridBg.position.x = -(WORLD_SIZE/2);
	this.gridBg.position.y = (WORLD_SIZE/2);
	this.gridBg.position.z = -10;
	this.scene.add(this.gridBg);

	// setup event handlers
	var worldDiv = document.getElementById('world-div');
	worldDiv.addEventListener('click', clickHandler.bind(this));
	worldDiv.addEventListener('dblclick', dblclickHandler.bind(this));
	worldDiv.addEventListener('mousedown', mousedownHandler.bind(this));
	worldDiv.addEventListener('mouseup', mouseupHandler.bind(this));
	worldDiv.addEventListener('contextmenu', contextmenuHandler.bind(this));

	var cfgagent = this.spawn({ url: 'local://config' });
	cfgagent.position.x -= 150;
	cfgagent.position.y += 100;
	cfgagent.dispatch({ method: 'POST', body: {url:'local://dev.grimwire.com(layer1/pfraze/mimepipe.js)/'} });
	cfgagent.dispatch({ method: 'POST', body: {url:'local://time/'} });
	this.select(cfgagent);
};

World.prototype.getEntity = function(idOrEl) {
	var id = (idOrEl instanceof HTMLElement) ? idOrEl.id.slice(4) : idOrEl; // slice 4 to pass 'ent-' and go to the number
	return this.entities[id];
};

World.prototype.getSelection = function() {
	return this.selectedEntity;
};

World.prototype.spawn = function(cfg, opts) {
	opts = opts || {};
	var entity = new Entity(cfg);
	entity.setup();
	this.entities[entity.id] = entity;
	this.scene.add(entity);
	if (opts.select) {
		this.select(entity);
	}
	return entity;
};

World.prototype.kill = function(entOrId) {
	if (entOrId && !(entOrId instanceof Entity)) {
		entOrId = this.getEntity(entOrId);
	}
	var entity = entOrId;
	if (!entity) {
		return false;
	}
	entity.destroy();
	if (this.selectedEntity == entity) {
		this.select(null);
	}
	this.scene.remove(entity);
	delete this.entities[entity.id];
	return entity;
};

World.prototype.select = function(entity) {
	// clear attackable classes
	var attackables = document.querySelectorAll('.ent.attackable');
	for (var i=0; i < attackables.length; i++) {
		attackables[i].classList.remove('attackable');
	}

	// clear current selection
	if (this.selectedEntity) {
		this.selectedEntity.setSelected(false);
	}

	// set new selection
	this.selectedEntity = entity;
	this.gui.renderEnt(entity);
	if (entity) {
		entity.setSelected(true);

		if (entity.isAgent()) {
			var query = { rel: entity.selfLink['query-rel'] };
			// highlight attackable ents
			for (var id in this.entities) {
				var target = this.entities[id];
				if (target.selfLink && local.queryLink(target.selfLink, query)) {
					target.element.classList.add('attackable');
				}
			}
		}
	}
};

function clickHandler(e) {
	if (e.which == 1) { // left mouse
		var entityEl = local.util.findParentNode.byClass(e.target, 'ent');
		if (entityEl) {
			var entity = this.getEntity(entityEl);
			this.select(entity);
		} else {
			this.select(null);
		}
	}
}

function dblclickHandler(e) {
	if (e.which == 1) { // left mouse
		var worldPos = new THREE.Vector3();
		window.cameraControls.getMouseInWorld(e, worldPos);
		cameraControls.centerAt(worldPos);
	}
}

function mousedownHandler(e) {
	if (e.which == 1) {
		this.leftIsDown = true;
	}
}

function mouseupHandler(e) {
	if (e.which == 1) {
		this.leftIsDown = false;
	}
}

function contextmenuHandler(e) {
	// never allow default in the world
	e.preventDefault();
	e.stopPropagation();

	var entityEl = local.util.findParentNode.byClass(e.target, 'ent');
	if (entityEl && entityEl != this.selectedEntity.element) {
		// "attack"
		var agent = this.selectedEntity;
		var target = this.getEntity(entityEl);
		if (agent && target && local.queryLink(agent.selfLink, { rel: 'todorel.com/agent'})) {
			// agent targetting another entity, of the right type?
			var rel = agent.selfLink['query-rel'];
			if (rel && local.queryLink(target.selfLink, { rel: rel })) {
				// move agent to target
				agent.moveTo(target);
				// reload agent with this new target
				agent.url = local.UriTemplate
					.parse(agent.selfLink.href)
					.expand({ target: target.selfLink.href });
				var redrawGui = this.gui.renderEnt.bind(this.gui, agent);
				agent.fetch().always(redrawGui);
			}
		}
	} else {
		// move selection
		if (!this.getSelection()) { return; }
		var worldPos = new THREE.Vector3();
		window.cameraControls.getMouseInWorld(e, worldPos);
		this.getSelection().moveTo(worldPos);
	}
}