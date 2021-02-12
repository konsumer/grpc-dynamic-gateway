# grpc-dynamic-gateway

[![NPM](https://nodei.co/npm/grpc-dynamic-gateway.png?compact=true)](https://nodei.co/npm/grpc-dynamic-gateway/)

This will allow you to provide a REST-like JSON interface for your gRPC protobuf interface. [grpc-gateway](https://github.com/grpc-ecosystem/grpc-gateway) requires you to genrate a static version of your interface in go, then compile it. This will allow you to run a JSON proxy for your grpc server without generating/compiling.

* Install with `npm i -g grpc-dynamic-gateway`
* Start with `grpc-dynamic-gateway DEFINITION.proto`

You can see an example project [here](https://github.com/konsumer/grpcnode/tree/master/example) that shows how to use all the CLI tools, with no code other than your endpoint implementation.


# cli

```
Usage: grpc-dynamic-gateway [options] DEFINITION.proto [DEFINITION2.proto...]

Options:
  -?, --help, -h    Show help                                          [boolean]
  --port, -p        The port to serve your JSON proxy on         [default: 8080]
  --grpc, -g        The host & port to connect to, where your gprc-server is
                    running                         [default: "localhost:50051"]
  -I, --include     Path to resolve imports from.
                    Support multi include path, but you have to put the proto files
                    root in first include.
  --ca              SSL CA cert for gRPC
  --key             SSL client key for gRPC
  --cert            SSL client certificate for gRPC
  --mountpoint, -m  URL to mount server on                        [default: "/"]
  --quiet, -q       Suppress logs                                      [boolean]
```

# in code

You can use it in your code, too, as express/connect/etc middleware.

`npm i -S grpc-dynamic-gateway`

```js
const grpcGateway = require('grpc-dynamic-gateway')
const express = require('express')
const bodyParser = require('body-parser')

const app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

// load the proxy on / URL
app.use('/', grpcGateway(['api.proto'], '0.0.0.0:5051'))

const port = process.env.PORT || 8080
app.listen(port, () => {
  console.log(`Listening on http://0.0.0.0:${port}`)
})
```

# ssl

With SSL, you will need the Cert Authority certificate, client & server signed certificate and keys.


I generated/signed my demo keys like this:

```
openssl genrsa -passout pass:1111 -des3 -out ca.key 4096
openssl req -passin pass:1111 -new -x509 -days 365 -key ca.key -out ca.crt -subj  "/C=US/ST=Oregon/L=Portland/O=Test/OU=CertAuthority/CN=localhost"
openssl genrsa -passout pass:1111 -des3 -out server.key 4096
openssl req -passin pass:1111 -new -key server.key -out server.csr -subj  "/C=US/ST=Oregon/L=Portland/O=Test/OU=Server/CN=localhost"
openssl x509 -req -passin pass:1111 -days 365 -in server.csr -CA ca.crt -CAkey ca.key -set_serial 01 -out server.crt
openssl rsa -passin pass:1111 -in server.key -out server.key
openssl genrsa -passout pass:1111 -des3 -out client.key 4096
openssl req -passin pass:1111 -new -key client.key -out client.csr -subj "/C=US/ST=Oregon/L=Portland/O=Test/OU=Client/CN=localhost"
openssl x509 -passin pass:1111 -req -days 365 -in client.csr -CA ca.crt -CAkey ca.key -set_serial 01 -out client.crt
openssl rsa -passin pass:1111 -in client.key -out client.key
```

Then use it like this:

```
grpc-dynamic-gateway --ca=ca.crt --key=client.key --cert=client.crt api.proto
```

You can use SSL in code, like this:

```js
const grpc = require('grpc')
const credentials = grpc.credentials.createSsl(
  fs.readFileSync(yourca),
  fs.readFileSync(yourkey),
  fs.readFileSync(yourcert)
)
app.use('/', grpcGateway(['api.proto'], '0.0.0.0:5051', credentials))
```

# OpenAPI (a.k.a Swagger)

[Protoc](https://github.com/google/protobuf) can generate a OpenAPI description of your RPC endpoints, if you have [protoc-gen-openapiv2](https://github.com/grpc-ecosystem/grpc-gateway/tree/master/protoc-gen-openapiv2) installed:

```
protoc DEFINITION.proto --openapiv2_out=logtostderr=true:.
```

# docker

There is one required port, and a volume that will make it easier:

- `/api.proto` - your proto file
- `8080` - the exposed port

There is also an optional environment variable: `GRPC_HOST` which should resolve to your grpc server (default `0.0.0.0:5051`)

So to run it, try this:

```
docker run -v $(pwd)/your.proto:/api.proto -p 8080:8080 -e "GRPC_HOST=0.0.0.0:5051" -rm -it konsumer/grpc-dynamic-gateway
```

If you want to do something different, the exposed `CMD` is the same as `grpc-dynamic-gateway` CLI, above.
