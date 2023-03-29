import $ from "jquery"
import ical from "ical"

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
    const summaryRegex = /.+: Yr \d ([^(\n]+)./

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
        )[1],
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
    const file: File = fileInput.prop('files')[0]
    file.text().then((data) => {
        const calendar = ical.parseICS(data)
        events.empty()
        for (let uid in calendar) {
            let event = calendar[uid]
            if (event.type.toString() === "VEVENT") {
                let classData = eventToData(event)
                events.append($(`
                    <tr>
                        <td>${classData.class}</td>
                        <td>${classData.teacher}</td>
                        <td>${classData.room.toString()}</td>
                        <td>${classData.room.block}</td>
                        <td>${classData.room.number ?? ""}</td>
                        <td>${classData.period}</td>
                        <td>${classData.start}</td>
                        <td>${classData.end}</td>
                    </tr>
                `))
            }
        }
    })
})
