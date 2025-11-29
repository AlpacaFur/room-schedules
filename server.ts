import express from "express"
import fs from "fs"
import { createProxyMiddleware } from "http-proxy-middleware"

const PORT = 9000
const server = express()

interface Class {
  name: string
  subject: string
  classId: string
  start: number
  end: number
}

type RoomAvailability = {
  0: Class[]
  1: Class[]
  2: Class[]
  3: Class[]
  4: Class[]
  5: Class[]
  6: Class[]
}

const rooms: Record<string, RoomAvailability> = JSON.parse(
  fs.readFileSync("./room-data/fall25.json").toString()
)
const room_names = Object.keys(rooms)
const ROOMS_JSON: Record<string, string> = {}
room_names.forEach((name) => {
  ROOMS_JSON[name] = JSON.stringify(rooms[name])
})
const ROOM_NAMES_JSON = JSON.stringify(room_names.sort())
console.log(`Loaded ${room_names.length} rooms!`)

const proxy = createProxyMiddleware({
  target: "http://localhost:5173",
  ws: true,
  logLevel: "warn",
})

server.get("/api/rooms", (req, res) => {
  res.type("json")
  res.status(200).send(ROOM_NAMES_JSON)
})

server.get("/api/room/:name", (req, res) => {
  if (ROOMS_JSON[req.params.name] !== undefined) {
    res.type("json")
    res.status(200).send(ROOMS_JSON[req.params.name])
  } else {
    res.status(404).send("No room with that name exists.")
  }
})

type RoomStatus = Free | Busy

type Time = number
type FutureTime = number | "tmrw"

interface Free {
  status: "free"
  since: Time
  until: FutureTime
}

interface Busy {
  status: "busy"
  freeat: Time
  until: FutureTime
}

function determineState(
  previousClass,
  nowSecs,
  currentClass,
  currentClassBlobEnd,
  nextFreestandingClass
) {
  if (currentClassBlobEnd > nowSecs) {
    return {
      state: "busy",
      // substate: (currentClass && currentClass.end ===) currentClassBlobEnd ? "current-only" : () ?
      until: currentClassBlobEnd,
      thenFreeUntil: nextFreestandingClass?.start ?? "tmrw",
      currentClassName: currentClass?.name,
    }
  } else {
    return {
      state: "free",
    }
  }
}

const MINIMUM_SEC_GAP = 20 * 60

server.get("/api/free", (req, res) => {
  const now = new Date(1763582400 * 1000)
  const nowSecs = (now.getHours() * 60 + now.getMinutes()) * 60

  const dayOfTheWeek = new Date().getDay()

  const roomEntries = Object.entries(rooms)
  const analyzed = roomEntries.map(([name, times]) => {
    const todayClasses = times[dayOfTheWeek].toSorted(
      (classA, classB) => classA.start - classB.start
    )

    const currentClass = todayClasses.find(
      (classInfo) => classInfo.start <= nowSecs && classInfo.end >= nowSecs
    )

    const previousClass = todayClasses.findLast(
      (classInfo) => classInfo.end < nowSecs
    )

    let lastEnd = Math.max(currentClass?.end ?? 0, nowSecs)
    const nextFreestandingClass = todayClasses.find((classInfo) => {
      if (classInfo.start <= nowSecs) {
        return false
      }
      if (classInfo.start - lastEnd < MINIMUM_SEC_GAP) {
        lastEnd = classInfo.end
      }
      return true
    })

    return {
      mode: currentClass !== undefined ? "" : "",
      name,
      currentClass,
      todayClasses,
    }
  })
  res.header("Content-Type", "application/json")
  res.send(
    JSON.stringify({
      dotw: dayOfTheWeek,
      analyzed: analyzed.slice(0, 3),
      nowMins: nowSecs,
    })
  )
})

server.use("/", proxy)

server.listen(PORT, () => {
  console.log(`Proxy is running on port ${PORT}!`)
})
