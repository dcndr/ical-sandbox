import $ from 'jquery'
import ical, { CalendarComponent } from 'ical'
import './index.css'
import { Container, Graphics, LINE_CAP, LINE_JOIN, Point, autoDetectRenderer } from 'pixi.js'

const fileInput: JQuery<HTMLInputElement> = $('#fileInput')
const todayButton: JQuery<HTMLButtonElement> = $('#todayButton')
const weekButton: JQuery<HTMLButtonElement> = $('#weekButton')
const eventsList: JQuery<HTMLDivElement> = $('#events')
const fileInputFakeButton: JQuery<HTMLButtonElement> = $('#fileInputFakeButton')
const todayHeader: JQuery<HTMLTableCellElement> = $('#todayHeader')
const weekHeader: JQuery<HTMLTableCellElement> = $('#weekHeader')
let events: CalendarComponent[]
let filename: string | number | string[] = ""
enum Mode { None, Today, Week }
let mode = Mode.None;
const periods = [...Array(8).keys()].map(period => period + 1)

type ClassRow = {
    class: string
    teacher: string
    room: string
    period: string
    start: string
    end: string
}
const eventToClass = (event: ical.CalendarComponent): ClassRow => {
    const summaryRegex = /.+: ((((Yr \d+)|(Rec)) ([^(\n]+))|(\d+'s [a-zA-Z]+))./

    const descriptionRegex = /Teacher:  (.+)\nPeriod: Period (.+)/
    const descriptionMatches = Array.from(
        event.description!.match(descriptionRegex)!
    )

    const locationRegex = /Room: (.+)/
    const locationMatches = Array.from(
        event.location!.match(locationRegex)!
    )

    const summaryMatches = Array.from(
        event.summary!.match(summaryRegex)!
    )
    return {
        class: summaryMatches[7] || summaryMatches[6],
        teacher: descriptionMatches[1].replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase()),
        room: locationMatches[1].startsWith('Gymnasium') ? 'Gym' : locationMatches[1],
        period: descriptionMatches[2],
        start: new Date(event.start!).toLocaleTimeString([], { hour: 'numeric', minute: 'numeric' }),
        end: new Date(event.end!).toLocaleTimeString([], { hour: 'numeric', minute: 'numeric' }),
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
const updateHeaders = (): void => {
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
const dataToEvents = (data: string): CalendarComponent[] => {
    const calendar = ical.parseICS(data)
    const events = Object.entries(calendar)
        .filter(entry => calendar[entry[0]].type.toString() === 'VEVENT')
        .map(entry => entry[1])
    return events
}
const getWeekNumber = (date: Date): number => {
    date = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
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
    updateTable()
}
const eventsToWeek = (events: ical.CalendarComponent[]): string =>
    periods
        .map(period => {
            const row = events
                .filter(event => eventToClass(event).period === period.toString())
                .map(event => `<td>${eventToClass(event).class}</td>`)
            if (row.length < 5)
                row.push(`<td class="blur">${Math.random().toString(36).slice(2)}</td>`)
            return (
                `
        <tr class='h-16 border-y border-y-violet-200 hover:bg-violet-100 transition duration-700'>
        ${row}
        </tr>
        `
            )
        }).join('')
const updateTable = (): void => {
    if (mode == Mode.Today) {
        events.forEach((event) => {
            if (event.type.toString() === 'VEVENT'
                && new Date(event.start!).toLocaleDateString() === new Date().toLocaleDateString()) {
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
            else return
        })
        periods.forEach(() => {
            eventsList.append($(
                `
                <tr class='h-16 border-y border-y-violet-200 hover:bg-violet-50 transition duration-700'>
                <td class="blur">${Math.random().toString(36).slice(2)}</td>
                <td class="blur">${Math.random().toString(36).slice(2)}</td>
                <td class="blur">${Math.random().toString(36).slice(2)}</td>
                <td class="blur">${Math.random().toString(36).slice(2)}</td>
                <td class="blur">${Math.random().toString(36).slice(2)}</td>
                </tr>
                `
            ))
        })
    }
    else {
        eventsList.append($(eventsToWeek(events.filter(event => getWeekNumber(new Date(event.start!)) === getWeekNumber(new Date())))))
    }
}

fileInput.on('change', (): void => {
    fileInput.prop('files')[0].text().then((data: string) => {
        events = dataToEvents(data)
    })
    filename = getFileName(fileInput.val()!)
    todayButton.prop('disabled', false)
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
weekButton.on('click', (): void => {
    mode = Mode.Week
    update()
})

if (localStorage.getItem('events')) {
    events = JSON.parse(localStorage.getItem('events')!)
    filename = localStorage.getItem('filename')!
    todayButton.prop('disabled', false)
    weekButton.prop('disabled', false)
    fileInputFakeButton.html(`Selected file: <code class="bg-violet-300 rounded-md p-1 group-hover:bg-violet-600 text-violet-600 group-hover:text-violet-100 transition">${filename}</code>`)
    mode = Mode.Today
    update()
}

const canvas: JQuery<HTMLCanvasElement> = $("#canvas")
const renderer = autoDetectRenderer(
    {
        width: canvas.width(),
        height: canvas.height(),
        view: canvas.get(0),
        antialias: true,
        backgroundAlpha: 0,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
    }
)

const stage = new Container()

const radius = 150
const tickLength = 20
const lineStyle = {
    width: 10,
    color: 0x333333,
    alignment: 0.5,
    alpha: 1,
    cap: LINE_CAP.ROUND,
    join: LINE_JOIN.ROUND,
}
const ticks = 8

const circle = new Graphics()
    .lineStyle(lineStyle)
    .drawCircle(
        0,
        0,
        radius
    )

for (let i = 0; i < ticks; i++) {
    circle.drawPolygon(
        new Point(radius, 0),
        new Point(radius - tickLength, 0),
    )
}

circle.pivot = new Point(-renderer.width / 4, -renderer.height / 4)

stage.addChild(circle)

renderer.render(stage)
