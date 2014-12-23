var http = require('http');

http.createServer(function (req, res) {
	res.writeHead(200, {'Content-Type': 'text/plain', 'X-Forwarded-For': req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'] : 'null'});
	res.end('Hello World\n');
}).listen(1337, '127.0.0.1');