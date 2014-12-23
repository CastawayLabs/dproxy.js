var fs = require('fs'),
	async = require('async'),
	config = require('./config'),
	client = null,
	fs = require('fs'),
	path = require('path');

var net = require('net');
var hasHostRegex = /host:.*\r\n/i;
var hasHeaderEndRegex = /\r\n\r\n/i;
var statsdRegex = /[\.]|[:]/g;

var kSocketTimeout = 60 * 1000;

var proxyHeaders = {
	301: '301 Moved Permanently',
	404: '404 Not Found',
	410: '410 Gone',
	500: '500 Internal server error'
}

var ProxySocket = function (proxy, socket) {
	// The Proxy
	this.proxy = proxy;

	// This connections' tcp socket
	this.socket = socket;
	// This connection's hostname
	this.hostname = null;

	// Gets 'undefined' after .end event
	this.remoteAddress = this.socket.remoteAddress;
	this.remoteAddressAppended = false;

	// Request time
	this.requestStart = new Date;

	// is Secure connection
	this.secure = false;
	
	// The remote target
	this.target = null;
	this.isLookingForTarget = false;

	// Buffer data until it is connected
	this.targetBuffer = "";
	this.targetConnected = false;

	// Binds the socket to listen on this class.
	this.socket.on('data', this.onData.bind(this));
	this.socket.on('close', this.onClose.bind(this));
	this.socket.on('error', this.onSocketError.bind(this));
	this.socket.on('end', this.onSocketEnd.bind(this));

	// Time to send some data, otherwise closes connection.
	this.socketTimeout = setTimeout(this.timeoutSocket.bind(this), kSocketTimeout);
}

ProxySocket.prototype.onData = function (data) {
	if (this.socketTimeout) {
		clearTimeout(this.socketTimeout);
		this.socketTimeout = null;
	}

	// Buffer the data. It will be sent when the target connects.
	if (!this.targetConnected) {
		this.targetBuffer += data.toString('utf8');
	}
	// Get the hostname if its not 'found' yet.
	if (!this.hostname) {
		this.hostname = this.getHostname(this.targetBuffer);
	}

	// If not found a hostname, wait for the next chunk
	if (!this.hostname) {
		// Force close the socket if the end of the header has been reached with no hostname
		if (this.targetBuffer.search(hasHeaderEndRegex)) {
			this.socket.end();
		}
		return;
	}

	
	if (!this.remoteAddressAppended) {
		var hostStart = this.targetBuffer.search(hasHostRegex);
		var hostEnd = this.targetBuffer.indexOf('\n', hostStart);
		this.targetBuffer = this.targetBuffer.substring(0, hostEnd + 1)  + 'X-Forwarded-For: ' + this.remoteAddress + '\n' + this.targetBuffer.substring(hostEnd + 1);
		this.remoteAddressAppended = true;
	}

	// Proxy the request to the target application
	if (!this.target && !this.isLookingForTarget) {
		this.isLookingForTarget = true;

		// get the target details
		this.proxy.getDomainDetails(this.hostname, this.createProxy.bind(this));
	}
}

ProxySocket.prototype.createProxy = function (err, details, member) {
	// Serve 404 when the redis key doesn't exist
	if (err || !details) {
		return this.serveStatic(404);
	}

	// SSL-based redirects
	if (this.secure == false && details.ssl_only == true) {
		// Send redirect to https version
		return this.serveStatic(301, ['Location: https://' + this.hostname + "\n"]);
	}

	if (this.secure == true && details.ssl == false) {
		// Send redirect to http version
		return this.serveStatic(301, ['Location: http://' + this.hostname + "\n"]);
	}

	var ms = (new Date) - this.requestStart;
	config.metrics.timing('proxy.beforeConnect.' + this.hostname, ms);
	// Create the proxy
	this.target = net.createConnection(member.port, member.hostname);
	this.target.on('connect', this.onTargetConnect.bind(this));
	this.target.on('error', this.onTargetError.bind(this));
	this.target.on('end', this.onTargetEnd.bind(this));
}

ProxySocket.prototype.onClose = function () {
	var ms = (new Date) - this.requestStart;
	var ip = this.remoteAddress;
	var hostname = this.hostname;

	if (hostname) {
		hostname = hostname.replace(statsdRegex, '_')
	}
	if (ip) {
		ip = ip.replace(statsdRegex, '-')
	}

	var m = {};
	m['proxy.unique_ips.' + hostname] = ip + '|s';
	m['proxy.ips.' + ip] = '1|c';
	m['proxy.finished.time.' + hostname] = ms + '|ms';
	m['proxy.finished.length.read.' + hostname] = this.socket.bytesRead + '|ms';
	m['proxy.finished.length.write.' + hostname] = this.socket.bytesWritten + '|ms';

	config.metrics.send(m);
	
	m = null;
	return;
	
	/*
	// Data analytics here!
	
	socket.remoteAddress
	host: "127.0.0.1",

	Date.now()
	time: ISODate("2000-10-10T20:55:36Z"),
	
	// need to parse headers
	// Would need to use https://github.com/joyent/http-parser
	// see https://github.com/joyent/node/blob/7ffe2ad6167e193c7eda46a2db31c153e07d97bd/lib/_http_common.js
	// ^ lines :167
	//?
	path: "/apache_pb.gif",
	
	//?
	request: "GET /apache_pb.gif HTTP/1.0",
	
	//?
	status: 200,

	// proxy status.. either, 200 (pass), 404 (not found) or 410 (not available)
	proxyStatus: 200

	this.bytesRead
	request_size: ,
	
	this.bytesWritten
	response_size: 2326
	
	console.log('bytes total in: ', this.bytesRead);
	console.log('bytes total out: ', this.bytesWritten);
	*/
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

ProxySocket.prototype.onTargetError = function (err) {
	if (this.targetConnected) {
		// Target is already connected..
		this.target.end();
		return;
	}

	this.serveStatic(410);
}

ProxySocket.prototype.onSocketError = function (err) {
	this.socket.end();
}

ProxySocket.prototype.onSocketEnd = function () {
	if (this.target) {
		this.target.end();
	}
}

ProxySocket.prototype.onTargetEnd = function () {
	this.socket.end();
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

ProxySocket.prototype.timeoutSocket = function () {
	this.socket.end();
}

ProxySocket.prototype.writeHead = function (responseCode, contentLength, extraHeaders) {
	if (typeof extraHeaders == 'undefined') extraHeaders = [];

	this.socket.write(
		"HTTP/1.1 " + proxyHeaders[responseCode] + "\n" +
		"Server: dproxy\n"+
		"Date: " + this.requestStart.toUTCString() + "\n"+
		"Content-Type: text/html; charset=utf-8\n"+
		"Content-Length: " + contentLength + "\n"+
		"Connection: close\n"
	);

	for (var i = 0; i < extraHeaders.length; i++) {
		this.socket.write(extraHeaders[i]);
	}

	// end chunk
	this.socket.write("\r\n");
}

ProxySocket.prototype.serveStatic = function (responseCode, extraHeaders) {
	if (typeof extraHeaders == 'undefined') extraHeaders = [];

	var self = this;

	// This can be improved by caching the file
	fs.readFile(path.join(__dirname, '/views/', responseCode+'.html'), function (err, data) {
		self.writeHead(responseCode, data.length, extraHeaders);
		self.socket.write(data);

		self.socket.end();
	});
}

module.exports = ProxySocket;
