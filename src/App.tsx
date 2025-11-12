import React, { useCallback, useEffect } from "react"
import { useState } from "react"
import { Rooms } from "./Rooms"
import { Room } from "./Room"

export function App() {
  const [rooms, setRooms] = useState<string[]>([])
  const [currentRoom, setCurrentRoom] = useState<string | null>(null)

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
        setCurrentRoom(segments[1])
      } else {
        history.replaceState(null, "", "/")
      }
    } else if (segments.length === 1 && segments[0] === "") {
      setCurrentRoom(null)
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
      setCurrentRoom(null)
    } else {
      history.pushState(null, "", `/room/${room}`)
      setCurrentRoom(room)
    }
  }

  return (
    <React.StrictMode>
      <Rooms
        hidden={currentRoom !== null}
        onRoom={(room) => {
          navigate(room)
        }}
        rooms={rooms}
      />
      <Room
        hidden={currentRoom === null}
        room={currentRoom}
        onBack={() => {
          navigate(null)
        }}
      />
    </React.StrictMode>
  )
}
