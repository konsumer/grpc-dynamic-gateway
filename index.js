/**
 * generate middleware to handle proto
 * @param  {String} proto Filename of protobuf-file
 * @param  {String} grpc  HOST:PORT of grpc server
 * @return {Function}     Middleware
 */
module.exports = (proto, grpc) => {
  if (!proto) throw new Error('proto is required')
  if (!grpc) throw new Error('grpc is required')
  return (req, res, next) => {
    // TODO: forward protobuf request to grpc server
  }
}

/**
 * GET /swagger.json middleware for protobuf
 * @param  {String/Array} proto Filename of protobuf-file
 * @return {Function}     Middleware
 */
module.exports.swagger = (proto) => {
  if (!proto) throw new Error('proto is required')
  if (typeof proto !== 'object') {
    proto = [proto]
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
