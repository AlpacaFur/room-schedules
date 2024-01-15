import React from "react";
import {useState, useRef, useEffect} from "react";
import { CURRENT_SEMESTER_CODE } from "./constants"

const START_OF_DAY = 24000; // 06:40
const END_OF_DAY = 80400; // 22:20
const EFFECTIVE_DAY_LENGTH = END_OF_DAY - START_OF_DAY;
const HOUR_MARKER_RANGE = range(7,22)

function range(start, end) {
  return {
    map: (callback)=>{
      let result = []
      for (let i = start; i<=end; i+=1) {
        result.push(callback(i))
      }
      return result
    }
  }
}

const SECONDS_IN_DAY = 86400;

function secondsToTime(seconds) {
	const hours = Math.floor(seconds / 3600).toString().padStart(2, "0")
	const minutes = ((seconds - hours * 3600)/60).toString().padStart(2, "0")
	return `${hours}:${minutes}`
}

function timeToSeconds(hours, minutes) {
	return 3600*hours + 60*minutes
}

function timeToPercent(timeInSeconds) {
	return ((timeInSeconds - START_OF_DAY)/EFFECTIVE_DAY_LENGTH) * 100 + "%"
}

function timeToHeight(timeInSeconds) {
	return (timeInSeconds/EFFECTIVE_DAY_LENGTH) * 100 + "%"
}


function Class(props) {
	return <div style={{height: props.height, top:props.pos}} className="class" onClick={()=>{
		window.open(`https://searchneu.com/NEU/${CURRENT_SEMESTER_CODE}/classPage/${props.subject}/${props.classId}`)
	}}>
		<p className="class-time">{
				secondsToTime(props.start) + "-" + secondsToTime(props.end)
			}</p>
		<p className="className">
			{props.name}
		</p>
		<p className="classId">
			{props.subject + props.classId}
		</p>
	</div>
}

function DayContent(props) {
	let timeMarker = null
	if (props.timeMarker !== false) {
		timeMarker = <div className="time-marker"
		style={{top: timeToPercent(props.timeMarker*60)}}></div>
	}
	return (<div className="cont">
			{HOUR_MARKER_RANGE.map((hour)=>{
				let position = timeToPercent(timeToSeconds(hour, 0))
				return <div key={"line"+hour} className="hour-line" style={{top: position}}></div>
			})}
			{props.times.map((time, index)=>{
				let height = timeToHeight(time.end - time.start)
				let topPos = timeToPercent(time.start)
				return <Class 
								 height={height} 
								 pos={topPos} 
								 name={time.name}
								 subject={time.subject}
								 classId={time.classId}
								 start={time.start}
								 end={time.end}
								 key={time.subject + time.classId + "-" + index}
								 />
			})}
			{timeMarker}
		</div>)
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
function Day(props) {
	return <div className="day">
		<DayContent times={props.times} timeMarker={props.timeMarker}/>
	</div>
}

function DayLabels(props) {
	const contRef = useRef(null)
	let dayLabels = range(0,6).map((day)=>{
		// Shift to make Monday come first.
		let shifted = (day + 1) % 7
		return <p key={shifted} className="day-name" style={{display: props.scroll}}>{DAYS[shifted]}</p>
	})

	useEffect(()=>{
		contRef.current.scrollLeft = props.scroll
	}, [props.scroll])

	let elem = <div ref={contRef} className="day-labels">
		{dayLabels}
	 </div>
	return elem;
}

export default function Room(props) {
	const [scrollLeft, setScrollLeft] = useState(0)
	const [currentTime, setCurrentTime] = useState(0)
	const [dayOfTheWeek, setDayOfTheWeek] = useState(0)
  const [room, setRoom] = useState({"0":[], "1":[], "2":[], "3":[], "4":[], 5:[], 6:[]})

  useEffect(()=>{
		setRoom({"0":[], "1":[], "2":[], "3":[], "4":[], 5:[], 6:[]})
		if (props.room !== null) {
			fetch(`/api/room/${encodeURIComponent(props.room)}`)
				.then(res=>res.json())
				.then(res=>setRoom(res))
		}
  }, [props.room])

	function updateTime() {
		let now = new Date()
		setCurrentTime(now.getHours()*60 + now.getMinutes())
		setDayOfTheWeek(now.getDay())
	}

	useEffect(()=>{
		updateTime()
		let interval = setInterval(()=>{
			updateTime()
		}, 60*1000)
		return ()=>{
			clearInterval(interval)
		}
	})

	let days = range(0,6).map((day)=>{
		// Shift to make Monday come first.
		let shifted = (day + 1) % 7
		return (
			<Day 
				day={shifted} 
				times={room[shifted]} 
				key={shifted}
				timeMarker={shifted === dayOfTheWeek ? currentTime : false}
			/>
		)
	})
	
	let times = HOUR_MARKER_RANGE.map((hour)=>{
		return <p key={hour} style={{top: timeToPercent(timeToSeconds(hour, 0))}}>{hour}:00</p>
	})
	
	return <div className="room" style={{display: props.hidden ? "none" : ""}}>
		<div className="room-header">
			<button onClick={props.onBack}>←<span className="back-word"> Back</span></button>
			<h1 className="room-name">{props.room}</h1>
		</div>
		<div className="schedule-labels">
			<p>Time</p>
			<DayLabels scroll={scrollLeft}/>
		</div>
		<div className="schedule-and-sidebar">
			<div className="schedule-times">
				<div>
					{times}
				</div>
			</div>
			<div className="schedule" onScroll={(event)=>setScrollLeft(event.target.scrollLeft)}>
				{days}
			</div>
		</div>
		
	</div>
}