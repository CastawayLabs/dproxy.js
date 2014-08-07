dproxy
======

Fast, Lightweight, Dynamic.

node.js reverse proxy driven by `redis`.

How is it faster
----------------

- `dproxy` abstracts from http to raw tcp/tls
- Uses `redis` for dynamic hostname lookup
- Does not modify the content of the request

Its just a fast transparent proxy, with dynamic hostname lookup and SNI support. Nothing fancy [yet].

How it works
------------

Requriements
------------

If you want to use SSL. SNI was recently introduced into TLS, therefore you must use the `node v0.11.x` version.

Features:
---------

- [x] Production-tested at NodeGear
- [x] SSL Termination
- [x] Load Balancing
- [x] Dynamic Routing
- [x] HTTP-ready
- [x] HTTPs-ready
- [x] TCP, Websocket, TLS support
- [ ] Request Statistics (read below)

Basically any tcp requests that share hostname in the first few lines will get properly proxied to the target application.

Unlike nginx or node-http-proxy, this is capable of proxying just about anything, dynamically.

Redis
-----
- HASH `proxy:domain_ssl_{hostname}`
- HASH `proxy:domain_details_{hostname}`

**Setup**

Example for domain `foo.bar`

**SSL:** If you want to enable SSL for the domain, Add a key `proxy:domain_ssl_foo.bar` to redis and set `key` and `crt` properties.

`proxy:domain_details_foo.bar`:

1. `apps` to a json array.
Example: (javascript)

```javascript
JSON.stringify([{
	port: 8888,
	host: '127.0.0.1'
}])
```

Refer to the tests for further details, create an issue or contact us.

Request analytics
-----------------

__note, this feature is not done yet__

By default, all request will be logged via redis pub/sub or into the redis database, where a daemon service picks it up.

Recorded parameters:

- IP Address
- Proxy information (if the user is behind a proxy, an array of ips is available)
- Request time
- Target ID
- Time and date of request
- Request size (bytes) - (note, in case of TLS, the encrypted request is recorded)
- Response size (bytes)

Development is Sponsored By NodeGear
------------------------------------

Contributors:
-------------

- Matej Kramny

Alternatives:
-------------

- [`node-http-proxy`](https://github.com/nodejitsu/node-http-proxy)
- [`nginx` (inspiration)](http://nginx.org)
