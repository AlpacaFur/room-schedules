import React from "react";
import {useState} from "react";
import Room from "./Room"
import Rooms from "./Rooms"

export default function Main() {	
	let [currentRoom, setCurrentRoom] = useState(null)

	// let content = <Rooms onRoom={(room)=>{
	// 	setCurrentRoom(room)
	// }}/>
	// if (currentRoom !== null) {
	// 	content = <Room room={currentRoom} onBack={()=>{
	// 		setCurrentRoom(null)
	// 	}}/>
	// }
	

	return <React.StrictMode>
		<Rooms 
			hidden={currentRoom !== null} 
			onRoom={(room)=>{
				setCurrentRoom(room)
			}} 
		/>
		<Room 
			hidden={currentRoom === null} 
			room={currentRoom} 
			onBack={()=>{
				setCurrentRoom(null)
			}}
		/>
	</React.StrictMode>
}