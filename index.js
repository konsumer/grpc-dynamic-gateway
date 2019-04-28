'use strict'

// TODO: socket.io for streams

const requiredGrpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')
const express = require('express')
const colors = require('chalk')
const fs = require('fs')
const schema = require('protocol-buffers-schema')
const colorize = require('json-colorizer')

const supportedMethods = ['get', 'put', 'post', 'delete', 'patch'] // supported HTTP methods
const paramRegex = /{(\w+)}/g // regex to find gRPC params in url

const lowerFirstChar = str => str.charAt(0).toLowerCase() + str.slice(1)

/**
 * generate middleware to proxy to gRPC defined by proto files
 * @param  {string[]} protoFiles Filenames of protobuf-file
 * @param  {string} grpcLocation HOST:PORT of gRPC server
 * @param  {ChannelCredentials}  gRPC credential context (default: grpc.credentials.createInsecure())
 * @param  {string} include      Path to find all includes
 * @return {Function}            Middleware
 */
const middleware = (protoFiles, grpcLocation, credentials = requiredGrpc.credentials.createInsecure(), debug = true, include = process.cwd(), grpc = requiredGrpc) => {
  const router = express.Router()
  const clients = {}
  if (include.endsWith('/')) {
    include = include.substring(0, include.length - 1) // remove"/"
  }
  protoFiles = protoFiles.map(function (value, index, array) {
    if (value.startsWith(include)) {
      value = value.substring(include.length + 1)
    }
    return value
  })

  const protos = protoFiles.map(p => {
    const packageDefinition = include ? protoLoader.loadSync(p, { includeDirs: Array.isArray(include) ? include : [include] }) : protoLoader.loadSync(p)
    return grpc.loadPackageDefinition(packageDefinition)
  })

  protoFiles
    .map(p => `${include}/${p}`)
    .map(p => schema.parse(fs.readFileSync(p)))
    .forEach((sch, si) => {
      const pkg = sch.package
      if (!sch.services) { return }
      sch.services.forEach(s => {
        const svc = s.name
        getPkg(clients, pkg, true)[svc] = new (getPkg(protos[si], pkg, false))[svc](grpcLocation, credentials)
        s.methods.forEach(m => {
          if (m.options['google.api.http']) {
            supportedMethods.forEach(httpMethod => {
              if (m.options['google.api.http'][httpMethod]) {
                if (debug) console.log(colors.green(httpMethod.toUpperCase()), colors.blue(m.options['google.api.http'][httpMethod]))
                router[httpMethod](convertUrl(m.options['google.api.http'][httpMethod]), (req, res) => {
                  const params = convertParams(req, m.options['google.api.http'][httpMethod])
                  const meta = convertHeaders(req.headers, grpc)
                  if (debug) {
                    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
                    console.log(`GATEWAY: ${colors.yellow((new Date()).toISOString())} (${colors.cyan(ip)}): /${colors.blue(pkg.replace(/\./g, colors.white('.')))}.${colors.blue(svc)}/${colors.cyan(m.name)}(${colorize(params)})`)
                  }

                  try {
                    getPkg(clients, pkg, false)[svc][lowerFirstChar(m.name)](params, meta, (err, ans) => {
                      // TODO: PRIORITY:MEDIUM - improve error-handling
                      // TODO: PRIORITY:HIGH - double-check JSON mapping is identical to grpc-gateway
                      if (err) {
                        console.error(colors.red(`${svc}.${m.name}`, err.message))
                        console.trace()
                        return res.status(500).json({ code: err.code, message: err.message })
                      }
                      res.json(convertBody(ans, m.options['google.api.http'].body, m.options['google.api.http'][httpMethod]))
                    })
                  } catch (err) {
                    console.error(colors.red(`${svc}.${m.name}: `, err.message))
                    console.trace()
                  }
                })
              }
            })
          }
        })
      })
    })
  return router
}

const getPkg = (client, pkg, create = false) => {
  if (!((pkg || '').indexOf('.') !== -1) && client[pkg] !== undefined) {
    return client[pkg]
  }

  if (((pkg || '').indexOf('.') !== -1) && client[pkg] !== undefined) {
    return client[pkg]
  }

  const ls = pkg.split('.')
  let obj = client
  ls.forEach(function (name) {
    if (create) {
      obj[name] = obj[name] || {}
    }
    obj = obj[name]
  })
  return obj
}

/**
 * Parse express request params & query into params for grpc client
 * @param  {Request} req Express request object
 * @param  {string} url  gRPC url field (ie "/v1/hi/{name}")
 * @return {Object}      params for gRPC client
 */
const convertParams = (req, url) => {
  const gparams = getParamsList(req, url)
  const out = req.body
  gparams.forEach(p => {
    if (req.query && req.query[p]) {
      out[p] = req.query[p]
    }
    if (req.params && req.params[p]) {
      out[p] = req.params[p]
    }
  })
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
const getParamsList = (req, url) => {
  let out = []
  if (req.query) {
    out = Object.keys(req.query)
  }
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
