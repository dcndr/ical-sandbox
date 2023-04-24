import { CalendarComponent } from 'ical'
import $ from 'jquery'
import { BlurFilter, Container, Graphics, LINE_CAP, LINE_JOIN, Point, Text, Ticker, autoDetectRenderer } from 'pixi.js'
import { eventToClass, events } from './times'
import Sinon from 'sinon'

const clock = Sinon.useFakeTimers({
    now: new Date(2023, 3, 26, 8, 39, 55),
    shouldAdvanceTime: true,
})

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
const radius = renderer.height / 2 - 100
const tickLength = 20
const handLength = radius - 20
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
    .drawCircle(0, 0, radius)
const periodHand = new Graphics()
    .lineStyle(lineStyle)
    .drawPolygon(
        new Point(0, 0),
        new Point(0, -handLength)
    )
const ticker = Ticker.shared

const drawTick = (anglesDegrees: number[], label: string = ''): void => {
    anglesDegrees = anglesDegrees.map(angle => (angle - 90) * Math.PI / 180)
    anglesDegrees.forEach(angle => {
        circle.drawPolygon(
            new Point(Math.cos(angle) * radius, Math.sin(angle) * radius),
            new Point(Math.cos(angle) * (radius + tickLength), Math.sin(angle) * (radius + tickLength))
        )
    })
    const text = new Text(label, {
        fontFamily: 'system-ui',
        fontSize: 16,
        fill: 0x333333,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: 100,
    })
    text.anchor.set(0.5)
    const average = anglesDegrees.reduce((previous, current) => previous + current) / anglesDegrees.length
    text.position = new Point(Math.cos(average) * (radius + tickLength + 40), Math.sin(average) * (radius + tickLength + 40))

    circle.addChild(text)
}
const eventToAngles = (event: CalendarComponent): number[] => {
    const start = new Date(event.start!)
    const end = new Date(event.end!)
    const startMinutesSinceMidnight = start.getHours() * 60 + start.getMinutes()
    const endMinutesSinceMidnight = end.getHours() * 60 + end.getMinutes()
    const startAngle = ((startMinutesSinceMidnight - 520) * 360) / 386
    const endAngle = ((endMinutesSinceMidnight - 520) * 360) / 386
    return [startAngle, endAngle]
}

circle.pivot = new Point(-renderer.width / 2, -renderer.height / 2)
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
        drawTick([Math.random() * 360])
    }
}
else {
    eventsToday
        .forEach(event =>
            drawTick(eventToAngles(event), eventToClass(event).class)
        )
}

(globalThis as any).__PIXI_STAGE__ = stage;
(globalThis as any).__PIXI_RENDERER__ = renderer;

ticker.add((deltaTime) => {
    renderer.render(stage)
    const minutesSinceMidnight = new Date().getHours() * 60 + new Date().getMinutes()
    periodHand.angle = ((minutesSinceMidnight - 520) * 360) / 386
    clock.tick(deltaTime * 200)
})
