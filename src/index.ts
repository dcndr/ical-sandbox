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
    room: string
    period: string,
    start: string,
    end: string,
} => {
    const summaryRegex = /.+: ((Yr \d)|(Rec)) ([^(\n]+)./

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
        teacher: descriptionMatches[1],
        room: locationMatches[1].startsWith("Gymnasium") ? "Gymnasium" : locationMatches[1],
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
            const event = calendar[uid]
            if (event.type.toString() === "VEVENT" && event.start?.getDate() === new Date().getDate()) {
                const classData = eventToData(event)
                events.append($(`
                    <tr class="border-y border-y-violet-200 hover:bg-violet-100 transition duration-700">
                        <td>${classData.class}</td>
                        <td class="hidden md:table-cell">${classData.teacher}</td>
                        <td>${classData.room.toString()}</td>
                        <td>${classData.period}</td>
                        <td class="hidden sm:block">${classData.start}</td>
                        <td class="hidden sm:block">${classData.end}</td>
                    </tr>
                `))
            }
        }
    })
})
fileInput.on('change', () => {
    todayButton.prop('disabled', !fileInput.val())
    weekButton.prop('disabled', !fileInput.val())
})
