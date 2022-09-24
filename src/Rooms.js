import React from "react";
import {useState, useRef, useEffect, forwardRef} from "react";

export default function Rooms(props) {
  const [rooms, setRooms] = useState([])

  useEffect(()=>{
    fetch("/api/rooms")
    .then(res=>res.json())
    .then(res=>setRooms(res))
  }, [])

  let roomsList = rooms.map((room)=>{
    return <button onClick={()=>{props.onRoom(room)}} key={room}>{room}</button>
  })

  return <div className="rooms-list" style={{display: props.hidden ? "none" : ""}}>
    {roomsList}
  </div>
}