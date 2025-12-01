import React, { useCallback, useEffect } from "react"
import { useState } from "react"
import { Rooms } from "./Rooms"
import { Room } from "./Room"
import { FreeRooms } from "./pages/free-rooms/FreeRooms"

interface Room {
  location: "room"
  room: string
}

export type Location =
  | {
      location: "home"
    }
  | Room
  | {
      location: "free"
      type: "building" | "room"
      name: string
    }

const HOME: Location = { location: "home" }

export function App() {
  const [rooms, setRooms] = useState<string[]>([])
  const [location, setLocation] = useState<Location>(HOME)

  useEffect(() => {
    fetch("/api/rooms")
      .then((res) => res.json())
      .then((res) => setRooms(res))
  }, [])

  const handleCurrentURL = useCallback(() => {
    if (rooms.length === 0) return
    const segments = decodeURIComponent(window.location.pathname)
      .slice(1)
      .split("/")
    if (segments[0] === "room") {
      if (rooms.includes(segments[1])) {
        setLocation({ location: "room", room: segments[1] })
      } else {
        history.replaceState(null, "", "/")
      }
    } else if (segments[0] === "free") {
      setLocation({ location: "free", type: "building", name: segments[1] })
    } else if (segments.length === 1 && segments[0] === "") {
      setLocation(HOME)
    }
  }, [rooms])

  useEffect(handleCurrentURL, [handleCurrentURL])

  useEffect(() => {
    const listener = () => {
      setTimeout(() => {
        handleCurrentURL()
      }, 0)
    }
    window.addEventListener("popstate", listener)
    window.addEventListener("hashchange", listener)
    return () => {
      window.removeEventListener("popstate", listener)
      window.removeEventListener("hashchange", listener)
    }
  })

  const navigate = (room: string | null) => {
    if (room === null) {
      if (history.length == 1) {
        history.replaceState(null, "", "/")
      } else {
        history.back()
      }
      setLocation(HOME)
    } else {
      history.pushState(null, "", `/room/${room}`)
      setLocation({ location: "room", room })
    }
  }

  return (
    <React.StrictMode>
      <FreeRooms hidden={location.location !== "free"} location={location} />
      <Rooms
        hidden={location.location !== "home"}
        onRoom={(room) => {
          navigate(room)
        }}
        onFreeBuilding={(building) => {
          history.pushState(null, "", `/free/${building}`)
          setLocation({ location: "free", type: "building", name: building })
        }}
        rooms={rooms}
      />
      <Room
        hidden={location.location !== "room"}
        room={(location as Room)?.room}
        onBack={() => {
          navigate(null)
        }}
      />
    </React.StrictMode>
  )
}
