import $ from "jquery"
import ical from "ical"
import './index.css'

const fileInput: JQuery<HTMLInputElement> = $('#fileInput')
const todayButton: JQuery<HTMLButtonElement> = $('#todayButton')
const weekButton: JQuery<HTMLButtonElement> = $('#weekButton')
const events: JQuery<HTMLDivElement> = $('#events')

const eventToData = (event: ical.CalendarComponent): {
    class: string,
    teacher: string,
    room: {
        block: string,
        number: number | null,
        toString: () => string,
    }
    period: string,
    start: string,
    end: string,
} => {
    const summaryRegex = /.+: ((Yr \d)|(Rec)) ([^(\n]+)./

    const descriptionRegex = /Teacher:  (.+)\nPeriod: Period (.+)/
    const descriptionMatches = Array.from(
        event.description!.match(descriptionRegex)!
    )

    const locationRegex = /Room: (([a-zA-Z]+)\s?(\d+))/
    const locationMatches = Array.from(
        event.location!.match(locationRegex)!
    )

    return {
        class: Array.from(
            event.summary!.match(summaryRegex)!
        )[4],
        teacher: descriptionMatches[1],
        room: {
            block: locationMatches[2] === "Gymnasium" ? "" : locationMatches[2],
            number: locationMatches[2] === "Gymnasium" ? null : parseInt(locationMatches[3]),
            toString() {
                return `${locationMatches[2]}${locationMatches[2] === "Gymnasium" ? " " : ""}${this.number ?? ""}`
            },
        },
        period: descriptionMatches[2],
        start: event.start!.toLocaleTimeString(),
        end: event.end!.toLocaleTimeString(),
    }
}
todayButton.on("click", () => {
    if (!fileInput.val()) return
    const file: File = fileInput.prop('files')[0]
    events.empty()
    events.parent().removeClass("opacity-0 duration-0")
    events.parent().addClass("duration-1000")
    file.text().then((data) => {
        const calendar = ical.parseICS(data)
        for (let uid in calendar) {
            let event = calendar[uid]
            if (event.type.toString() === "VEVENT" && event.start?.getDate() === new Date().getDate()) {
                let classData = eventToData(event)
                events.append($(`
                    <tr class="border-y border-y-violet-200">
                        <td>${classData.class}</td>
                        <td class="hidden">${classData.teacher}</td>
                        <td>${classData.room.toString()}</td>
                        <td class="hidden">${classData.room.block}</td>
                        <td class="hidden">${classData.room.number ?? ""}</td>
                        <td>${classData.period}</td>
                        <td class="hidden">${classData.start}</td>
                        <td class="hidden">${classData.end}</td>
                    </tr>
                `))
            }
        }
    })
})
fileInput.on('change', () => {
    if (fileInput.val()) {
        todayButton.prop('disabled', false)
        weekButton.prop('disabled', false)
    } else {
        todayButton.prop('disabled', true)
        weekButton.prop('disabled', true)
    }
})
