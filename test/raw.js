var should = require('should');

var config = require('../lib/config')
	, dproxy = require('../bin/dproxy')
	, proxy = dproxy.Proxy
	, client = dproxy.client
	, fs = require('fs')
	, path = require('path')
	, async = require('async')
	, net = require('net')
	, tls = require('tls');

// Test http server
require('../bin/tcp_test_server');

if (!process.env.TEST) {
	console.log("\nNot in TEST environment. Please export TEST variable\n");
	process.exit(1)
}

should(process.env.TEST).be.ok;

var crt = fs.readFileSync(path.join(__dirname, '..', 'test_files', 'localhost.crt'), 'utf8');
var key = fs.readFileSync(path.join(__dirname, '..', 'test_files', 'localhost.key'), 'utf8');
var ca = [crt];

describe('test raw tcp', function() {
	beforeEach(function () {
		client.multi()
		.del('proxy:domain_details_127.0.0.1')
		.del('proxy:domain_members_127.0.0.1')
		.exec(function (err) {
			if (err) throw err;
		});
	});

	var member = {
		port: 1338,
		hostname: '127.0.0.1'
	}

	it('adds the app to redis and tests the raw request', function (done) {
		client.multi()
		.hmset('proxy:domain_details_127.0.0.1', 'ssl', false, 'ssl_only', false)
		.sadd('proxy:domain_members_127.0.0.1', JSON.stringify(member))
		.exec(function (err) {
			should(err).be.null;

			var responseData = '';

			var request = net.createConnection(config.proxyPort, '127.0.0.1');
			request.on('connect', function () {
				request.write("host: 127.0.0.1\r\n");
			})
			.on('data', function (chunk) {
				responseData += chunk.toString('utf8');
			})
			.on('end', function () {
				responseData.should.equal("Hello World\n");
				done()
			});
		})
	});
});

describe('test raw tls', function () {
	beforeEach(function () {
		client.multi()
		.del('proxy:domain_details_localhost')
		.del('proxy:domain_members_localhost')
		.del('proxy:domain_ssl_localhost')
		.exec(function (err) {
			if (err) throw err;
		});
	});

	var member = {
		port: 1338,
		hostname: 'localhost'
	}

	it('adds the app to redis and tries to connect using TLS', function (done) {
		client.multi()
		.hmset('proxy:domain_details_localhost', 'ssl', true, 'ssl_only', false)
		.hmset('proxy:domain_ssl_localhost', 'crt', crt, 'key', key)
		.sadd('proxy:domain_members_localhost', JSON.stringify(member))
		.exec(function (err) {
			should(err).be.null;

			var responseData = '';

			var request = tls.connect({
				port: config.proxyPorts,
				host: '127.0.0.1',
				cert: crt,
				key: key,
				ca: ca,
				servername: 'localhost'
			});
			request.on('connect', function () {
				request.write("host: localhost\r\n");
			})
			.on('data', function (chunk) {
				responseData += chunk.toString('utf8');
			})
			.on('error', function (err) {
				should(err).be.null;
			})
			.on('end', function () {
				responseData.should.equal("Hello World\n");
				done()
			});
		})
	});
})