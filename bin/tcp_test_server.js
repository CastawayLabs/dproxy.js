var net = require('net');

net.createServer(function (socket) {
	socket.write("Hello World\n");
	socket.end();
}).listen(1338, '127.0.0.1');