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
	process.exit(1)
}

var httpString = 'http://127.0.0.1:'+config.proxyPort;

should(process.env.TEST).be.ok;

describe('test http', function() {
	beforeEach(function () {
		client.multi()
		.del('proxy:domain_details_127.0.0.1')
		.del('proxy:domain_members_127.0.0.1')
		.exec(function (err) {
			if (err) throw err;
		});
	});

	var member = {
		port: 1337,
		hostname: '127.0.0.1'
	}

	it('should return a 404', function (done) {
		request(httpString).get('/')
			.expect(404)
			.end(done);
	});

	it('adds the app to redis and tests the request', function (done) {
		client.multi()
		.hmset('proxy:domain_details_127.0.0.1', 'ssl', false, 'ssl_only', false)
		.sadd('proxy:domain_members_127.0.0.1', JSON.stringify(member))
		.exec(function (err) {
			should(err).be.null;

			request(httpString).get('/')
				.expect(200)
				.expect('Hello World\n')
				.end(done);
		})
	});

	it('tests redirect http ~> https', function (done) {
		client.multi()
		.hmset('proxy:domain_details_127.0.0.1', 'ssl', true, 'ssl_only', true)
		.del('proxy:domain_members_127.0.0.1')
		.sadd('proxy:domain_members_127.0.0.1', JSON.stringify(member))
		.exec(function (err) {
			should(err).be.null;

			request(httpString).get('/')
				.expect(301)
				.end(done);
		});
	});

	it('adds the app to redis and test invalid ownership', function (done) {
		member.owner = 'nobody';

		client.multi()
		.hmset('proxy:domain_details_127.0.0.1', 'ssl', false, 'ssl_only', false, 'owner', 'mocha')
		.del('proxy:domain_members_127.0.0.1')
		.sadd('proxy:domain_members_127.0.0.1', JSON.stringify(member))
		.exec(function (err) {
			should(err).be.null;

			request(httpString).get('/')
				.expect(404)
				.end(function (err) {
					should(err).be.null;

					// Test that the SET now has 0 members
					client.smembers('proxy:domain_members_127.0.0.1', function (err, members) {
						should(err).be.null;
						members.should.have.lengthOf(0);

						done();
					})
				});
		});
	});

	it('adds the app to redis and test correct ownership', function (done) {
		member.owner = 'mocha';

		client.multi()
		.hmset('proxy:domain_details_127.0.0.1', 'ssl', false, 'ssl_only', false, 'owner', 'mocha')
		.del('proxy:domain_members_127.0.0.1')
		.sadd('proxy:domain_members_127.0.0.1', JSON.stringify(member))
		.exec(function (err) {
			should(err).be.null;

			request(httpString).get('/')
				.expect(200)
				.expect('Hello World\n')
				.end(function (err) {
					should(err).be.null;

					// Test that the SET still has 1 member
					client.smembers('proxy:domain_members_127.0.0.1', function (err, members) {
						should(err).be.null;
						members.should.have.lengthOf(1);

						done();
					})
				});
		});
	});
    
    it('forwards the correct IP in the X-Forwarded-For header', function (done) {
		client.multi()
		.hmset('proxy:domain_details_127.0.0.1', 'ssl', false, 'ssl_only', false)
		.sadd('proxy:domain_members_127.0.0.1', JSON.stringify(member))
		.exec(function (err) {
			should(err).be.null;

			request(httpString).get('/')
				.expect(200)
                .expect('X-Forwarded-For', '127.0.0.1')
				.expect('Hello World\n')
				.end(done);
		})
	});
    
});