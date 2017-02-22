const grpc = require('grpc')
const path = require('path')
const Module = require('module')

if (process.argv.length < 5) {
  const cname = path.basename(process.argv[1])
  console.error(`Usage: ${cname} PROTOFILE PORT IMPLEMENTATION
   eg: ${cname} localhost:5050 helloworld.proto 5050 ./helloworld.js`)
  process.exit(1)
}

const getModule = (dir) => {
  const rootPath = dir ? path.resolve(dir) : process.cwd()
  const rootName = path.join(rootPath, '@root')
  const root = new Module(rootName)
  root.filename = rootName
  root.paths = Module._nodeModulePaths(rootPath)
  return root
}
const requireRelative = (requested, relativeTo) => getModule(relativeTo).require(requested)

const protoFile = process.argv[2]
const port = process.argv[3]

const server = new grpc.Server()
const proto = grpc.load(protoFile)
const methods = requireRelative(process.argv[4])

Object.keys(proto).forEach(p => {
  Object.keys(proto[p]).forEach(t => {
    if (proto[p][t].service) {
      const methodImplementations = {}
      proto[p][t].service.children.forEach(c => {
        console.log(`${p}.${t}.${c.name}()`)
        methodImplementations[c.name] = methods[p][t][c.name]
      })
      server.addProtoService(proto[p][t].service, methodImplementations)
    }
  })
})

server.bind('0.0.0.0:' + port, grpc.ServerCredentials.createInsecure())
server.start()
