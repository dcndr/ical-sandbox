import $ from 'jquery'
import ical, { CalendarComponent } from 'ical'
import './index.css'

const fileInput: JQuery<HTMLInputElement> = $('#fileInput'),
    todayButton: JQuery<HTMLButtonElement> = $('#todayButton'),
    clockButton: JQuery<HTMLButtonElement> = $('#clockButton'),
    weekButton: JQuery<HTMLButtonElement> = $('#weekButton'),
    eventsList: JQuery<HTMLDivElement> = $('#events'),
    fileInputFakeButton: JQuery<HTMLButtonElement> = $('#fileInputFakeButton'),
    todayHeader: JQuery<HTMLTableCellElement> = $('#todayHeader'),
    weekHeader: JQuery<HTMLTableCellElement> = $('#weekHeader'),
    caption: JQuery<HTMLTableCaptionElement> = $('#caption'),
    updateButton: JQuery<HTMLButtonElement> = $('#updateButton'),
    autoUpdateCheckbox: JQuery<HTMLInputElement> = $('#autoupdate'),
    canvas: JQuery<HTMLCanvasElement> = $("#canvas"),
    timeOffsetInput: JQuery<HTMLInputElement> = $('#timeOffset'),
    timeOffsetUnitDisplay: JQuery<HTMLSpanElement> = $('#timeOffsetUnitDisplay'),
    synchroniseButton: JQuery<HTMLButtonElement> = $('#synchroniseButton')
let autoUpdateInterval: NodeJS.Timer | undefined
export let events: CalendarComponent[]
let filename: string | number | string[] = ""
enum Mode { None, Today, Week, Clock }
let mode = Mode.None;[]
const periods = [...Array(8).keys()].map(period => period + 1)
export const timeFormat: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: 'numeric', hour12: true }
let timeOffset: number = 0
let noEventsToday = false;
let noEventsThisWeek = false;
let calendar: ical.FullCalendar | undefined;

