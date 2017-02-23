const requiredGrpc = require('grpc')
const express = require('express')

const supportedMethods = ['get', 'put', 'post', 'delete', 'patch'] // supported HTTP methods
const paramRegex = /{(\w+)}/g // regex to find gRPC params in url

/**
 * generate middleware to proxy to gRPC defined by proto files
 * @param  {string[]} protoFiles Filenames of protobuf-file
 * @param  {string} grpcLocation HOST:PORT of gRPC server
 * @param  {ChannelCredentials}  gRPC credential context (default: grpc.credentials.createInsecure())
 * @param  {string} include      Path to find all includes
 * @return {Function}            Middleware
 */
const middleware = (protoFiles, grpcLocation, credentials, debug, include, grpc) => {
  grpc = grpc || requiredGrpc
  credentials = credentials || grpc.credentials.createInsecure()
  const clients = {}
  const router = express.Router()
  protoFiles.forEach(p => {
    const proto = include ? grpc.load({file: p, root: include}) : grpc.load(p)
    Object.keys(proto).forEach(pkg => {
      clients[pkg] = clients[pkg] || {}
      Object.keys(proto[pkg]).forEach(svc => {
        if (proto[pkg][svc].service && proto[pkg][svc].service.children.length) {
          clients[pkg][svc] = new proto[pkg][svc](grpcLocation, credentials)
          proto[pkg][svc].service.children
            .filter(child => child.className === 'Service.RPCMethod' && child.options)
            .forEach(child => {
              // TODO: PRIORITY:LOW - handle child.options.additional_bindings
              supportedMethods.forEach(httpMethod => {
                if (typeof child.options[`(google.api.http).${httpMethod}`] !== 'undefined') {
                  if (debug) {
                    console.log(httpMethod.toUpperCase(), child.options[`(google.api.http).${httpMethod}`], ':', `${pkg}.${svc}.${child.name}(${child.requestName})`, '→', child.responseName)
                  }
                  router[httpMethod](convertUrl(child.options[`(google.api.http).${httpMethod}`]), (req, res) => {
                    const params = convertParams(req, child.options[`(google.api.http).${httpMethod}`])
                    const meta = convertHeaders(req.headers, grpc)
                    if (debug) {
                      console.log(`${pkg}.${svc}.${child.name}(${JSON.stringify(params)})`)
                    }
                    clients[pkg][svc][child.name](params, meta, (err, ans) => {
                      // TODO: PRIORITY:MEDIUM - improve error-handling
                      // TODO: PRIORITY:HIGH - double-check JSON mapping is identical to grpc-gateway
                      if (err) {
                        console.error(err.message)
                        return res.status(500).json({code: err.code, message: err.message})
                      }
                      res.json(convertBody(ans, child.options['(google.api.http).body'], child.options[`(google.api.http).${httpMethod}`]))
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
  // TODO: PRIORITY:LOW - use types to generate regex for numbers & strings in params
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

/**
 * Convert headers into gRPC meta
 * @param  {object} headers Headers: {name: value}
 * @return {meta}           grpc meta object
 */
const convertHeaders = (headers, grpc) => {
  grpc = grpc || requiredGrpc
  headers = headers || {}
  const metadata = new grpc.Metadata()
  Object.keys(headers).forEach(h => { metadata.set(h, headers[h]) })
  return metadata
}

// interface
module.exports = middleware
module.exports.convertParams = convertParams
module.exports.convertUrl = convertUrl
module.exports.convertBody = convertBody
module.exports.getParamsList = getParamsList
module.exports.convertHeaders = convertHeaders
