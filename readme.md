dproxy
======

Fast, Lightweight, Dynamic.

node.js reverse proxy driven by `redis`

Quick start
-----------

Run redis:

```
docker run -d \
  --name=redisio \
  -v /var/lib/redisio:/var/lib/redis \
  -p 127.0.0.1:6379:6379 \
  castawaylabs/redis-docker
```

Run dproxy:

```
docker run -d \
  --name=dproxy \
  --restart=always \
  --link redisio:redis \
  -p 80:80 -p 443:443 \
  castawaylabs/dproxy
```

dproxy is fast
--------------

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

- Latest node.js (v0.12) or io.js (may work with node v0.11.x -- SSL requires TLS SNI support)
- Edit `lib/credentials.js` to your requirements
- Redis server
- (optional) statsd stack - read below

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
- [x] Request Statistics (read Request Analytics section)

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

Request statistics are sent to a `statsd` server.

`dproxy -> statsd -> carbon [-> graphite]`

You can visualise data at a graphite backend.

We've written a [docker image](https://github.com/CastawayLabs/graphite-statsd) which contains statsd + carbon & graphite.

In the future, all request may be logged via redis pub/sub or into the redis database, where a daemon service picks it up.

Recorded parameters:

- IP Address
- Request time
- Target ID
- Request size (bytes) - (note, in case of TLS, the encrypted request is recorded)
- Response size (bytes)

Tests
-----

1. Export `TEST` variable into the environment, run a local REDIS server. Be aware it erases its `proxy:...` keys during the test.
2. Set `PROXY_PORT` and `PROXY_PORTS` environment variables, or be `sudo` as it uses port 80 & 443 by default
3. Run tests with `mocha`.

The HTTPs tests will fail if you don't add local certificates (as the HTTPs server doesn't run). Copy `test_files/` certificates, call them `server.crt` and `server.key`.

Developed for [NodeGear](https://nodegear.com)
----------------------------------------------

Contributors:
-------------

- Matej Kramny <matej.kramny@castawaylabs.com>
- Mark Hendriks <mark.hendriks@castawaylabs.com>
- Anže Jenšterle <anze.jensterle@castawaylabs.com>

Alternatives:
-------------

- [`node-http-proxy`](https://github.com/nodejitsu/node-http-proxy)
- [`nginx` (inspiration)](http://nginx.org)
