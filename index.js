const grpc = require('grpc')
const express = require('express')

const supportedMethods = ['get', 'put', 'post', 'delete', 'patch'] // supported HTTP methods
const paramRegex = /{(\w+)}/g // regex to find gRPC params in url

const clients = {}

/**
 * generate middleware to proxy to gRPC defined by proto files
 * @param  {string[]} protoFiles Filenames of protobuf-file
 * @param  {string} grpcLocation HOST:PORT of gRPC server
 * @param  {ChannelCredentials}  gRPC credential context (default: grpc.credentials.createInsecure())
 * @return {Function}            Middleware
 */
const middleware = (protoFiles, grpcLocation, credentials = grpc.credentials.createInsecure()) => {
  const router = express.Router()
  protoFiles.forEach(p => {
    const proto = grpc.load(p)
    Object.keys(proto).forEach(pkg => {
      clients[pkg] = clients[pkg] || {}
      Object.keys(proto[pkg]).forEach(svc => {
        clients[pkg][svc] = new proto[pkg][svc](grpcLocation, credentials)
        if (proto[pkg][svc].service && proto[pkg][svc].service.children.length) {
          proto[pkg][svc].service.children
            .filter(child => child.className === 'Service.RPCMethod' && child.options)
            .forEach(child => {
              // TODO: handle child.options.additional_bindings
              supportedMethods.forEach(httpMethod => {
                if (typeof child.options[`(google.api.http).${httpMethod}`] !== 'undefined') {
                  router[httpMethod](convertUrl(child.options[`(google.api.http).${httpMethod}`]), (req, res) => {
                    clients[pkg][svc][child.name](convertParams(req, child.options[`(google.api.http).${httpMethod}`]), (err, ans) => {
                      // TODO: improve error-handling
                      if (err) {
                        return res.status(500).send(err)
                      }
                      res.send(convertBody(ans, child.options['(google.api.http).body'], child.options[`(google.api.http).${httpMethod}`]))
                    })
                  })
                }
              })
            })
        }
      })
    })
  })
  return router
}

/**
 * Swagger middleware to describe proto files
 * @param  {string[]} protoFiles Filenames of protobuf-file
 * @return {Function} Middleware
 */
const swaggerMiddleware = (protoFiles) => {
  if (!protoFiles) throw new Error('protoFiles is required')
  if (typeof protoFiles !== 'object') {
    protoFiles = [protoFiles]
  }
  const swagger = generateSwagger(protoFiles)
  const sw = JSON.stringify(swagger, null, 2)
  const router = express.Router()
  router.get('/swagger.json', (req, res) => res.json(sw))
  return router
}

/**
 * Generate swagger definition from proto files
 * @param  {string[]} protoFiles Filenames of protobuf-file
 * @return {Object} Swagger description
 */
const generateSwagger = (protoFiles) => {
  const out = {}
  // TODO: generate swagger definition
  return out
}

/**
 * Parse express request into params for grpc client
 * @param  {Request} req Express request object
 * @param  {string} url  gRPC url field (ie "/v1/hi/{name}")
 * @return {Object}      params for gRPC client
 */
const convertParams = (req, url) => {
  const gparams = getParamsList(url)
  const out = req.body
  gparams.forEach(p => { out[p] = req.params[p] })
  return out
}

/**
 * Convert gRPC URL expression into express
 * @param  {string} url gRPC URL expression
 * @return {string}     express URL expression
 */
const convertUrl = (url) => (
  // TODO: use types to generate regex for numbers & strings in params
  url.replace(paramRegex, ':$1')
)

/**
 * Convert gRPC response to output, based on gRPC body field
 * @param  {Object} value   gRPC response object
 * @param  {string} bodyMap gRPC body field
 * @return {mixed}          mapped output for `res.send()`
 */
const convertBody = (value, bodyMap) => {
  bodyMap = bodyMap || '*'
  if (bodyMap === '*') {
    return value
  } else {
    return value[bodyMap]
  }
}

/**
 * Get a list of params from a gRPC URL
 * @param  {string} url gRPC URL
 * @return {string[]}   Array of params
 */
const getParamsList = (url) => {
  const out = []
  let m
  while ((m = paramRegex.exec(url)) !== null) {
    if (m.index === paramRegex.lastIndex) {
      paramRegex.lastIndex++
    }
    out.push(m[1])
  }
  return out
}

// interface
module.exports = middleware
module.exports.swagger = swaggerMiddleware
module.exports.generateSwagger = generateSwagger
module.exports.convertParams = convertParams
module.exports.convertUrl = convertUrl
module.exports.convertBody = convertBody
module.exports.getParamsList = getParamsList
