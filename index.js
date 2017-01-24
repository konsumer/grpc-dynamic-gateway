const grpc = require('grpc')

// TODO: build an express router instead of this middleware
// to handle "/v1/messages/{message_id}"
// https://expressjs.com/en/guide/routing.html#express-router
// https://github.com/googleapis/googleapis/blob/master/google/api/http.proto
// url.replace(/{(.+)}/, ':$1')
// bonus: actually parse the types of fields for correct regex of URL matching
//   (\w+) -> string, (\d+) for number
/**
 * generate middleware to handle proto files
 * @param  {[String]} protoFiles Filenames of protobuf-file
 * @param  {String} grpcLocation HOST:PORT of gRPC server
 * @return {Function}            Middleware
 */
module.exports = (protoFiles, grpcLocation) => {
  if (!protoFiles) throw new Error('protoFiles is required')
  if (!grpcLocation) throw new Error('grpcLocation is required')
  if (typeof protoFiles !== 'object') {
    protoFiles = [protoFiles]
  }
  const {restmap, clients} = generateMaps(protoFiles, grpcLocation)
  return (req, res, next) => {
    // TODO: errors for this point not being found or bad validation for input
    if (typeof restmap[req.method][req.path] !== 'undefined') {
      const r = restmap[req.method][req.path]
      if (typeof clients[r.pkg][r.svc][r.method] !== 'undefined') {
        clients[r.pkg][r.svc][r.method](bodyMap(req.body, r.body), (err, out) => {
          // TODO: proper err-mapping
          if (err) { return next(err) }
        })
      }
    }
  }
}

// dummy function that only works properly for '*' body
function bodyMap (body, map) {
  return body
}

/**
 * Generate mapping from protofiles to REST and gRPC clients
 * @param  {[String]} protoFiles Filenames of protobuf-file
 * @param  {String} grpcLocation HOST:PORT of gRPC server
 * @return {Object}              {clients, restmap}
 */
function generateMaps (protoFiles, grpcLocation) {
  const clients = {}
  const restmap = {get: {}, put: {}, post: {}, delete: {}, patch: {}}
  protoFiles.forEach(p => {
    const proto = grpc.load(p)
    Object.keys(proto).forEach(pkg => {
      clients[pkg] = clients[pkg] || {}
      Object.keys(proto[pkg]).forEach(svc => {
        if (proto[pkg][svc].service) {
          clients[pkg][svc] = new proto[pkg][svc](grpcLocation, grpc.credentials.createInsecure())
          proto[pkg][svc].service.children
            .filter(child => child.className === 'Service.RPCMethod' && child.options)
            .map(child => ({options: child.options, name: child.name}))
            .forEach(child => {
              Object.keys(restmap).forEach(method => {
                if (child.options['(google.api.http).' + method]) {
                  restmap[method][ child.options['(google.api.http).' + method] ] = {
                    body: child.options['(google.api.http).body'],
                    pkg,
                    svc,
                    method: child.name
                  }
                }
              })
            })
        }
      })
    })
  })
  return {clients, restmap}
}
module.exports.generateMaps = generateMaps

/**
 * GET /swagger.json middleware for proto files
 * @param  {[String]} protoFiles Filenames of protobuf-file
 * @return {Function} Middleware
 */
module.exports.swagger = (protoFiles) => {
  if (!protoFiles) throw new Error('protoFiles is required')
  if (typeof protoFiles !== 'object') {
    protoFiles = [protoFiles]
  }
  const swagger = {}
  // TODO: build swagger from proto array
  const sw = JSON.stringify(swagger, null, 2)
  return (req, res, next) => {
    if (req.method === 'GET' && req.path === '/swagger.json') {
      res.send(sw)
    }
  }
}
