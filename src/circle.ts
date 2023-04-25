import { CalendarComponent } from 'ical'
import $ from 'jquery'
import { BlurFilter, Container, Graphics, HTMLText, HTMLTextStyle, LINE_CAP, LINE_JOIN, Point, Text, Ticker, autoDetectRenderer } from 'pixi.js'
import { ClassData, eventToClass, events, timeFormat } from './times'
import Sinon from 'sinon'

const clock = Sinon.useFakeTimers({
    now: new Date(2023, 3, 31, 8, 30, 0),
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
const radius = Math.min(renderer.screen.width, renderer.screen.height) / 2 - 150
const tickLength = 20
const dayHandLength = radius - 60
const periodHandLength = radius - 20
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
    .beginFill(lineStyle.color)
    .drawCircle(0, 0, 5)
    .endFill()
const dayHand = new Graphics()
    .lineStyle(lineStyle)
    .drawPolygon(
        new Point(0, -20),
        new Point(0, -dayHandLength)
    )
const periodHand = new Graphics()
    .lineStyle(lineStyle)
    .drawPolygon(
        new Point(0, -20),
        new Point(0, -periodHandLength)
    )
const ticker = Ticker.shared

const drawTick = (
    angles: number[],
    classData: ClassData | string = {
        class: '',
        teacher: '',
        room: '',
        period: '',
        start: '',
        end: '',
    },
): void => {
    angles
        .map(angle => angle - Math.PI * 0.5)
        .forEach(angle => {
            circle.drawPolygon(
                new Point(Math.cos(angle) * radius, Math.sin(angle) * radius),
                new Point(Math.cos(angle) * (radius + tickLength), Math.sin(angle) * (radius + tickLength))
            )
        })
    const container = new Container()
    const text = new HTMLText(
        (typeof classData === 'string'
            ? classData
            : `
                <font size='4'>
                    <b>${isNaN(+classData.period) ? '' : `Period `}${classData.period}</b>
                </font>
                ${isNaN(+classData.period) ? '' : `<br />`}

                <font size='2'>
                    <i>${classData.class}</i>
                </font>

                <font size='3'>
            ${classData.room !== '-'
                ? `${classData.room !== '' ? `<br />in ` : ''}<b>${classData.room}</b>`
                : ''
            }
                </font>
                <br />
                <font size='2'>${classData.start} - ${classData.end}</font>
            `).trim(), new HTMLTextStyle({
                fontFamily: 'system-ui',
                fontSize: 15,
                fill: 0x333333,
                align: 'center',
            })
    )

    const center = angles.reduce((previous, current) => previous + current) / angles.length
    const upsideDown = center > Math.PI / 2 && center < 1.5 * Math.PI
    text.anchor.set(0.5, upsideDown ? -0.2 : 1)
    container.pivot.set(0, radius + 30)
    container.rotation = center
    text.rotation = upsideDown ? Math.PI : 0

    container.addChild(text)
    circle.addChild(container)
}
const eventToAngles = (event: CalendarComponent): number[] => [dateToAngle(new Date(event.start!)), dateToAngle(new Date(event.end!))]
const wednesday = () => new Date().getDay() === 3
const dateToAngle = (date: Date): number => ((minutesSinceMidnight(date) - 520) * 2 * Math.PI) / ((wednesday() ? 870 : 906) - 520)
const minutesSinceMidnight = (date: Date | undefined = undefined) => {
    date ??= new Date()
    return date.getHours() * 60 + date.getMinutes()
}
const bellsToday = () => {
    return eventsToday
        .flatMap(event => [new Date(event.start!), new Date(event.end!)])
        .map(date => date.getTime())
        .filter((time, index, times) => times.indexOf(time) === index)
        .map(time => new Date(time))
}

circle.pivot = new Point(-renderer.screen.width / 2, -renderer.screen.height / 2)
stage.addChild(circle)
circle.addChild(dayHand)
circle.addChild(periodHand)

const eventsToday = events
    .filter(
        event => event.type.toString() === 'VEVENT'
            && new Date(event.start!).toLocaleDateString() === new Date().toLocaleDateString()
    )

eventsToday
    .forEach(event => {
        drawTick(eventToAngles(event), eventToClass(event))
    });
const recess = bellsToday().slice(2, 4)
drawTick(
    recess.map(date => dateToAngle(date)),
    {
        period: 'Recess',
        start: recess[0].toLocaleTimeString([], timeFormat).replace(/^0:/, '12:'),
        end: recess[1].toLocaleTimeString([], timeFormat).replace(/^0:/, '12:'),
        class: '',
        teacher: '',
        room: '',
    }
);
const lunch = wednesday() ? bellsToday().slice(6, 8) : bellsToday().slice(8, 10)
drawTick(
    lunch.map(date => dateToAngle(date)),
    {
        period: 'Lunch',
        start: lunch[0].toLocaleTimeString([], timeFormat).replace(/^0:/, '12:'),
        end: lunch[1].toLocaleTimeString([], timeFormat).replace(/^0:/, '12:'),
        class: '',
        teacher: '',
        room: '',
    }
);

if (!wednesday()) {
    const breakTime = bellsToday().slice(5, 7)
    drawTick(
        breakTime.map(date => dateToAngle(date)),
        {
            period: 'Break',
            start: breakTime[0].toLocaleTimeString([], timeFormat).replace(/^0:/, '12:'),
            end: breakTime[1].toLocaleTimeString([], timeFormat).replace(/^0:/, '12:'),
            class: '',
            teacher: '',
            room: '',
        }
    );
}

(() => {
    (globalThis as any).__PIXI_STAGE__ = stage;
    (globalThis as any).__PIXI_RENDERER__ = renderer;
})()

ticker.add(deltaTime => {
    renderer.render(stage)
    dayHand.rotation = dateToAngle(new Date())
    const previousBell = bellsToday().filter(bell => bell < new Date()).slice(-1)[0]
    const nextBell = bellsToday().filter(bell => bell > new Date())[0]
    periodHand.rotation = ((minutesSinceMidnight() - minutesSinceMidnight(previousBell)) * 2 * Math.PI)
        / (minutesSinceMidnight(nextBell) - minutesSinceMidnight(previousBell))
    circle.filters = eventsToday.length === 0 || minutesSinceMidnight() < 520 || minutesSinceMidnight() > 906
        ? [new BlurFilter(50, 20)]
        : []

    clock.tick(deltaTime * 3000)
})

renderer.render(stage)
