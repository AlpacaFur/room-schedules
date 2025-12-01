import { useState } from "react"
import { FreeRoomContent } from "./FreeRoomContent"
import type { FreeRoomsRequest } from "../../../server/types"
import type { Location } from "../../App"

function timeToSeconds(timeString: string) {
  const [hours, minutes] = timeString.split(":")
  return Number(hours) * 60 * 60 + Number(minutes) * 60
}

export function FreeRooms({
  hidden,
  location,
}: {
  hidden: boolean
  location: Location
}) {
  const [time, setTime] = useState(() => {
    const now = new Date()
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
  })

  const [minDuration, setMinDuration] = useState<number | false>(false)

  const [dayOfTheWeek, setDayOfTheWeek] = useState(
    () => new Date().getDay() as FreeRoomsRequest["dayOfTheWeek"]
  )

  return (
    <div
      style={{
        display: hidden ? "none" : "flex",
        height: "100%",
        flexDirection: "column",
      }}
    >
      <header>
        <p>&lt;SEARCH BAR GOES HERE&gt;</p>
        <h1>Find Free Rooms</h1>
      </header>
      {location.location === "free" && (
        <main style={{paddingBottom: "20px"}}>
          <div className="filter-bar">
            <select
              defaultValue={dayOfTheWeek}
              onChange={(event) =>
                setDayOfTheWeek(
                  Number(event.target.value) as FreeRoomsRequest["dayOfTheWeek"]
                )
              }
            >
              <option value={1}>Monday</option>
              <option value={2}>Tuesday</option>
              <option value={3}>Wednesday</option>
              <option value={4}>Thursday</option>
              <option value={5}>Friday</option>
              <option value={6}>Saturday</option>
              <option value={0}>Sunday</option>
            </select>
            <input
              type="time"
              value={time}
              onChange={(event) => {
                if (event.target.value !== "") setTime(event.target.value)
              }}
            />
            <select
              value={minDuration.toString()}
              onChange={(event) => {
                setMinDuration(event.target.value === "any" ? false : Number(event.target.value))
              }}
            >
              <option value={"any"}>
                Any Duration
              </option>
              <option value={1800}>30m</option>
              <option value={3600}>1h</option>
              <option value={5400}>1h30m</option>
              <option value={7200}>2h</option>
              <option value={9000}>2h30m</option>
              <option value={10800}>3h</option>
              <option value={12600}>3h30m</option>
              <option value={14400}>4h</option>
            </select>
            {/* <div>
              <label>
                <input type="checkbox" disabled={true} />
                Prioritize Recently Free
              </label>
            </div> */}
          </div>
          <FreeRoomContent
            time={timeToSeconds(time)}
            origin={{ type: location.type, name: location.name }}
            dayOfTheWeek={dayOfTheWeek}
            minimumDuration={minDuration}
          />
        </main>
      )}
    </div>
  )
}
