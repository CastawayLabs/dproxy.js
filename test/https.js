var should = require('should');

var config = require('../lib/config')
	, dproxy = require('../bin/dproxy')
	, proxy = dproxy.Proxy
	, client = dproxy.client
	, fs = require('fs')
	, path = require('path')
	, async = require('async');

var request = require('supertest');

// Test http server
require('../bin/test_server');

if (!process.env.TEST) {
	console.log("\nNot in TEST environment. Please export TEST variable\n");
	process.exit(1);
}

var httpsString = 'https://localhost:'+config.proxyPorts;

should(process.env.TEST).be.ok;

describe('test https', function () {
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
		port: 1337,
		hostname: 'localhost'
	}

	it('tests TLS 404', function (done) {
		request(httpsString).get('/')
			.end(function (err) {
				// The socket will reset

				should(err).not.be.null;
				done();
			});
	});

	it('adds the app and SSL to redis and tests the request', function (done) {
		var crt = fs.readFileSync(path.join(__dirname, '..', 'test_files', 'localhost.crt'), 'utf8');
		var key = fs.readFileSync(path.join(__dirname, '..', 'test_files', 'localhost.key'), 'utf8');
		
		client.multi()
		.hmset('proxy:domain_details_localhost', 'ssl', true, 'ssl_only', false)
		.hmset('proxy:domain_ssl_localhost', 'crt', crt, 'key', key)
		.sadd('proxy:domain_members_localhost', JSON.stringify(member))
		.exec(function (err) {
			should(err).be.null;

			request(httpsString).get('/')
				.expect(200)
				.expect('Hello World\n')
				.end(done);
		});
	});
});