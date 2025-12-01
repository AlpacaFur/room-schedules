import { useQuery } from "@tanstack/react-query"
import type { Building, FreeRoomsRequest, NamedRoomStatus } from "../../../server/types"

export const FreeRoomContent: React.FC<{
  time: number
  dayOfTheWeek: FreeRoomsRequest['dayOfTheWeek']
  origin: {
    type: "building" | "room"
    name: string
  }
  minimumDuration: number | false
}> = ({ time, origin, dayOfTheWeek, minimumDuration }) => {
  const query = useQuery<Building[]>({
    queryKey: ["api", "free", time, dayOfTheWeek, origin.name, minimumDuration],
    staleTime: 'static',
    queryFn: () =>
      fetch("/api/free", {
        method: "POST",
        body: JSON.stringify({
          time,
          origin,
          dayOfTheWeek,
          minimumDuration,
          maximumWait: 60 * 60
        } satisfies FreeRoomsRequest),
        headers: { "content-type": "application/json" },
      }).then((res) => res.json()),
  })

  if (query.isPending) {
    return <p>Loading...</p>
  } else if (query.isError) {
    return <p>Error: {String(query.error)}</p>
  }

  return (
    <div>
      {query.data.map((building) => (
        <FreeBuilding building={building} now={time} key={building.name} />
      ))}
    </div>
  )
}

export const FreeBuilding: React.FC<{ building: Building; now: number }> = ({
  building,
  now,
}) => {
  return (
    <div>
      <h1>{building.name}</h1>
      <div className="free-card-container">
        {building.rooms.map((room) => (
          <Room room={room} now={now} key={room.room} />
        ))}
      </div>
    </div>
  )
}

function hoursTo12Hour(hours: number) {
  if (hours === 0) return 12
  if (hours >= 13) return hours - 12
  return hours
}

function formatSecondsToTime(seconds: number) {
  const hour = Math.floor(seconds / 60 / 60)
  const minutes = Math.floor(seconds / 60 - hour * 60)
  const amPm = hour >= 12 ? "pm" : "am"

  if (minutes === 0) {
    return `${hoursTo12Hour(hour)}${amPm}`
  }

  const minutesFormatted = String(minutes).padStart(2, "0")

  return `${hoursTo12Hour(hour)}:${minutesFormatted}${amPm}`
}

function formatUntil(until: number | "tmrw") {
  if (until === "tmrw") return "tmrw"
  else return formatSecondsToTime(until)
}

function formatDuration(seconds: number) {
  const hour = Math.floor(seconds / 60 / 60)
  const minutes = Math.floor(seconds / 60 - hour * 60)

  if (hour > 0 && minutes === 0) {
    return `${hour}h`
  } else if (hour === 0) {
    return `${minutes}m`
  } else {
    return `${hour}h ${minutes}m`
  }
}

export const Room: React.FC<{ room: NamedRoomStatus; now: number }> = ({
  room,
  now,
}) => {
  if (room.status === "busyUntilTmrw") {
    return (
      <div className="free-card busy-forever">
        <p>{room.room} • Busy until tmrw</p>
        <p>Busy!</p>
      </div>
    )
  }
  if (room.status === "busy") {
    if (room.until === "tmrw") {
      return (
        <div
          className={`free-card ${
            room.freeAt - now < 10 * 60 ? "free-soon" : "busy"
          }`}
        >
          <p>
            {room.room} • in <b>{formatDuration(room.freeAt - now)}</b>
          </p>
          <p>Free {formatSecondsToTime(room.freeAt)} – tmrw</p>
        </div>
      )
    } else {
      return (
        <div
          className={`free-card ${
            room.freeAt - now < 10 * 60 ? "free-soon" : "busy"
          }`}
        >
          <p>
            {room.room} • in <b>{formatDuration(room.freeAt - now)}</b> for{" "}
            <b>{formatDuration(room.until - now)}</b>
          </p>
          <p>
            Free {formatSecondsToTime(room.freeAt)} –{" "}
            {formatSecondsToTime(room.until)}
          </p>
        </div>
      )
    }
  }

  return (
    <div className="free-card free-now">
      <p>
        <span className="card-room">{room.room}</span>{" "}
        <span className="dot">•</span> {room.until !== "tmrw" && "for"}{" "}
        {room.until !== "tmrw" && <b>{formatDuration(room.until - now)}</b>}{" "}
        until <b>{formatUntil(room.until)}</b>
      </p>
      <p>
        Since {formatSecondsToTime(room.since)} (
        {formatDuration(now - room.since)} ago)
      </p>
    </div>
  )
}
