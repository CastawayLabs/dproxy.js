var fs = require('fs')
	, async = require('async')
	, config = require('./config')
	, client = null
	, fs = require('fs')
	, path = require('path');

var net = require('net');
var hasHostRegex = /host:.*\r\n/i;

var ProxySocket = function (proxy, socket) {
	// The Proxy
	this.proxy = proxy;

	// This connections' tcp socket
	this.socket = socket;
	// This connection's hostname
	this.hostname = null;
	
	// The remote target
	this.target = null;
	// Buffer data until it is connected
	this.targetBuffer = "";
	this.targetConnected = false;

	// Binds the socket to listen on this class.
	this.socket.on('data', this.onData.bind(this));
	this.socket.on('close', this.onClose.bind(this.socket));
}

ProxySocket.prototype.onData = function (data) {
	var self = this;

	// Get the hostname if its not 'found' yet. The problem with this is that the host header could be in another chunk..
	if (!self.hostname) {
		self.hostname = self.getHostname(data);
	}

	// If not found a hostname, terminate the socket.
	if (!self.hostname) {
		return self.socket.end();
	}

	// Proxy the request to the target application
	if (!self.target) {
		// get the target details
		self.proxy.getDomainDetails(self.hostname, function (details) {
			// Serve 404 when the redis key doesn't exist
			if (!details) {
				return self.serveStatic('404.html');
			}

			// Not an optimal solution, but its faster than asking redis
			var apps = null;

			try {
				apps = JSON.parse(details.apps);
			} catch (e) {
				// Could not parse the apps json, get the fuck out.
				return self.serveStatic('500.html');
			}

			if (!apps || apps.length == 0) {
				// No apps found.
				return self.serveStatic('410.html');
			}

			// Get a random app
			var index = Math.floor(Math.random() * apps.length);
			var app = apps[index];
			
			// Create the proxy
			self.target = net.createConnection(app.port, app.host);
			self.target.on('connect', self.onTargetConnect.bind(self));
		});
	}

	// Buffer the data. It will be sent when the target connects.
	if (!self.targetConnected) {
		self.targetBuffer += data.toString('utf8');
	}
}

ProxySocket.prototype.onClose = function () {
	// Data analytics here!
	console.log('bytes total in: ', this.bytesRead);
	console.log('bytes total out: ', this.bytesWritten);
}

ProxySocket.prototype.onTargetConnect = function () {
	this.targetConnected = true;

	// Write the buffered data.
	this.target.write(this.targetBuffer);
	// Clean the buffer
	this.targetBuffer = null;

	// Forward the buffers in both directions.
	this.target.pipe(this.socket);
	this.socket.pipe(this.target);
}

ProxySocket.prototype.getHostname = function (data) {
	// Look up the hostname of the request.
	// Data is a buffer, so it must be decoded into readable format.

	var header = data.toString('utf8');
	var pos = header.search(hasHostRegex);

	if (pos > -1) {
		// find the end of the line
		header = header.substring(pos+5);
		var endPos = header.search("\r\n");

		if (endPos > -1) {
			var host = header.substring(0, endPos);

			if (host.length > 0) {
				host = host.trim();

				var hasPort = host.search(':');

				if (hasPort > -1) {
					var portParts = host.split(':');
					portParts.splice(portParts.length-1, 1);
					var host = portParts.join('');
				}

				return host;
			}
		}
	}

	// Host not found
	return null;
}

ProxySocket.prototype.serveStatic = function (page) {
	var self = this;

	// This can be improved by caching the file
	fs.readFile(path.join(__dirname, '/views/', page), function (err, page) {
		// Some generic http headers
		self.socket.write("HTTP/1.1 404 Not Found\n" +
			"Server: NodeGear Proxy\n"+
			"Date: Wed, 30 Jul 2014 20:21:08 GMT\n"+
			"Content-Type: text/html; charset=utf-8\n"+
			"Content-Length: "+page.length+"\n"+
			"Connection: keep-alive\n\r\n"
		);

		self.socket.write(page);

		self.socket.end();
	});
}

module.exports = ProxySocket;