var net = require('net');

var hasHostRegex = /host:.*\r\n/i;

var ProxySocket = function (socket) {
	this.socket = socket;
	this.hostname = null;
	
	this.target = null;
	this.targetBuffer = "";
	this.targetConnected = false;

	this.socket.on('data', this.onData.bind(this));
	this.socket.on('close', this.onClose.bind(this.socket));
}

ProxySocket.prototype.onData = function (data) {
	if (!this.hostname) {
		this.hostname = this.getHostname(data);
	}

	if (!this.hostname) {
		return this.socket.end();
	}

	if (!this.target) {
		this.target = net.createConnection(8000);
		this.target.on('connect', this.onTargetConnect.bind(this));
	}

	if (!this.targetConnected) {
		this.targetBuffer += data.toString('utf8');
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

module.exports = ProxySocket;