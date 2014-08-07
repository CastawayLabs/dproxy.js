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
}

var httpString = 'http://127.0.0.1:'+config.proxyPort;
var httpsString = 'https://localhost:'+config.proxyPorts;

should(process.env.TEST).be.ok;

describe('test http', function() {
	beforeEach(function () {
		client.del('proxy:domain_details_127.0.0.1', function (err) {
			if (err) throw err;
		});
	});

	var apps = [
		{
			port: 1337,
			hostname: '127.0.0.1'
		}
	];

	it('should return a 404', function (done) {
		request(httpString).get('/')
			.expect(404)
			.end(done);
	});

	it('adds the app to redis and tests the request', function (done) {
		client.hmset('proxy:domain_details_127.0.0.1', 'apps', JSON.stringify(apps), function (err, status) {
			if (err) throw err;

			request(httpString).get('/')
				.expect(200)
				.expect('Hello World\n')
				.end(done);
		});
	});
});

describe('test https', function () {
	beforeEach(function () {
		client.del('proxy:domain_details_localhost', function (err) {
			if (err) throw err;
		});
		client.del('proxy:domain_ssl_localhost', function (err) {
			if (err) throw err;
		});
	});

	var apps = [
		{
			port: 1337,
			hostname: 'localhost'
		}
	];

	it('tests TLS 404', function (done) {
		request(httpsString).get('/')
			.expect(404)
			.end(done);
	});

	it('adds the app and SSL to redis and tests the request', function (done) {
		async.parallel([
			function (done) {
				client.hmset('proxy:domain_details_localhost', 'apps', JSON.stringify(apps), function (err, status) {
					done(err);
				});
			},
			function (done) {
				var crt = fs.readFileSync(path.join(__dirname, '..', 'test_files', 'localhost.crt'), 'utf8');
				var key = fs.readFileSync(path.join(__dirname, '..', 'test_files', 'localhost.key'), 'utf8');
				
				client.hmset('proxy:domain_ssl_localhost', 'crt', crt, 'key', key, function (err) {
					done(err);
				})
			}
		], function (err) {
			if (err) throw err;

			request(httpsString).get('/')
				.expect(200)
				.expect('Hello World\n')
				.end(done);
		})
	});
});