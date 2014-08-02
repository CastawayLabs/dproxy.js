try {
	var credentials = './credentials';
	if (process.env.TEST) {
		credentials = './credentials-test';

		console.log("-- TEST MODE --")
	}

	var credentials = require(credentials)
} catch (e) {
	console.log("\nNo credentials.js File!\n")
	process.exit(1);
}

exports.credentials = credentials;

exports.version = require('../package.json').version;
exports.production = process.env.NODE_ENV == "production";

exports.redis_key = credentials.redis_key;

exports.proxyPort = process.env.PROXY_PORT || 80;
exports.proxyPorts = process.env.PROXY_PORTS || 443;