export type ClassData = {
    class: string
    teacher: string
    room: string
    period: string
    start: string
    end: string
}
export const correctDate = (date?: Date | undefined) => {
    date ??= new Date()
    date.setSeconds(date.getSeconds() + timeOffset)
    return date
}
export const minutesSinceMidnight = (date: Date | undefined = undefined) => {
    date ??= correctDate()
    return date.getHours() * 60 + date.getMinutes()
}
export const secondsSinceMidnight = (date: Date | undefined = undefined) => {
    date ??= correctDate()
    return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()
}
export const millisecondsSinceMidnight = (date: Date | undefined = undefined) => {
    date ??= correctDate()
    return date.getHours() * 3600000
        + date.getMinutes() * 60000
        + date.getSeconds() * 1000
        + date.getMilliseconds()
}
export const eventToClass = (event: ical.CalendarComponent): ClassData => {
    const summaryRegex = /.+: ((((Yr \d+)|(Rec)) ([^(\n]+))|(\d+'s [a-zA-Z]+))./

    const descriptionRegex = /Teacher: {2}(.+)\nPeriod: Period (.+)/
    const descriptionMatches = Array.from(
        event.description!.match(descriptionRegex)!
    )

    let locationMatches;
    if (event.location!.length != 0) {
        const locationRegex = /Room: (.+)/
        locationMatches = Array.from(
            event.location!.match(locationRegex)!
        )
    }

    locationMatches = locationMatches || ['', '-']

    const summaryMatches = Array.from(
        event.summary!.match(summaryRegex)!
    )
    return {
        class: summaryMatches[7] || summaryMatches[6],
        teacher: descriptionMatches[1].replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase()),
        room: locationMatches[1].startsWith('Gymnasium') ? 'Gym' : locationMatches[1],
        period: descriptionMatches[2],
        start: new Date(event.start!).toLocaleTimeString([], timeFormat).replace(/^0:/, '12:'),
        end: new Date(event.end!).toLocaleTimeString([], timeFormat).replace(/^0:/, '12:'),
    }
}
const getFileName = (path: string | number | string[]): string => {
    const fileRegex = /\\([^\\]+)$/
    return (path as string).match(fileRegex)![1]
}
const showTable = (): void => {
    eventsList.empty()
    eventsList.parent().removeClass('opacity-0 duration-0')
    eventsList.parent().addClass('duration-1000')
}
const updateButtons = (): void => {
    const styles = ['shadow-inner', 'shadow-md']
    switch (mode) {
        case Mode.None:
            todayButton.removeClass(styles[0])
            clockButton.removeClass(styles[0])
            weekButton.removeClass(styles[0])
            todayButton.addClass(styles[1])
            clockButton.addClass(styles[1])
            weekButton.addClass(styles[1])
            break
        case Mode.Today:
            todayButton.addClass(styles[0])
            clockButton.removeClass(styles[0])
            weekButton.removeClass(styles[0])
            todayButton.removeClass(styles[1])
            clockButton.addClass(styles[1])
            weekButton.addClass(styles[1])
            break
        case Mode.Clock:
            todayButton.removeClass(styles[0])
            clockButton.addClass(styles[0])
            weekButton.removeClass(styles[0])
            todayButton.addClass(styles[1])
            clockButton.removeClass(styles[1])
            weekButton.addClass(styles[1])
            break
        case Mode.Week:
            todayButton.removeClass(styles[0])
            clockButton.removeClass(styles[0])
            weekButton.addClass(styles[0])
            todayButton.addClass(styles[1])
            clockButton.addClass(styles[1])
            weekButton.removeClass(styles[1])
            break
    }
}
const updateHeaders = (): void => {
    switch (mode) {
        case Mode.Clock:
            canvas.show()
            todayHeader.hide()
            weekHeader.hide()
            caption.parent().show()
            break
        case Mode.None:
            todayHeader.hide()
            weekHeader.hide()
            caption.parent().hide()
            canvas.hide()
            break
        case Mode.Today:
            todayHeader.show()
            weekHeader.hide()
            caption.parent().show()
            canvas.hide()
            break
        case Mode.Week:
            todayHeader.hide()
            weekHeader.show()
            caption.parent().show()
            canvas.hide()
            break
    }
}
const dataToEvents = (data: string): CalendarComponent[] => {
    if (calendar === undefined)
        calendar = ical.parseICS(data)
    const events = Object.entries(calendar)
        .filter(entry => getWeekNumber(new Date(entry[1].start!)) == getWeekNumber(correctDate()))
        .map(entry => entry[1])
    return events
}
const getWeekNumber = (date: Date): number => {
    date = correctDate(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = correctDate(new Date(Date.UTC(date.getUTCFullYear(), 0, 1)));
    const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
}
const update = (): void => {
    updateButtons()
    updateHeaders()
    showTable()

    if (localStorage.getItem('events') !== JSON.stringify(events)) {
        localStorage.setItem('events', JSON.stringify(events))
    }
    if (localStorage.getItem('filename') !== filename) {
        localStorage.setItem('filename', filename as string)
    }
    if (localStorage.getItem('mode') !== mode.toString()) {
        localStorage.setItem('mode', mode.toString())
    }

    if (events)
        updateTable()
}
const eventsToWeek = (events: ical.CalendarComponent[]): string =>
    periods
        .map(period => {
            const row = events
                .filter(event => eventToClass(event).period === period.toString())
                .map(event => `<td>${eventToClass(event).class}</td>`)
            while (row.length < 5)
                row.push(`<td class="blur select-none">${Math.random().toString(36).slice(2)}</td>`)
            return (
                `
                    <tr class='h-16 border-y border-y-violet-200 hover:bg-violet-100 transition duration-700'>
                    ${row}
                    </tr>
                `
            )
        }).join('')
const updateTable = (): void => {
    switch (mode) {
        case Mode.Today:
            events.forEach((event) => {
                if (new Date(event.start!).toLocaleDateString() === correctDate().toLocaleDateString()) {
                    const classRow = eventToClass(event)
                    eventsList.append($(
                        `
                            <tr class='h-16 border-y border-y-violet-200 hover:bg-violet-50 transition duration-700'>
                                <td>${classRow.class}</td>
                                <td class='hidden md:table-cell'>${classRow.teacher}</td>
                                <td>${classRow.room.toString()}</td>
                                <td>${classRow.period}</td>
                                <td class='hidden sm:table-cell'>
                                <table class="table-fixed inline-table w-1/2">
                                    <tbody>
                                        <tr class="border-b-2 border-violet-200"><td>${classRow.start}</td></tr>
                                        <tr class="border-t-2 border-violet-200"><td>${classRow.end}</td></tr>
                                    </tbody>
                                </table>
                                </td>
                            </tr>
                        `
                    ))
                }
            })
            if (eventsList.children().length === 0) {
                noEventsToday = true;
                periods.forEach(() => {
                    eventsList.append($(
                        `
                            <tr class='h-16 border-y border-y-violet-200 hover:bg-violet-50 transition duration-700'>
                                <td class="blur select-none">${Math.random().toString(36).slice(2)}</td>
                                <td class="blur select-none hidden md:table-cell">${Math.random().toString(36).slice(2)}</td>
                                <td class="blur select-none">${Math.random().toString(36).slice(2)}</td>
                                <td class="blur select-none">${Math.random().toString(36).slice(2)}</td>
                                <td class="blur select-none hidden sm:table-cell">${Math.random().toString(36).slice(2)}</td>
                            </tr>
                        `
                    ))
                })
            }
            caption.html(
                `
                ${noEventsToday
                    ? 'No events to show<br />'
                    : ''
                }
                    Last updated
                    <b>
                        ${correctDate().toLocaleString()}
                        <span class="${timeOffset < 0 ? 'text-red-500' : 'text-green-500'}">
                            ${timeOffset < 0 ? '-' : '+'} ${Math.abs(timeOffset)} ${timeOffsetUnitDisplay.html()}
                        </span>
                    </b>
                `
            )
            break
        case Mode.Clock:
            caption.html(
                `
                ${noEventsToday
                    ? 'No events to show<br />'
                    : ''
                }
                    Last updated
                    <b>
                        ${correctDate().toLocaleString()}
                        <span class="${timeOffset < 0 ? 'text-red-500' : 'text-green-500'}">
                            (${timeOffset < 0 ? '-' : '+'} ${Math.abs(timeOffset)} ${timeOffsetUnitDisplay.html()})
                        </span>
                    </b>
                `
            )
            break
        case Mode.Week:
            eventsList.append($(eventsToWeek(events.filter(event => getWeekNumber(new Date(event.start!)) === getWeekNumber(correctDate())))))
            if (eventsList.children().length === 0)
                noEventsThisWeek = true
            caption.html(
                `
                ${noEventsThisWeek
                    ? 'No events to show<br />'
                    : ''
                }
                    Last updated
                    <b>
                        ${correctDate().toLocaleString()}
                        <span class="${timeOffset < 0 ? 'text-red-500' : 'text-green-500'}">
                            (${timeOffset < 0 ? '-' : '+'} ${Math.abs(timeOffset)} ${timeOffsetUnitDisplay.html()})
                        </span>
                    </b>
                `
            )
            break
    }
}
export const eventsToday = (): CalendarComponent[] =>
    events
        .filter(
            event => new Date(event.start!).toLocaleDateString() === correctDate().toLocaleDateString()
        )
export const bellsToday = () => {
    const bellsToday = eventsToday()
        .flatMap((event: CalendarComponent) => [new Date(event.start!), new Date(event.end!)])
        .map(date => date.getTime())
        .filter((time, index, times) => times.indexOf(time) === index)
        .map(time => new Date(time))
    return bellsToday
}

fileInput.on('change', (): void => {
    fileInput.prop('files')[0].text().then((data: string) => {
        events = dataToEvents(data)
    })
    filename = getFileName(fileInput.val()!)
    todayButton.prop('disabled', false)
    clockButton.prop('disabled', false)
    weekButton.prop('disabled', false)
    fileInputFakeButton.html(
        `
        Selected file:
        <code class="bg-violet-300 rounded-md p-1 group-hover:bg-violet-600 text-violet-600 group-hover:text-violet-100 transition">
        ${filename}
        </code>
        `
    )
})
fileInputFakeButton.on('click', (): void => {
    fileInput.trigger('click')
})
todayButton.on('click', (): void => {
    mode = Mode.Today
    update()
})
clockButton.on('click', (): void => {
    mode = Mode.Clock
    update()
})
weekButton.on('click', (): void => {
    mode = Mode.Week
    update()
})
updateButton.on('click', update)
synchroniseButton.on('click', (): void => {
    const closestBell = bellsToday().sort((a, b) =>
        Math.abs(a.getTime() - correctDate().getTime())
        - Math.abs(b.getTime() - correctDate().getTime())
    )[0]
    timeOffsetInput.val(secondsSinceMidnight(closestBell) - secondsSinceMidnight(new Date()))
    timeOffsetInput.trigger('input')
})
autoUpdateCheckbox.on('change', (): void => {
    if (autoUpdateCheckbox.prop('checked')) {
        update()
        autoUpdateInterval ??= setInterval(update, 1000)
        localStorage.setItem('autoUpdate', 'true')
    }
    else {
        clearInterval(autoUpdateInterval)
        autoUpdateInterval = undefined
        localStorage.setItem('autoUpdate', 'false')
    }
})
timeOffsetInput.on('input', (): void => {
    const value = parseFloat(timeOffsetInput.val() as string)
    timeOffsetUnitDisplay.html([-1, 1].includes(value) ? 'second' : 'seconds')
    if (value > parseFloat(timeOffsetInput.prop('max')))
        timeOffsetInput.val(timeOffsetInput.prop('max'))
    else if (value < parseFloat(timeOffsetInput.prop('min')))
        timeOffsetInput.val(timeOffsetInput.prop('min'))
    localStorage.setItem('timeOffset', timeOffsetInput.val() as string)
    timeOffset = parseFloat(timeOffsetInput.val() as string) || 0
    update()
})
timeOffsetInput.on('change', (): void => {
    timeOffsetInput.val(timeOffset || 0)
})

if (localStorage.getItem('events')) {
    events = JSON.parse(localStorage.getItem('events')!)
    filename = localStorage.getItem('filename')!
    todayButton.prop('disabled', false)
    clockButton.prop('disabled', false)
    weekButton.prop('disabled', false)
    fileInputFakeButton.html(`Selected file: <code class="bg-violet-300 rounded-md p-1 group-hover:bg-violet-600 text-violet-600 group-hover:text-violet-100 transition">${filename}</code>`)
    mode = parseInt(localStorage.getItem('mode')!)
}
if (localStorage.getItem('autoUpdate') === 'true') {
    autoUpdateCheckbox.prop('checked', true)
    autoUpdateInterval ??= setInterval(update, 1000)
}
if (localStorage.getItem('timeOffset')) {
    timeOffsetInput.val(localStorage.getItem('timeOffset')!)
    timeOffset = parseFloat(localStorage.getItem('timeOffset')!)
    timeOffsetInput.trigger('change')
}

update()
