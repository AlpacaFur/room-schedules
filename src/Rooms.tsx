import { useMemo } from "react"
import { useState } from "react"
import { CURRENT_SEMESTER, CURRENT_YEAR } from "./constants"

function roomMatchesSearch(
  location: string,
  room: string,
  search: string
): boolean {
  return search
    .toLowerCase()
    .split(" ")
    .every((component) => {
      return (
        location.toLowerCase().includes(component) ||
        room.toLowerCase().startsWith(component) ||
        room.slice(1).startsWith(component)
      )
    })
}

interface RoomsProps {
  rooms: string[]
  hidden: boolean
  onRoom: (room: string | null) => void
}

export function Rooms({ rooms, hidden, onRoom }: RoomsProps) {
  const [search, setSearch] = useState("")

  const buildingGroups = useMemo(() => {
    const buildings = new Map<string, string[]>()
    rooms.forEach((fullLocation: string) => {
      const match = fullLocation.match("(.+) (.+)")
      if (!match) return
      const [, building, room] = match
      if (!roomMatchesSearch(building, room, search)) return
      if (!buildings.has(building)) buildings.set(building, [])
      buildings.get(building)!.push(match[2])
    })

    return buildings
  }, [rooms, search])

  console.log(buildingGroups)

  const roomSections = Array.from(buildingGroups.entries()).map(
    ([location, rooms]) => {
      return (
        <div className="location-section" key={location}>
          <h1 className="location-title">{location}</h1>
          <div className="location-rooms">
            {rooms.map((room) => {
              return (
                <a
                  href={`/room/${location} ${room}`}
                  className="room-link"
                  onClick={(e) => {
                    if (!e.metaKey && !e.ctrlKey) {
                      onRoom(location + " " + room)
                      e.preventDefault()
                    }
                  }}
                  key={room}
                >
                  {room}
                </a>
              )
            })}
          </div>
        </div>
      )
    }
  )

  console.log(roomSections)

  if (roomSections.length === 0) {
    roomSections.push(
      <div key="search-no-res" className="search-no-results">
        <p>No results found :(</p>
      </div>
    )
  }

  return (
    <div style={{ display: hidden ? "none" : "" }} className="rooms-container">
      <div className="rooms-header">
        <h1
          onClick={() => {
            setSearch("")
          }}
        >
          {CURRENT_SEMESTER}{" "}
          <span style={{ fontWeight: "normal" }}>'{CURRENT_YEAR}</span>
        </h1>
        <div className="search-container">
          <svg viewBox="0 0 24 24">
            <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
          </svg>
          <input
            type="text"
            value={search}
            autoFocus={true}
            onChange={(event) => {
              setSearch(event.target.value)
            }}
            placeholder="Search for a room..."
          />
        </div>
      </div>

      <div className="rooms-list">{roomSections}</div>
    </div>
  )
}
