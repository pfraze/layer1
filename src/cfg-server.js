function CfgServer(opts) {
	local.Server.call(this, opts);
}
CfgServer.prototype = Object.create(local.Server.prototype);
module.exports = CfgServer;

CfgServer.prototype.handleLocalRequest = function(req, res) {
	res.writeHead(200, 'OK', {'Content-Type':'text/html'});
	res.end('<span style="color:red">CFG</span>');
};