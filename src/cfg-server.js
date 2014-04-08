function CfgServer(opts) {
	local.Server.call(this, opts);
}
CfgServer.prototype = Object.create(local.Server.prototype);
module.exports = CfgServer;

CfgServer.prototype.handleLocalRequest = function(req, res) {
	res.writeHead(200, 'OK', {'Content-Type':'text/html'});
	res.end('<div class=well style="margin: 15px">CFG</div>');
};