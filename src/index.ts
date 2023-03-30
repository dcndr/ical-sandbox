import $, { type } from 'jquery'
import ical, { CalendarComponent } from 'ical'
import './index.css'

const fileInput: JQuery<HTMLInputElement> = $('#fileInput')
const todayButton: JQuery<HTMLButtonElement> = $('#todayButton')
const weekButton: JQuery<HTMLButtonElement> = $('#weekButton')
const eventsList: JQuery<HTMLDivElement> = $('#events')
const fileInputFakeButton: JQuery<HTMLButtonElement> = $('#fileInputFakeButton')
const todayHeader: JQuery<HTMLTableCellElement> = $('#todayHeader')
const weekHeader: JQuery<HTMLTableCellElement> = $('#weekHeader')
let events: CalendarComponent[]
let filename: string | number | string[]
enum Mode { None, Today, Week }
let mode = Mode.None;

type ClassRow = {
    class: string
    teacher: string
    room: string
    period: string
    start: string
    end: string
}

const eventToClass = (event: ical.CalendarComponent): ClassRow => {
    const summaryRegex = /.+: ((Yr \d+)|(Rec)) ([^(\n]+)./

    const descriptionRegex = /Teacher:  (.+)\nPeriod: Period (.+)/
    const descriptionMatches = Array.from(
        event.description!.match(descriptionRegex)!
    )

    const locationRegex = /Room: (.+)/
    const locationMatches = Array.from(
        event.location!.match(locationRegex)!
    )

    return {
        class: Array.from(
            event.summary!.match(summaryRegex)!
        )[4],
        teacher: descriptionMatches[1].replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase()),
        room: locationMatches[1].startsWith('Gymnasium') ? 'Gym' : locationMatches[1],
        period: descriptionMatches[2],
        start: new Date(event.start!).toLocaleTimeString(),
        end: new Date(event.end!).toLocaleTimeString(),
    }
}
const getFileName = (path: string | number | string[]): string => {
    const fileRegex = /\\([^\\]+)$/
    return (path as string).match(fileRegex)![1]
}
fileInput.on('change', () => {
    fileInput.prop('files')[0].text().then((data: string) => {
        events = dataToEvents(data)
    })
    filename = getFileName(fileInput.val()!)
    todayButton.prop('disabled', false)
    weekButton.prop('disabled', false)
    fileInputFakeButton.html(`Selected file: <code class="bg-violet-300 rounded-md p-1 group-hover:bg-violet-600 text-violet-600 group-hover:text-violet-100 transition">${filename}</code>`)
})
fileInputFakeButton.on('click', () => {
    fileInput.trigger('click')
})
todayButton.on('click', () => {
    mode = Mode.Today
    update()
})
weekButton.on('click', () => {
    mode = Mode.Week
    update()
})
const showTable = () => {
    eventsList.empty()
    eventsList.parent().removeClass('opacity-0 duration-0')
    eventsList.parent().addClass('duration-1000')
}
const updateButtons = () => {
    const styles = ['shadow-inner', 'shadow-md']
    switch (mode) {
        case Mode.None:
            todayButton.removeClass(styles[0])
            weekButton.removeClass(styles[0])
            todayButton.addClass(styles[1])
            weekButton.addClass(styles[1])
            break
        case Mode.Today:
            todayButton.addClass(styles[0])
            weekButton.removeClass(styles[0])
            todayButton.removeClass(styles[1])
            weekButton.addClass(styles[1])
            break
        case Mode.Week:
            todayButton.removeClass(styles[0])
            weekButton.addClass(styles[0])
            todayButton.addClass(styles[1])
            weekButton.removeClass(styles[1])
            break
    }
}
const updateHeaders = () => {
    switch (mode) {
        case Mode.None:
            todayHeader.hide()
            weekHeader.hide()
            break
        case Mode.Today:
            todayHeader.show()
            weekHeader.hide()
            break
        case Mode.Week:
            todayHeader.hide()
            weekHeader.show()
            break
    }
}
const dataToEvents = (data: string) => {
    const calendar = ical.parseICS(data)
    const events = Object.entries(calendar)
        .filter(entry => calendar[entry[0]].type.toString() === 'VEVENT')
        .map(entry => entry[1])
    return events
}

const getWeekNumber = (date: Date) => {
    date = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
}

const update = () => {
    updateButtons()
    updateHeaders()
    showTable()

    if (localStorage.getItem('events') !== JSON.stringify(events)) {
        localStorage.setItem('events', JSON.stringify(events))
    }
    if (localStorage.getItem('filename') !== filename) {
        localStorage.setItem('filename', filename as string)
    }
    updateTable(events)
}
const eventsToWeek = (events: ical.CalendarComponent[]) =>
    [...Array(8).keys()]
        .map(period => `
            <tr class='h-16 border-y border-y-violet-200 hover:bg-violet-100 transition duration-700'>
                ${events
                .filter(event => eventToClass(event).period === (period + 1).toString())
                .map(event => `<td>${eventToClass(event).class}</td>`)}
            </tr>
        `).join('')

if (localStorage.getItem('events')) {
    events = JSON.parse(localStorage.getItem('events')!)
    filename = localStorage.getItem('filename')!
    todayButton.prop('disabled', false)
    weekButton.prop('disabled', false)
    fileInputFakeButton.html(`Selected file: <code class="bg-violet-300 rounded-md p-1 group-hover:bg-violet-600 text-violet-600 group-hover:text-violet-100 transition">${filename}</code>`)
    mode = Mode.Today
    update()
}

function updateTable(events: ical.CalendarComponent[]) {
    if (mode == Mode.Today) {
        events.forEach((event) => {
            if (event.type.toString() === 'VEVENT' && new Date(event.start!).getDate() === new Date().getDate()) {
                const classRow = eventToClass(event)
                eventsList.append($(
                    `
                        <tr class='h-16 border-y border-y-violet-200 hover:bg-violet-100 transition duration-700'>
                            <td>${classRow.class}</td>
                            <td class='hidden md:table-cell'>
                                ${classRow.teacher}
                            </td>
                            <td>${classRow.room.toString()}</td>
                            <td>${classRow.period}</td>
                            <td class='hidden sm:block'>${classRow.start}</td>
                            <td class='hidden sm:block'>${classRow.end}</td>
                        </tr>
                    `
                ))
            }
        })
    }
    else {
        const week = eventsToWeek(events.filter(event => getWeekNumber(new Date(event.start!)) === getWeekNumber(new Date())))
        eventsList.append($(
            week
        ))
    }
}
