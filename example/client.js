const grpc = require('grpc')
const path = require('path')

if (process.argv.length < 5) {
  const cname = path.basename(process.argv[2])
  console.error(`Usage: ${cname} PROTOFILE HOST METHOD INPUT
   eg: ${cname} localhost:5050 helloworld.proto helloworld.Greeter.sayHello '{"name":"World"}'`)
  process.exit(1)
}

const protoFile = process.argv[2]
const host = process.argv[3]
const ns = process.argv[4].split('.')
const pkg = ns[0]
const svc = ns[1]
const method = ns[2]
const input = process.argv[5] ? JSON.parse(process.argv[5]) : undefined
const proto = grpc.load(protoFile)
const client = new proto[pkg][svc](host, grpc.credentials.createInsecure())

client[method](input, (err, res) => {
  if (err) throw err
  console.log(JSON.stringify(res, null, 2))
})
