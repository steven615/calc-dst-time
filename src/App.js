import { useState } from 'react';

import './App.css';

function App() {
  const [startDate, setStartDate] = useState('2020-01-01');
  const [endDate, setEndDate] = useState('2021-01-01');
  const [dstDates, setDstDates] = useState([]);
  const dates = [];
  const HumanMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const handleChange = (e) => {
    const target = e.target;
    
    if(target.name === 'start_date') {
      setStartDate(target.value);
      return;
    }

    setEndDate(target.value);
  }

  // Get DST dates in a specific period
  const getDSTDates = () => {
    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    
    if(!isValidDate(sDate) || !isValidDate(eDate)) {
      alert('Please input correctly!');
      setDstDates([]);
      return;
    }

    if(sDate.getTime() > eDate.getTime()) {
      alert('The start date must be less than end date.');
      setDstDates([]);
      return;
    }

    let sYear = sDate.getFullYear();
    let eYear = eDate.getFullYear();

    if(sDate.getMonth() > 10 && sDate.getDate() > 30) {
      sYear += 1;
    }

    if(eDate.getMonth() < 1 && eDate.getDate() < 2) {
      eYear -= 1;
    }

    for (let year = sYear; year <= eYear; year++) {
      let month = getDSTMonths(year);
      if(!month) {
        alert('Your location is not supported DST!');
        setDstDates([]);
        return;
      }

      let dstStartDate = getDSTDateByMonth(year, month.start);
      let dstEndDate = getDSTDateByMonth(year, month.end, false);
      let dstTempStart = dstStartDate + getDSTTime(dstStartDate);
      let dstTempEnd = dstEndDate + getDSTTime(dstEndDate, false);

      if(month.start > month.end) {
        dstTempStart = dstEndDate;
        dstTempEnd = dstStartDate;
      }

      if(checkDate(dstTempStart, sDate, eDate)) {
        dates.push(dstTempStart);
      }

      if(checkDate(dstTempEnd, sDate, eDate)) {
        dates.push(dstTempEnd);
      }
    }
    
    if(dates.length < 1) {
      alert('Not found results in this period.');
      return;
    }
    setDstDates(dates);
  }

  /**
   * Get months that DST start/end in year
   * 
   * @param {Nuber} year 
   * @returns object {start, end}
   */
  const getDSTMonths = (year) => {
    let offsets = [];

    for(let i = 0; i < 12; i++) {
      let offset = new Date(year, i, 1).getTimezoneOffset();
      offsets.push(offset);
    }

    let uniqueOffsets = [...new Set(offsets)];

    if(uniqueOffsets.length < 2) {
      return false;
    }

    let dstOffset = Math.min.apply(null, offsets);
    let tempStart = offsets.indexOf(dstOffset);
    let tempEnd = offsets.lastIndexOf(dstOffset);

    let start = tempStart > 0 && offsets[tempStart - 1] > dstOffset ? tempStart : tempEnd;
    let end = tempEnd < 11 && offsets[tempEnd + 1] > dstOffset ? tempEnd : tempStart;
    start -= 1;
    start = start < 0 ? start = 11 : start;
    
    return {start, end};
  }

  /**
   * 
   * @param {Number} year 
   * @param {Number} month 
   * @param {Boolean} isStart 
   * @returns 
   */
  const getDSTDateByMonth = (year, month, isStart = true) => {
    let sDate = new Date(year, month, 1);
    let eDate = new Date(year, month + 1, 0);
    let sOffset = sDate.getTimezoneOffset();
    let eOffset = eDate.getTimezoneOffset();
    let dstOffset = Math.min(sOffset, eOffset);
    let dstDate = '';

    if(sOffset === eOffset) {
      let date = checkBorderOfMonth(sDate, eDate);
      dstDate = date.getDate();
      dstDate = dstDate < 10 ? `0${dstDate}` : dstDate;
      return `${dstDate}-${HumanMonths[month]}-${year}`;
    }

    let sundays = getDaysOfMonth(year, month, 'sunday');

    for (let i = 0; i < sundays.length; i++) {
      let date = sundays[i];
      let offset = new Date(year, month, date + 1).getTimezoneOffset();
      
      if(isStart && offset === dstOffset) {
        dstDate = sundays[i];
        break;
      }

      if(!isStart && offset > dstOffset) {
        dstDate = sundays[i];
        break;
      }
    }
    dstDate = dstDate < 10 ? `0${dstDate}` : dstDate;
    return `${dstDate}-${HumanMonths[month]}-${year}`;
  }

  const getDaysOfMonth = (year, month, dayName) => {
    const result = [];
    const days = {sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6};
    const day = days[dayName.toLowerCase().substr(0,3)];

    let current = new Date(year, month, 1);
    let end = new Date(year, month + 1, 0)
    // Shift to next of required days
    current.setDate(current.getDate() + (day - current.getDay() + 7) % 7);
    
    // While less than end date, add dates to result array
    while (current < end) {
      result.push(new Date(current).getDate());
      current.setDate(current.getDate() + 7);
    }

    return result;
  }

  const getDSTTime = (dstDateStr, isStart = true) => {
    let d = new Date(dstDateStr);
    let year = d.getFullYear();
    let month = d.getMonth();
    let date = d.getDate();
    let dstOffset = new Date(year, month, isStart ? date + 1 : date - 1).getTimezoneOffset();
    let time = 1;

    for (let i = 0; i < 25; i++) {
      let tempDate = new Date(year, month, date, i);
      if(isStart && tempDate.getTimezoneOffset() === dstOffset) {
        time = i;
        break;
      }

      if(!isStart && tempDate.getTimezoneOffset() > dstOffset) {
        time = i;
        break;
      }
    }
    return ` ${time < 10 ? `0${time}`: time}:00`;
  }

  /**
   * If the DST start/end is start/end of the month
   */
  const checkBorderOfMonth = (sDate, eDate) => {
    let start = sDate.getTime();
    let offset = sDate.getTimezoneOffset();
    let beforeDate = new Date(start - 86400000);
    
    if(beforeDate.getTimezoneOffset() === offset) {
      return eDate;
    }

    return sDate;
  }

  /**
   * Check that date is valid between the start date and end date.
   * 
   * @param {string} date - date string
   * @param {object} sDate - javascript date object
   * @param {object} eDate - javascript date object
   */
  const checkDate = (date, sDate, eDate) => {
    let curTimestamp = new Date(date).getTime();
    let sTimestamp = sDate.getTime();
    let eTimestamp = eDate.getTime();
    if(curTimestamp >= sTimestamp && curTimestamp <= eTimestamp) {
      return true;
    }
    return false;
  }
  
  // Check the inputed value
  const isValidDate = (date) => {
    if(date.toString().toLowerCase() === 'invalid date') {
      return false;
    }
  
    return true;
  }

  return (
    <div className="App">
      <div>
        <div className="input">
          <label>Start Date:</label>
          <input name="start_date" onChange={handleChange.bind('start')} value={startDate}/>
        </div>
        <div className="input">
          <label>End Date:</label>
          <input name="end_date" onChange={handleChange.bind('end')} value={endDate} />
        </div>
      </div>
      <div className="control">
        <div><button onClick={getDSTDates}>Get DST dates</button></div>
        <div>Results</div>
        <ul>
          {
            dstDates.map((item, index) =>
              <li key={index}>
                <div>{item}</div>
              </li>
            )
          }
        </ul>
      </div>
    </div>
  );
}

export default App;
