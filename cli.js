#! /usr/bin/env node

const grpcGateway = require('./index.js')
const yargs = require('yargs')
const express = require('express')
const bodyParser = require('body-parser')

const argv = yargs.usage('Usage: $0 [options] DEFINITION.proto [DEFINITION2.proto...]')
  .help('?')
  .alias('?', 'help')
  .alias('?', 'h')

  .default('port', process.env.PORT || 8080)
  .describe('port', 'The port to serve your JSON proxy on')
  .alias('port', 'p')

  .default('grpc', process.env.GRPC_HOST || '0.0.0.0:5051')
  .describe('grpc', 'The host & port to connect to, where your gprc-server is running')
  .alias('grpc', 'g')

  .default('mountpoint', '/')
  .describe('mountpoint', 'URL to mount server on')
  .alias('mountpoint', 'm')

  .argv

if (!argv._.length) {
  yargs.showHelp()
  process.exit(1)
}

const app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(argv.mountpoint, grpcGateway(argv._, argv.grpc))
app.listen(argv.port, () => {
  console.log(`Listening on http://0.0.0.0:${argv.port}`)
})
