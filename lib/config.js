try {
	var credentials = './credentials';
	if (process.env.TEST) {
		credentials = './credentials-test';
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

exports.ssl_ciphers = 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:AES128-GCM-SHA256:AES256-GCM-SHA384:ECDHE-RSA-RC4-SHA:ECDHE-ECDSA-RC4-SHA:RC4-SHA:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!3DES:!MD5:!PSK';