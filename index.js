// JavaScript code
const fileInput = document.getElementById('fileInput');
const todayButton = document.getElementById('todayButton');
const weekButton = document.getElementById('weekButton');
const eventList = document.getElementById('eventList');

let events = [];

function parseICS(fileContent) {
    const lines = fileContent.trim().split('\n');
    const events = [];

    let event = null;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('BEGIN:VEVENT')) {
            event = {};
        } else if (line.startsWith('END:VEVENT')) {
            events.push(event);
            event = null;
        } else if (event) {
            const parts = line.split(':');
            const name = parts[0].trim();
            let value = parts.slice(1).join(':').trim();
            if (name.endsWith(';VALUE=DATE-TIME')) {
                // handle date-time property with VALUE parameter
                const [date, time] = value.split('T');
                const year = date.slice(0, 4);
                const month = date.slice(4, 6) - 1;
                const day = date.slice(6, 8);
                const hours = time.slice(0, 2);
                const minutes = time.slice(2, 4);
                const seconds = time.slice(4, 6);
                const dateObj = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
                // convert from UTC to AEST
                dateObj.setMinutes(dateObj.getMinutes() + 600);
                value = dateObj;
            }
            switch (name) {
                case 'DTSTART;VALUE=DATE-TIME':
                case 'DTSTART':
                    event.start = value;
                    break;
                case 'DTEND;VALUE=DATE-TIME':
                case 'DTEND':
                    event.end = value;
                    break;
                case 'SUMMARY':
                    event.summary = value;
                    break;
                case 'DESCRIPTION':
                    event.description = value;
                    break;
                case 'LOCATION':
                    event.location = value;
                    break;
                // add more properties as needed
            }
        }
    }

    return events;
}


function displayEvents(eventArray) {
    // display events in the eventList element
    eventList.innerHTML = '';
    if (eventArray.length === 0) {
        eventList.innerHTML = 'No events found.';
        return;
    }
    const ul = document.createElement('ul');
    eventArray.forEach(event => {
        const li = document.createElement('li');
        const time = new Date(event.start);
        const dateString = time.toLocaleDateString();
        const timeString = time.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        li.innerHTML = `${event.summary + '<br>'+ event.location} - ${timeString}`;
        ul.appendChild(li);
    });
    eventList.appendChild(ul);
}

fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.addEventListener('load', event => {
        const content = event.target.result;
        events = parseICS(content);
        displayEvents(events);
    });
    reader.readAsText(file);
});

todayButton.addEventListener('click', () => {
    const now = new Date();
    const todayEvents = events.filter(event => {
        const eventTime = new Date(event.start);
        return eventTime.getDate() === now.getDate() && eventTime.getMonth() === now.getMonth() && eventTime.getFullYear() === now.getFullYear();
    });
    displayEvents(todayEvents);
});

weekButton.addEventListener('click', () => {
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (1 - now.getDay()));
    const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - now.getDay()));
    const weekEvents = events.filter(event => {
        const eventTime = new Date(event.start);
        return eventTime >= weekStart && eventTime <= weekEnd && eventTime.getDay() !== 0 && eventTime.getDay() !== 6;
    });
    displayEvents(weekEvents);
});
