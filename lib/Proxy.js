var fs = require('fs')
	, async = require('async')
	, config = require('./config')
	, client = null
	, fs = require('fs');

// net is for http, tls for https
var net = require('net');
var tls = require('tls')
var ProxySocket = require('./ProxySocket');

var Proxy = function(dproxy) {
	var self = this;
	self.dproxy = dproxy;

	client = dproxy.client;
	
	self.server = net.createServer(self.tcpRequest.bind(self))
	self.server.listen(config.proxyPort);

	console.log("HTTP + ws Proxy listening on :", config.proxyPort);

	// Enable https if server certificates are present
	fs.exists(__dirname+'/../server.crt', function (exists) {
		if (!exists) {
			// Not enabled
			console.log("HTTPs NOT Enabled! Missing server.crt and server.key");
			return;
		}

		// Enable HTTPs
		var https_options = {
			SNICallback: self.SNICallback,
			cert: fs.readFileSync(__dirname+'/../server.crt'),
			key: fs.readFileSync(__dirname+'/../server.key'),
		};

		self.servers = tls.createServer(https_options, self.tcpRequest.bind(self))
		self.servers.listen(config.proxyPorts);
		
		console.log("HTTPs + wss Proxy listening on :", config.proxyPorts);
	});
}

Proxy.prototype.tcpRequest = function (socket) {
	// Maybe more could be done here. E.g. set up analytics and callbacks when the request is finished.
	var request = new ProxySocket(this, socket);
}

// Server name identification. Supported in node v0.11.13+
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