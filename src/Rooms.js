import React from "react";
import {useState, useEffect} from "react";
import {CURRENT_SEMESTER, CURRENT_YEAR} from './constants'

export default function Rooms(props) {
  const [rooms, setRooms] = useState([])
  const [search, setSearch] = useState("")

  useEffect(()=>{
    fetch("/api/rooms")
    .then(res=>res.json())
    .then(res=>setRooms(res))
  }, [])

  function roomMatchesSearch(location, room, search) {
    return search.toLowerCase().split(" ").every((component)=>{
      return location.toLowerCase().includes(component) || room.toLowerCase().startsWith(component) || room.slice(1).startsWith(component)
    })
  }

  let roomGroups = {}
  rooms.forEach((room)=>{
    let match = room.match("(.+) (.+)")
    if (!roomMatchesSearch(match[1], match[2], search)) return
    if (roomGroups[match[1]] === undefined) roomGroups[match[1]] = []
    roomGroups[match[1]].push(match[2])
    
  })

  let roomSections = Object.entries(roomGroups).map(([location, rooms])=>{
    return <div className="location-section" key={location}>
      <h1 className="location-title">{location}</h1>
      <div className="location-rooms">
        {
          rooms.map((room)=>{
            return <button onClick={()=>{props.onRoom(location + " " + room)}} key={room}>{room}</button>
          })
        }
      </div>
    </div>
  })

  if (roomSections.length === 0) {
    roomSections.push(<div key="search-no-res" className="search-no-results">
      <p>No results found :(</p>
    </div>)
  }

  return <div style={{display: props.hidden ? "none" : ""}} className="rooms-container">
    <div className="rooms-header">
      <h1 onClick={()=>{setSearch("")}}>{CURRENT_SEMESTER} <span style={{fontWeight: "normal"}}>'{CURRENT_YEAR}</span></h1>
      <div className="search-container">
        <svg viewBox="0 0 24 24">
            <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
        </svg>
        <input 
          type="text" 
          value={search}
          onChange={(event)=>{
            setSearch(event.target.value)
          }}
          placeholder="Search for a room..."
        />

      </div>
    </div>
    
    <div className="rooms-list" >
      {roomSections}
    </div>
  </div>
}