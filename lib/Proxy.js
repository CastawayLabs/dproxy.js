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
				SNICallback: self.SNICallback,
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
	var request = new ProxySocket(this, socket);
}

Proxy.prototype.SNICallback = function (hostname, cb) {
	console.log(hostname);
	console.log(cb);

	// Facilitate SSL details
	client.hmget("proxy:domain_ssl_"+hostname, function (err, ssl) {
		if (err) return cb(err);
		if (!ssl) return cb('Not Found');

		var creds = tls.createSecureContext({
			key: ssl.key,
			cert: ssl.crt
		});

		cb(null, creds.context);
	});
}

Proxy.prototype.getDomainDetails = function (hostname, cb) {
	client.hgetall("proxy:domain_details_"+hostname, function (err, results) {
		cb(results);
	});
}

exports.Proxy = Proxy;