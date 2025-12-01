import express from "express"
import fs from "fs"
import { createProxyMiddleware } from "http-proxy-middleware"
import {
  type Busy,
  type BusyUntilTmrw,
  type RoomStatus,
  type NamedRoomStatus,
  type Building,
  type Class,
  freeRoomsRequestSchema,
} from "./server/types.ts"


const PORT = 9000
const server = express()

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
})

server.use(express.json())

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
  originBuildingName: string,
  unsortedBuildings: Building[]
): Building[] {
  const originBuilding = unsortedBuildings.find((building) => building.name === originBuildingName)
  const otherBuildings = unsortedBuildings.filter((building) => building.name !== originBuildingName)
  // TODO: actually sort based on lat/long
  if (originBuilding) {
    return [
      originBuilding,
      ...otherBuildings
    ]
  }
  return otherBuildings
}

function freeDuration(room: NamedRoomStatus, nowSecs: number) {
  if (room.status === "busyUntilTmrw") {
    return 0
  }
  const until = room.until === "tmrw" ? SECS_PER_DAY : room.until

  if (room.status === "free") {
    return until - nowSecs
  } else {
    return until - room.freeAt
  }
}

function scoreRoom(room: NamedRoomStatus, nowSecs: number) {
  let value = 0
  if (room.status === "free") value += 70
  if (room.status === "busy") {
    const waitTime = room.freeAt - nowSecs

    value += Math.max(0, 50 - 50 * ((waitTime / 60) * 5))
  }
  value += Math.min(20, freeDuration(room, nowSecs) / (60 * 10))

  return value
}

function rankWithinBuilding(
  building: Building,
  nowSecs: number,
  preferRecentTurnovers: boolean = false
) {
  return {
    ...building,
    rooms: building.rooms.toSorted((roomA, roomB) => {
      return scoreRoom(roomB, nowSecs) - scoreRoom(roomA, nowSecs)
    }),
  }
}

server.post("/api/free", (req, res) => {
  const parsed = freeRoomsRequestSchema.safeParse(req.body)

  if (parsed.error) {
    res.status(400).send(`Invalid request body: ${parsed.error}`)
    return
  }

  const { data } = parsed

  // const now = new Date(1764799500 * 1000)
  // const nowSecs = (now.getHours() * 60 + now.getMinutes()) * 60
  const nowSecs = data.time
  // console.log("a", nowSecs)

  // const origin = "Richards Hall 140"
  const originBuilding =
    data.origin.type === "building"
      ? data.origin.name
      : data.origin.name.match(/(.+) (.+)/)![1]

  // const dayOfTheWeek = new Date().getDay() as keyof RoomAvailability
  const dayOfTheWeek = data.dayOfTheWeek
  console.log(nowSecs)

  const minimumLengthSecs = (30 * 60) as number | false
  const maximumWait = 60 * 60
  const preferRecentTurnovers = true

  const roomEntries = Object.entries(rooms)
  const analyzed: NamedRoomStatus[] = roomEntries.map(([name, times]) => {
    const todayClasses = times[dayOfTheWeek].toSorted(
      (classA, classB) => classA.start - classB.start
    )

    const [, building, room] = name.match(/(.+) (.+)/)!

    return { building, room, ...analyzeRoomStatus(nowSecs, todayClasses) }
  })

  const usableRooms = analyzed.filter((room) => {
    if (room.status === "busyUntilTmrw") return false
    if (minimumLengthSecs === false) return true
    if (room.status === "free") {
      return room.until === "tmrw" || room.until - nowSecs >= minimumLengthSecs
    } else {
      return (
        room.freeAt - nowSecs < maximumWait &&
        (room.until === "tmrw" || room.until - room.freeAt >= minimumLengthSecs)
      )
    }
  })

  const buildings = clusterByBuilding(usableRooms)
  console.log(buildings.map(building => !!building))
  const orderedBuildings = orderBuildings(originBuilding, buildings)

  const closestBuildings = orderedBuildings.slice(0, 3)

  console.log(closestBuildings)

  const fullyRanked = closestBuildings.map((building) => {

    return rankWithinBuilding(building, nowSecs, preferRecentTurnovers)
  })

  console.log(req.body)

  res.header("Content-Type", "application/json")
  res.send(JSON.stringify(fullyRanked))
})

server.use("/", proxy)

server.listen(PORT, () => {
  console.log(`Proxy is running on port ${PORT}!`)
})
