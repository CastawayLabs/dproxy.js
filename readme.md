dproxy
======

Fast, Lightweight, Dynamic.

node.js reverse proxy driven by `redis`.

dproxy is faster
----------------

- It abstracts from http to raw tcp/tls, does minimal parsing. Once it gets the HOST header, it stops caring and just passes on the request.
- Uses `redis` for dynamic hostname lookup. It has no configuration files (apart from redis config)
- Does not modify the content of the request
- During normal browsing, the connection is kept with the target.. That results in ~2 proxy requests per user and the user can then view additional pages without further lookup.

Its just a fast transparent proxy, with dynamic hostname lookup and SNI support. Nothing fancy [yet].

How it works
------------

> .. it just does .. __this section isn't complete :)__

Requirements
------------

- `node v0.11.x` if you want to use SSL, as SNI was recently introduced into the TLS module.
- `lib/credentials.js` file (copy from `lib/credentials-test.js`) and customise to your liking

Features:
---------

- [x] Production-tested at NodeGear
- [x] SSL Termination
- [x] SSL Redirect
- [x] Load Balancing
- [x] Dynamic Routing
- [x] HTTP-ready
- [x] HTTPs-ready
- [x] TCP, Websocket, TLS support
- [ ] Request Statistics (read Request Analytics section)

Basically any tcp requests that share hostname in the first few lines will get properly proxied to the target application.

Unlike `nginx` or `node-http-proxy`, this is capable of proxying just about anything that is TCP, dynamically and without configuration files.

Redis
-----
- HASH `proxy:domain_ssl_{hostname}`
- HASH `proxy:domain_details_{hostname}`
- SET  `proxy:domain_members_{hostname}`

**Setup**

Example for domain `foo.bar`

**SSL:** If you want to enable SSL for the domain, Add a key `proxy:domain_ssl_foo.bar` to redis and set `key` and `crt` properties.

`proxy:domain_details_foo.bar`:

- `ssl`: true/false
- `ssl_only`: true/false

`proxy:domain_members_foo.bar`:

This is a set of JSON-encoded members. Add more members to load-balance the domain to different hosts. A member should consist of the following properties:

- `port`: 9999
- `host`: '127.0.0.1'

Refer to the tests for further details, create an issue or contact us.

Request analytics
-----------------

> note, this feature is partially done

Request statistics are sent to a `statsd` server.

`dproxy -> statsd -> carbon [-> graphite]`

You can visualise data at a graphite backend.

We've written a (docker image)[https://github.com/CastawayLabs/graphite-statsd] that contains statsd + carbon & graphite.

In the future, all request may be logged via redis pub/sub or into the redis database, where a daemon service picks it up.

Recorded parameters:

- IP Address
- Request time
- Target ID
- Request size (bytes) - (note, in case of TLS, the encrypted request is recorded)
- Response size (bytes)

Tests
-----

Export `TEST` variable into the environment, run a local REDIS server. Be aware it erases its `proxy:...` keys during the test.

Run tests with `mocha`.

The HTTPs tests will fail if you don't add local certificates (as the HTTPs server doesn't run).

On google compute instance `n1-standard-1`, the proxy added ~2 ms of delay to each request. This was partially because the redis server was on another instance (ping ~0.7ms).

Development is Sponsored By NodeGear
------------------------------------

Contributors:
-------------

- Matej Kramny <matej@matej.me>

Alternatives:
-------------

- [`node-http-proxy`](https://github.com/nodejitsu/node-http-proxy)
- [`nginx` (inspiration)](http://nginx.org)
