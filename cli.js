#! /usr/bin/env node

const fs = require('fs')
const grpcGateway = require('./index.js')
const yargs = require('yargs')
const express = require('express')
const bodyParser = require('body-parser')
const grpc = require('grpc')

const argv = yargs.usage('Usage: $0 [options] DEFINITION.proto [DEFINITION2.proto...]')
  .help('?')
  .alias('?', 'help')
  .alias('?', 'h')

  .default('port', process.env.PORT || 8080)
  .describe('port', 'The port to serve your JSON proxy on')
  .alias('port', 'p')

  .default('grpc', process.env.GRPC_HOST || 'localhost:5051')
  .describe('grpc', 'The host & port to connect to, where your gprc-server is running')
  .alias('grpc', 'g')

  .describe('I', 'Path to resolve imports from')
  .alias('I', 'include')

  .describe('ca', 'SSL CA cert for gRPC')
  .describe('key', 'SSL client key for gRPC')
  .describe('cert', 'SSL client certificate for gRPC')

  .default('mountpoint', '/')
  .describe('mountpoint', 'URL to mount server on')
  .alias('mountpoint', 'm')

  .argv

if (!argv._.length) {
  yargs.showHelp()
  process.exit(1)
}

let credentials
if (argv.ca || argv.key || argv.cert) {
  if (!(argv.ca && argv.key && argv.cert)) {
    console.log('SSL requires --ca, --key, & --cert\n')
    yargs.showHelp()
    process.exit(1)
  }
  credentials = grpc.credentials.createSsl(
    fs.readFileSync(argv.ca),
    fs.readFileSync(argv.key),
    fs.readFileSync(argv.cert)
  )
} else {
  credentials = grpc.credentials.createInsecure()
}

const app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(argv.mountpoint, grpcGateway(argv._, argv.grpc, credentials, true, argv.include))
app.listen(argv.port, () => {
  console.log(`Listening on http://0.0.0.0:${argv.port}, proxying to gRPC on ${argv.grpc}`)
})
