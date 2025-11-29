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

type NamedRoomStatus = RoomStatus & {
  building: string
  room: string
}

type RoomStatus = Free | Busy | BusyUntilTmrw

type Time = number
type FutureTime = number | "tmrw"

interface Free {
  status: "free"
  since: Time
  until: FutureTime
}

interface Busy {
  status: "busy"
  freeAt: Time
  until: FutureTime
}

interface BusyUntilTmrw {
  status: "busyUntilTmrw"
}

const MINIMUM_SEC_GAP = 20 * 60
const SECS_PER_DAY = 60 * 60 * 24

function checkIfBusy(
  timeSecs: number,
  currentClass: Class | undefined,
  nextClass: Class | undefined
): boolean {
  const noTimeLeftInDay = timeSecs + MINIMUM_SEC_GAP >= SECS_PER_DAY
  return (
    noTimeLeftInDay ||
    !!currentClass ||
    (!!nextClass && nextClass.start <= timeSecs + MINIMUM_SEC_GAP)
  )
}

function assertImpossible(message: string): never {
  throw new Error(message)
}

function analyzeBusyStatus(
  timeSecs: number,
  currentClass: Class | undefined,
  nextClass: Class | undefined,
  dayClasses: Class[]
): Busy | BusyUntilTmrw {
  const currentOrNextClass = currentClass ?? nextClass

  if (!currentOrNextClass) {
    if (timeSecs + MINIMUM_SEC_GAP < SECS_PER_DAY) {
      return assertImpossible(
        "Busy but no future classes and time left in day."
      )
    }
    return { status: "busyUntilTmrw" }
  }

  const currentOrNextIndex = dayClasses.indexOf(currentOrNextClass)
  let nextFreeTime = currentOrNextClass.end
  let latestClassInfo = currentOrNextClass
  let classIndex = currentOrNextIndex + 1

  for (; classIndex < dayClasses.length; classIndex += 1) {
    const classInfo = dayClasses[classIndex]
    if (nextFreeTime + MINIMUM_SEC_GAP < classInfo.start) break
    latestClassInfo = classInfo
    nextFreeTime = latestClassInfo.end
  }

  if (nextFreeTime + MINIMUM_SEC_GAP >= SECS_PER_DAY)
    return { status: "busyUntilTmrw" }

  return {
    status: "busy",
    freeAt: nextFreeTime,
    until: dayClasses[classIndex]?.start ?? "tmrw",
  }
}

function analyzeRoomStatus(timeSecs: number, dayClasses: Class[]): RoomStatus {
  const currentClass = dayClasses.find(
    (classInfo) => classInfo.start <= timeSecs && classInfo.end >= timeSecs
  )
  const nextClass = dayClasses.find((classInfo) => classInfo.start > timeSecs)

  const isBusy = checkIfBusy(timeSecs, currentClass, nextClass)

  if (isBusy) {
    return analyzeBusyStatus(timeSecs, currentClass, nextClass, dayClasses)
  } else {
    const prevClass = dayClasses.findLast(
      (classInfo) => classInfo.end < timeSecs
    )

    return {
      status: "free",
      since: prevClass?.end ?? 0,
      until: nextClass?.start ?? "tmrw",
    }
  }
}

function clusterByBuilding(analyzed: NamedRoomStatus[]): Building[] {
  const res = Object.groupBy(analyzed, (room) => room.building) as Record<
    string,
    NamedRoomStatus[]
  >
  return Object.entries(res).map(([building, rooms]) => ({
    name: building,
    rooms,
  }))
}

function orderBuildings(
  originBuilding: string,
  unsortedBuildings: Building[]
): Building[] {
  // TODO: actually sort based on lat/long
  return [
    unsortedBuildings.find((building) => building.name === originBuilding)!,
    ...unsortedBuildings.filter((building) => building.name !== originBuilding),
  ]
}

interface Building {
  name: string
  rooms: RoomStatus[]
}

function rankWithinBuilding(building: Building) {
  return building
}

server.get("/api/free", (req, res) => {
  const now = new Date(1763582400 * 1000)
  const nowSecs = (now.getHours() * 60 + now.getMinutes()) * 60

  const origin = "Cargill Hall 094"
  const originBuilding = origin.match(/(.+) (.+)/)![1]

  const dayOfTheWeek = new Date().getDay() as keyof RoomAvailability

  const roomEntries = Object.entries(rooms)
  const analyzed: NamedRoomStatus[] = roomEntries.map(([name, times]) => {
    const todayClasses = times[dayOfTheWeek].toSorted(
      (classA, classB) => classA.start - classB.start
    )

    const [, building, room] = name.match(/(.+) (.+)/)!

    return { building, room, ...analyzeRoomStatus(nowSecs, todayClasses) }
  })

  const buildings = clusterByBuilding(analyzed)
  const orderedBuildings = orderBuildings(originBuilding, buildings)

  const closestBuildings = orderedBuildings.slice(0, 3)

  const fullyRanked = closestBuildings.map(rankWithinBuilding)

  res.header("Content-Type", "application/json")
  res.send(
    JSON.stringify({
      rankedBuildings: fullyRanked,
    })
  )
})

server.use("/", proxy)

server.listen(PORT, () => {
  console.log(`Proxy is running on port ${PORT}!`)
})
