import { useState, useRef, useEffect } from "react"
import { CURRENT_SEMESTER_CODE } from "./constants"
import { range } from "./utils"

const START_OF_DAY = 24000 // 06:40
const END_OF_DAY = 80400 // 22:20
const EFFECTIVE_DAY_LENGTH = END_OF_DAY - START_OF_DAY
const HOUR_MARKER_RANGE = range(7, 22)

function secondsToTime(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const formattedHours = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0")
  const minutes = ((seconds - hours * 3600) / 60).toString().padStart(2, "0")
  return `${formattedHours}:${minutes}`
}

function timeToSeconds(hours: number, minutes: number) {
  return 3600 * hours + 60 * minutes
}

function timeToPercent(timeInSeconds: number) {
  return ((timeInSeconds - START_OF_DAY) / EFFECTIVE_DAY_LENGTH) * 100 + "%"
}

function timeToHeight(timeInSeconds: number) {
  return (timeInSeconds / EFFECTIVE_DAY_LENGTH) * 100 + "%"
}

interface ClassProps {
  height: string
  pos: string
  name: string
  subject: string
  courseCode: string
  time: {
    start: number
    end: number
  }
}

function Class(props: ClassProps) {
  return (
    <a
      style={{ height: props.height, top: props.pos }}
      className="class"
      href={`https://searchneu.com/catalog/${CURRENT_SEMESTER_CODE}/${props.subject} ${props.courseCode}`}
    >
      <p className="class-time">
        {secondsToTime(props.time.start) + "-" + secondsToTime(props.time.end)}
      </p>
      <p className="className">{props.name}</p>
      <p className="classId">{props.subject + props.courseCode}</p>
    </a>
  )
}

interface DayContentProps {
  times: RoomData[]
  timeMarker: number | false
}

function DayContent(props: DayContentProps) {
  let timeMarker = null
  if (props.timeMarker !== false) {
    timeMarker = (
      <div
        className="time-marker"
        style={{ top: timeToPercent(props.timeMarker * 60) }}
      ></div>
    )
  }
  return (
    <div className="cont">
      {HOUR_MARKER_RANGE.map((hour) => {
        const position = timeToPercent(timeToSeconds(hour, 0))
        return (
          <div
            key={"line" + hour}
            className="hour-line"
            style={{ top: position }}
          ></div>
        )
      })}
      {props.times.map((event, index) => {
        const height = timeToHeight(event.time.end - event.time.start)
        const topPos = timeToPercent(event.time.start)
        return (
          <Class
            height={height}
            pos={topPos}
            name={event.name}
            subject={event.subject}
            courseCode={event.courseCode}
            time={event.time}
            key={event.subject + event.courseCode + "-" + index}
          />
        )
      })}
      {timeMarker}
    </div>
  )
}

interface DayProps {
  day: number
  times: RoomData[]
  timeMarker: number | false
}

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]
function Day(props: DayProps) {
  return (
    <div className="day">
      <DayContent times={props.times} timeMarker={props.timeMarker} />
    </div>
  )
}

interface DayLabelsProps {
  scroll: number
}

function DayLabels(props: DayLabelsProps) {
  const contRef = useRef<HTMLDivElement>(null)
  const dayLabels = range(0, 6).map((day) => {
    // Shift to make Monday come first.
    const shifted = (day + 1) % 7
    return (
      <p key={shifted} className="day-name">
        {DAYS[shifted]}
      </p>
    )
  })

  useEffect(() => {
    if (contRef.current) {
      contRef.current.scrollLeft = props.scroll
    }
  }, [props.scroll])

  const elem = (
    <div ref={contRef} className="day-labels">
      {dayLabels}
    </div>
  )
  return elem
}

interface RoomData {
  name: string
  subject: string
  courseCode: string
  startDate: string
  endDate: string
  time: {
    start: number
    end: number
  }
}

interface RoomProps {
  hidden: boolean
  room: string | null
  onBack: () => void
}

function getCurrentlyApplicableEvents(roomDays: RoomDays): RoomDays {
  const nowTimestamp = Date.now()
  const currentEvents = Object.entries(roomDays).map(([day, events]) => {
    return [
      day,
      events.filter((event) => {
        const start = new Date(event.startDate + " EST").getTime()
        const end = new Date(event.endDate + " EST").getTime()
        return start <= nowTimestamp && nowTimestamp <= end
      }),
    ]
  })

  return Object.fromEntries(currentEvents)
}

type RoomDays = Record<string, RoomData[]>

export function Room(props: RoomProps) {
  const [scrollLeft, setScrollLeft] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [dayOfTheWeek, setDayOfTheWeek] = useState(0)
  const [room, setRoom] = useState<RoomDays>({})

  useEffect(() => {
    setRoom({})
    if (props.room !== null) {
      fetch(`/api/room/${encodeURIComponent(props.room)}`)
        .then((res) => res.json())
        .then((res) => setRoom(getCurrentlyApplicableEvents(res)))
    }
  }, [props.room])

  function updateTime() {
    const now = new Date()
    setCurrentTime(now.getHours() * 60 + now.getMinutes())
    setDayOfTheWeek(now.getDay())
  }

  useEffect(() => {
    updateTime()
    const interval = setInterval(() => {
      updateTime()
    }, 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  })

  const days = range(0, 6).map((day) => {
    // Shift to make Monday come first.
    const shifted = (day + 1) % 7
    const dayName = DAYS[day].toLowerCase()
    return (
      <Day
        day={shifted}
        times={room[dayName] ?? []}
        key={shifted}
        timeMarker={shifted === dayOfTheWeek ? currentTime : false}
      />
    )
  })

  const times = HOUR_MARKER_RANGE.map((hour) => {
    return (
      <p key={hour} style={{ top: timeToPercent(timeToSeconds(hour, 0)) }}>
        {hour}:00
      </p>
    )
  })

  return (
    <div className="room" style={{ display: props.hidden ? "none" : "" }}>
      <div className="room-header">
        <button onClick={props.onBack}>
          ←<span className="back-word"> Back</span>
        </button>
        <h1 className="room-name">{props.room}</h1>
      </div>
      <div className="schedule-labels">
        <p>Time</p>
        <DayLabels scroll={scrollLeft} />
      </div>
      <div className="schedule-and-sidebar">
        <div className="schedule-times">
          <div>{times}</div>
        </div>
        <div
          className="schedule"
          onScroll={(event) =>
            setScrollLeft((event.target as HTMLDivElement).scrollLeft)
          }
        >
          {days}
        </div>
      </div>
    </div>
  )
}
