import { CalendarComponent } from 'ical'
import $ from 'jquery'
import { AsciiFilter, DotFilter } from 'pixi-filters'
import { ColorMatrixFilter, Container, Graphics, LINE_CAP, LINE_JOIN, Point, Ticker, autoDetectRenderer } from 'pixi.js'

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
const ticks = 4
const circle = new Graphics()
    .lineStyle(lineStyle)
    .drawCircle(
        0,
        0,
        radius
    )
const hand = new Graphics()
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
        new Point(Math.cos(angle) * (radius - tickLength), Math.sin(angle) * (radius - tickLength)),
    )
}
const eventToAngles = (event: CalendarComponent) => {
    const start = new Date(event.start!)
    const end = new Date(event.end!)
    const startMinutes = start.getHours() * 60 + start.getMinutes()
    const endMinutes = end.getHours() * 60 + end.getMinutes()
    const startAngle = Math.abs(520 - startMinutes) / Math.abs(906 - startMinutes) * 360
    const endAngle = Math.abs(520 - endMinutes) / Math.abs(906 - endMinutes) * 360
    return {
        start: startAngle,
        end: endAngle,
    }
}

circle.pivot = new Point(-renderer.width / 4, -renderer.height / 4)
stage.addChild(circle)
circle.addChild(hand)

ticker.add((deltaTime) => {
    renderer.render(stage)
    hand.angle += deltaTime
})
