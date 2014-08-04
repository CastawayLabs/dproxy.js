var net = require('net');

var hasHostRegex = /host:.*\r\n/i;

var ProxySocket = function (proxy, socket) {
	this.proxy = proxy;

	this.socket = socket;
	this.hostname = null;
	
	this.target = null;
	this.targetBuffer = "";
	this.targetConnected = false;

	this.socket.on('data', this.onData.bind(this));
	this.socket.on('close', this.onClose.bind(this.socket));
}

ProxySocket.prototype.onData = function (data) {
	var self = this;

	if (!self.hostname) {
		self.hostname = self.getHostname(data);
	}

	if (!self.hostname) {
		return self.socket.end();
	}

	if (!self.target) {
		self.proxy.getDomainDetails(self.hostname, function (details) {
			if (!details) {
				return self.serveStatic('404.html');
			}

			var apps = JSON.parse(details.apps);
			if (!apps || apps.length == 0) {
				return self.serveStatic('410.html');
			}

			// Get a random app
			var index = Math.floor(Math.random() * apps.length);
			var app = apps[index];
			
			self.target = net.createConnection(app.port, app.host);
			self.target.on('connect', self.onTargetConnect.bind(self));
		});
	}

	if (!self.targetConnected) {
		self.targetBuffer += data.toString('utf8');
	}
}

ProxySocket.prototype.onClose = function () {
	console.log('bytes total in: ', this.bytesRead);
	console.log('bytes total out: ', this.bytesWritten);
}

ProxySocket.prototype.onTargetConnect = function () {
	this.targetConnected = true;
	this.target.write(this.targetBuffer);

	this.target.pipe(this.socket);
	this.socket.pipe(this.target);

	this.targetBuffer = null;
}

ProxySocket.prototype.getHostname = function (data) {
	var header = data.toString();
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

				console.log('hostname', host);

				return host;
			}
		}
	}

	return null;
}

ProxySocket.prototype.serveStatic = function (page) {
	var self = this;
	fs.readFile(__dirname+'/views/'+page, function (err, page) {
		// Some headers
		self.socket.write();
		self.socket.write(page);

		self.socket.end();
	});
}

module.exports = ProxySocket;