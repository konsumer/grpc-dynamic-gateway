# grpc-dynamic-gateway

# (incomplete)

This will allow you to provide a REST-like JSON interface for your gRPC protobuf interface. [grpc-gateway](https://github.com/grpc-ecosystem/grpc-gateway) requires you to genrate a static version of your interface in go, then compile it. This will allow you to run a JSON proxy for your grpc server without generating/compiling.

* Install with `npm -g grpc-dynamic-gateway`
* Start with `grpc-dynamic-gateway DEFINITION.proto`


# cli

```
Usage: grpc-dynamic-gateway [options] DEFINITION.proto [DEFINITION2.proto...]

Options:
  -?, --help, -h    Show help                                          [boolean]
  --port, -p        The port to serve your JSON proxy on         [default: 8080]
  --grpc, -g        The host & port to connect to, where your gprc-server is
                    running                            [default: "0.0.0.0:5051"]
  --mountpoint, -m  URL to mount server on                        [default: "/"]
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

// load the actual proxy
app.use(grpcGateway('api.proto', '0.0.0.0:5051'))

const port = process.env.PORT || 8080

app.listen(port, () => {
  console.log(`Listening on http://0.0.0.0:${port}`)
})
```

# swagger

[Protoc](https://github.com/google/protobuf) can generate a swagger description of your RPC endpoints, if you have [protoc-gen-swagger](https://github.com/grpc-ecosystem/grpc-gateway/protoc-gen-swagger) installed:

```
protoc data-contracts/proto/services/events.proto --swagger_out=logtostderr=true:.
```

# docker

There is one required port, and a volume that will make it easier:

- `/api.proto` - your proto file
- `8080` - the exposed port

There is also an optional environment variable: `GRPC_HOST` which should resolve to your grpc sever (default `0.0.0.0:5051`)

So to run it, try this:

```
docker run -v $(pwd)/your.proto:/api.proto -p 8080:8080 -e "GRPC_HOST=0.0.0.0:5051" -rm -it konsumer/grpc-dynamic-gateway
```

If you want to do something different, the exposed `CMD` is the same as `grpc-dynamic-gateway` CLI, above.
