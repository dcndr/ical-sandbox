import { CalendarComponent } from 'ical'
import $ from 'jquery'
import { BlurFilter, Container, Graphics, LINE_CAP, LINE_JOIN, Point, Ticker, autoDetectRenderer } from 'pixi.js'
import { events } from './times'


const canvas: JQuery<HTMLCanvasElement> = $("#canvas")
const renderer = autoDetectRenderer(
    {
        width: canvas.width(),
        height: canvas.height(),
        view: canvas.get(0),
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
    }
)
const stage = new Container()
const radius = 150
const tickLength = 20
const handLength = 130
const lineStyle = {
    width: 10,
    color: 0x333333,
    alignment: 0.5,
    alpha: 1,
    cap: LINE_CAP.ROUND,
    join: LINE_JOIN.ROUND,
}
const circle = new Graphics()
    .lineStyle(lineStyle)
    .drawCircle(
        0,
        0,
        radius
    )
const periodHand = new Graphics()
    .lineStyle(lineStyle)
    .drawPolygon(
        new Point(0, 0),
        new Point(0, -handLength)
    )
const ticker = Ticker.shared

const drawTick = (angleDegrees: number): void => {
    const angle = (angleDegrees - 90) * Math.PI / 180
    circle.drawPolygon(
        new Point(Math.cos(angle) * radius, Math.sin(angle) * radius),
        new Point(Math.cos(angle) * (radius + tickLength), Math.sin(angle) * (radius + tickLength)),
    )
}
const eventToAngles = (event: CalendarComponent) => {
    const start = new Date(event.start!)
    const end = new Date(event.end!)
    const startMinutesSinceMidnight = start.getHours() * 60 + start.getMinutes()
    const endMinutesSinceMidnight = end.getHours() * 60 + end.getMinutes()
    const startAngle = Math.abs(520 - startMinutesSinceMidnight) / Math.abs(906 - startMinutesSinceMidnight) * 360
    const endAngle = Math.abs(520 - endMinutesSinceMidnight) / Math.abs(906 - endMinutesSinceMidnight) * 360
    return {
        start: startAngle,
        end: endAngle,
    }
}

circle.pivot = new Point(-renderer.width / 4, -renderer.height / 4)
stage.addChild(circle)
circle.addChild(periodHand)

const eventsToday = events
    .filter(
        event => event.type.toString() === 'VEVENT'
            && new Date(event.start!).toLocaleDateString() === new Date().toLocaleDateString()
    )
if (eventsToday.length === 0) {
    circle.filters = [new BlurFilter(50, 10)]
    for (let i = 0; i < Math.random() * 2 + 10; i++) {
        drawTick(Math.random() * 360)
    }
}
else {
    eventsToday
        .forEach(event =>
            drawTick(eventToAngles(event).start)
        )
}


ticker.add((deltaTime) => {
    renderer.render(stage)
    const minutesSinceMidnight = new Date().getHours() * 60 + new Date().getMinutes()
    periodHand.angle = Math.abs(520 - minutesSinceMidnight) / Math.abs(906 - minutesSinceMidnight) * 360
})
