var fs = require('fs')
	, async = require('async')
	, config = require('./config')
	, client = null
	, fs = require('fs');

var net = require('net');
var tls = require('tls')
var ProxySocket = require('./ProxySocket');

var Proxy = function(ng_proxy) {
	var self = this;
	self.ng_proxy = ng_proxy;

	client = ng_proxy.client;
	
	self.server = net.createServer(self.tcpRequest.bind(self))
	self.server.listen(config.proxyPort);

	console.log("HTTP + ws Proxy listening on :", config.proxyPort);

	fs.exists(__dirname+'/../server.crt', function (exists) {
		if (exists) {
			// Enable HTTPs
			var https_options = {
				//SNICallback: self.SNICallback,
				cert: fs.readFileSync(__dirname+'/../server.crt'),
				key: fs.readFileSync(__dirname+'/../server.key'),
			};

			self.servers = tls.createServer(https_options, self.tcpRequest.bind(self))
			self.servers.listen(config.proxyPorts);
			
			console.log("HTTPs + wss Proxy listening on :", config.proxyPorts);
		} else {
			console.log("HTTPs NOT Enabled! Missing server.crt and server.key");
		}
	});
}

Proxy.prototype.tcpRequest = function (socket) {
	var request = new ProxySocket(socket);
}

Proxy.prototype.SNICallback = function (hostname, cb) {
	console.log(hostname);
	console.log(cb);

	self.getAppByHostname(hostname, function(app) {
		self.getAppProcess(app, function(app_process) {
			console.log(app_process);
			
			//TODO check exists etc

			var creds = tls.createSecureContext({
				key: app_process['domain_ssl__key_'+hostname],
				cert: app_process['domain_ssl__crt_'+hostname]
			});

			cb(null, creds.context);
		});
	});
}

Proxy.prototype.getAppByHostname = function (hostname, cb) {
	var self = this;

	client.hmget("proxy:domains", hostname, function (err, results) {
		if (results.length == 0) return cb(null);

		cb(results[0]);
	});
}

Proxy.prototype.getAppProcess = function (app, cb) { 
	var self = this;

	client.srandmember("proxy:app_"+app, function (err, process) {
		if (!process || process.length == 0) return cb(null);

		self.getAppProcessDetails(process, cb);
	});
}

Proxy.prototype.getAppProcessDetails = function (process_id, cb) {
	var self = this;

	client.hgetall("proxy:app_process_"+process_id, function(err, hash) {
		if (hash == null) return cb(null);

		hash._id = process_id;

		cb(hash);
	});
}

exports.Proxy = Proxy;