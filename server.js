const PORT = 9000

const express = require("express")
const fs = require("fs")
const { createProxyMiddleware } = require("http-proxy-middleware");
const server = express()

const rooms = JSON.parse(fs.readFileSync("spring2023.json"))
const room_names = Object.keys(rooms)
const ROOMS_JSON = {}
room_names.forEach((name)=>{
  ROOMS_JSON[name] = JSON.stringify(rooms[name])
})
const ROOM_NAMES_JSON = JSON.stringify(room_names.sort())
console.log(`Loaded ${room_names.length} rooms!`)

const proxy = createProxyMiddleware({
  target: "http://localhost:8080",
  ws: true,
  logLevel: "warn",
});


server.get("/api/rooms", (req, res)=>{
  res.type("json")
  res.status(200).send(ROOM_NAMES_JSON)
})

server.get("/api/room/:name", (req, res)=>{
  if (ROOMS_JSON[req.params.name] !== undefined) {
    res.type("json")
    res.status(200).send(ROOMS_JSON[req.params.name])
  } else {
    res.status(404).send("No room with that name exists.")
  }
})

server.use("/", proxy)

server.listen(PORT, ()=>{
  console.log(`Proxy is running on port ${PORT}!`)
})