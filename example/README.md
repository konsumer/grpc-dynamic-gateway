# Example gRPC server

Simple example server for testing.

* run with `node example example/api.proto 5050 ./example/api.js` from the root of gprc-dynamic-gateway project.
* test with `node example/client example/api.proto localhost:5050 helloworld.Greeter.sayHello '{"name":"World"}'`
