import { CalendarComponent } from 'ical'
import $ from 'jquery'
import { BlurFilter, Container, Graphics, LINE_CAP, LINE_JOIN, Point, Text, Ticker, autoDetectRenderer } from 'pixi.js'
import { eventToClass, events } from './times'

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
const radius = Math.min(renderer.width, renderer.height) / 2 - 150
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

const drawTick = (
    anglesDegrees: number[],
    label: { header: string, text: string } = { header: '', text: '' }
): void => {
    anglesDegrees = anglesDegrees.map(angle => (angle - 90) * Math.PI / 180)
    anglesDegrees.forEach(angle => {
        circle.drawPolygon(
            new Point(Math.cos(angle) * radius, Math.sin(angle) * radius),
            new Point(Math.cos(angle) * (radius + tickLength), Math.sin(angle) * (radius + tickLength))
        )
    })
    const container = new Container()
    const header = new Text(label.header, {
        fontFamily: 'system-ui',
        fontSize: 16,
        fill: 0x333333,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: 120,
        fontWeight: 'bold'
    })
    const text = new Text(label.text, {
        fontFamily: 'system-ui',
        fontSize: 16,
        fill: 0x333333,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: 120,
    })

    header.anchor.set(0.5, 1)
    text.anchor.set(0.5, 0)
    const average = anglesDegrees.reduce((previous, current) => previous + current) / anglesDegrees.length
    header.position = text.position
        = new Point(0, -radius - 80)

    container.rotation = average + Math.PI / 2

    container.addChild(header)
    container.addChild(text)

    circle.addChild(container)
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
const minutesSinceMidnight = () => {
    return new Date().getHours() * 60 + new Date().getMinutes()
}

circle.pivot = new Point(-renderer.width / 2, -renderer.height / 2)
stage.addChild(circle)
circle.addChild(periodHand)

const eventsToday = events
    .filter(
        event => event.type.toString() === 'VEVENT'
            && new Date(event.start!).toLocaleDateString() === new Date().toLocaleDateString()
    )
if (eventsToday.length === 0 || minutesSinceMidnight() < 520 || minutesSinceMidnight() > 906) {
    circle.filters = [new BlurFilter(50, 20)]
    for (let i = 0; i < Math.random() * 2 + 10; i++) {
        drawTick([Math.random() * 360], {
            header: Math.random().toString(36).slice(2),
            text: Math.random().toString(36).slice(2),
        })
    }
}
else {
    eventsToday
        .forEach(event => {
            const classData = eventToClass(event)
            drawTick(eventToAngles(event), {
                header: `Period ${classData.period}`,
                text: classData.class,
            })
        })
}

(globalThis as any).__PIXI_STAGE__ = stage;
(globalThis as any).__PIXI_RENDERER__ = renderer;

ticker.add(deltaTime => {
    renderer.render(stage)
    periodHand.angle = ((minutesSinceMidnight() - 520) * 360) / 386
})
