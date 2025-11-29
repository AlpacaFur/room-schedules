export function FreeRooms() {
  return (
    <>
      <header>
        <p>&lt;SEARCH BAR GOES HERE&gt;</p>
        <h1>Find Free Rooms</h1>
      </header>
      <main>
        <div className="filter-bar">
          <select disabled={true}>
            <option>Now</option>
          </select>
          <select disabled={true}>
            <option selected>Any Duration</option>
            <option>30m</option>
            <option>1h</option>
            <option>1h30m</option>
            <option>2h</option>
            <option>2h30m</option>
            <option>3h</option>
            <option>3h30m</option>
            <option>4h</option>
          </select>
          <select disabled={true}>
            <option>Monday</option>
            <option>Tuesday</option>
            <option selected>Today (Wed)</option>
            <option>Thursday</option>
            <option>Friday</option>
            <option>Saturday</option>
            <option>Sunday</option>
          </select>
          <div>
            <label>
              <input type="checkbox" disabled={true} />
              Prioritize Recently Free
            </label>
          </div>
        </div>
        <p>content</p>
      </main>
    </>
  )
}
