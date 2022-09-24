import React from "react";
import {useState, useRef, useEffect, forwardRef} from "react";

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

const START_OF_DAY = 24000; // 06:40
const END_OF_DAY = 80400; // 22:20
const EFFECTIVE_DAY_LENGTH = END_OF_DAY - START_OF_DAY;

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
		window.open(`https://searchneu.com/NEU/202310/search/${props.subject + props.classId}`)
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
	return (<div className="cont">
			{range(7, 22).map((hour)=>{
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
		</div>)
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
function Day(props) {
	return <div className="day">
		<DayContent times={props.times}/>
	</div>
}

// 		<p className="day-name">{DAYS[props.day-1]}</p>



const DayLabels = forwardRef((props, ref)=> {
	let dayLabels = range(1,7).map((day)=>{
		return <p key={day} className="day-name" style={{display: props.scroll}}>{DAYS[day-1]}</p>
	})
	let elem = <div ref={ref} className="day-labels">
		{dayLabels}
	 </div>
	return elem;
})

export default function Room(props) {
	const scrollSourceRef = useRef(null)
	const scrollRef = useRef(null)
  const [room, setRoom] = useState({"0":[], "1":[], "2":[], "3":[], "4":[], 5:[], 6:[]})

  useEffect(()=>{
		setRoom({"0":[], "1":[], "2":[], "3":[], "4":[], 5:[], 6:[]})
		if (props.room !== null) {
			fetch(`/api/room/${encodeURIComponent(props.room)}`)
				.then(res=>res.json())
				.then(res=>setRoom(res))
		}
  }, [props.room])

	// let name = props.room.name
	// let daysAndTimes = sortedDaysAndTimes(schedule)
	let days = range(0,6).map((day)=>{
		return <Day day={day} times={room[day]} key={day} />
	})
	
	let times = range(7,22).map((hour)=>{
		return <p key={hour} style={{top: timeToPercent(timeToSeconds(hour, 0))}}>{hour}:00</p>
	})
	
	function handleScroll() {
		// console.log(scrollSourceRef)
		scrollRef.current.scrollLeft = scrollSourceRef.current.scrollLeft
	}
	
	return <div className="room" style={{display: props.hidden ? "none" : ""}}>
		<div className="room-header">
			<button onClick={props.onBack}>← Back</button>
			<h1 className="room-name">{props.room}</h1>
		</div>
		<div className="schedule-labels">
			<p>Time</p>
			<DayLabels ref={scrollRef}/>
		</div>
		<div className="schedule-and-sidebar">
			<div className="schedule-times">
				<div>
					{times}
				</div>
			</div>
			<div className="schedule" ref={scrollSourceRef} onScroll={handleScroll}>
				{days}
			</div>
		</div>
		
	</div>
}