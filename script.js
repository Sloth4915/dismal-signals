"use strict";

//#region Engine Config
let fonts = ["Metamorphous"]
const smallFont = "16px Metamorphous, Arial"
const mediumFont = "24px Metamorphous, Arial"
const largeFont = "32px Metamorphous, Arial"
const GAME_NAME = "Cell Signal Game"
const bgColor = "rgb(26,4,49)"
const debug = false
const debugShowBezier = false
const clearConsolePerTick = false
const dtMultiplier = 1
let width = 1200
let height = 800
//#endregion

//#region Initial Setup
document.body.style["margin"] = "0"
document.body.style["display"] = "flex"
document.body.style["justify-content"] = "center"
document.body.style["align-items"] = "center"
document.body.style["width"] = "100vw"
document.body.style["height"] = "100vh"
document.body.style["background-color"] = "black"

document.title = GAME_NAME

let canvas = document.createElement("canvas")
document.body.appendChild(canvas)
canvas.width = width
canvas.height = height
canvas.style.maxWidth = "100vw"
canvas.style.maxHeight = "100vh"
canvas.style["object-fit"] = "contain"
let draw = canvas.getContext("2d")
draw.font = smallFont
draw.imageSmoothingEnabled = draw.webkitImageSmoothingEnabled = draw.mozImageSmoothingEnabled = false

let _fontsLoading = fonts.length
for (let font of fonts) {
    new FontFace(font, `url(assets/fonts/${font}.ttf)`).load().then((loaded) => {
        document.fonts.add(loaded)
        _fontsLoading--
        if (_fontsLoading === 0) {
            requestAnimationFrame(_tick)
            let gameplayScript = document.createElement("script")
            gameplayScript.src = "gameplay/main.js"
            document.body.appendChild(gameplayScript)
        }
    })
}

//#endregion Initial Setup

//#region Engine

/* Removed because the children remain in world, invalidating this. Good idea and might have potential later.
class Scene {
    constructor(name) {
        this.name = name
        this.script = document.createElement("script")
        this.script.src = `gameplay/${name}.js`
    }
}

const SceneHandler = Object.freeze({
    scenes: [],
    addScene(scene) {
        if (typeof scene === "string") scene = new Scene(scene)
        this.scenes.push(scene)
        document.body.appendChild(scene.script)
    },
    removeScene(scene) {
        scene = this.scenes.splice(this.indexOf(scene),1)[0]
        console.log(scene)
        scene.script.remove()
    },
    includes(scene) {
        for (let currentScene of this.scenes) {
            if (currentScene.name === scene.name) return true
        }
        return false
    },
    indexOf(scene) {
        console.log(this.scenes, scene)
        for (let i in this.scenes) {
            if (this.scenes[i].name === scene.name ?? scene) return i
        }
        return -1
    }
})*/

let dt = 0
let totalEntities = 0

function factorial(n) {
    if (n < 0) return undefined;
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

class Bezier1d {
    constructor(points) {
        this.points = points
    }
    p(t) {
        let p = 0
        let n = this.points.length - 1
        for (let i = 0; i <= n; i++) {
            p += (factorial(n)/(factorial(i)*factorial(n-i)))
                *Math.pow(1-t, n-i)
                *Math.pow(t, i)
                *this.points[i]
        }
        return p
    }
}

class Bezier2d {
    /** XY0, XY2, optional XY1 */
    constructor(points) {
        let x = []
        let y = []
        for (let p of points) {
            x.push(p["x"] ?? p[0])
            y.push(p["y"] ?? p[1])
        }
        this.xCurve = new Bezier1d(x)
        this.yCurve = new Bezier1d(y)
        this.drawT = 0
    }
    x(t) {
        return this.xCurve.p(t)
    }
    y(t) {
        return this.yCurve.p(t)
    }
    draw() {
        if (debug && debugShowBezier) {
            draw.fillStyle = "orange"
            draw.fillRect(this.x(this.drawT)-4, this.y(this.drawT)-4, 16, 16)

            this.drawT += (dt / dtMultiplier) * 0.5
            if (this.drawT > 1) this.drawT -= 1

            draw.fillStyle = "yellow"
            for (let point of this.points) {
                let x = point.x ?? point[0]
                let y = point.y ?? point[1]
                draw.fillRect(x-4, y-4, 16, 16)
            }
            draw.lineWidth = "1"
            draw.strokeStyle = "rgba(255,255,255,0.3)"
            draw.moveTo(this.points[0].x ?? this.points[0][0], this.points[0].y ?? this.points[0][1])
            for (let t = 0; t < 1; t += 0.025) {
                draw.lineTo(this.x(t), this.y(t))
                draw.fillRect(this.x(t) - 2, this.y(t) - 2, 4, 4)
            }
            draw.lineTo(this.x(1), this.y(1))
            draw.stroke()
        }
    }
}

class Entity {
    constructor() {
        this.entityType = "entity"
        this.id = Date.now() + "e" + (totalEntities++) + "r" + Math.floor(Math.random()*100000)

        this._x = 100
        this._y = 100

        this.collisions = false
        this._width = 100
        this._height = 100
        this.personalLayers = []
        this.collisionLayers = []
        this.activeCollisions = []
        this.collidingWith = []
        this.vx = 0
        this.vy = 0

        this.hasMouseCollision = false
        this.mousePriority = 0
        this.hovered = false
        this.mouseDown = false

        this.callbacks = []

        this.disabled = false
        this.hidden = false

        this.name = "entity"
    }
    tick() {
        _entities.push(this)
        if (!this.hidden) this.draw()

        if (Math.abs(this.vx) < 0.1) this.vx = 0
        else this.x += this.vx * dt
        if (Math.abs(this.vy) < 0.1) this.vy = 0
        else this.y += this.vy * dt

        if (this.hasMouseCollision) {
            this.hovered = (this.x < mx && mx < this.x + this.width) && (this.y < my && my < this.y + this.height)
            if (this.hovered && !_hoveredEntities.includes(this)) _hoveredEntities.push(this)
            else if (!this.hovered && _hoveredEntities.includes(this)) _hoveredEntities.splice(_hoveredEntities.indexOf(this), 1)

            // TODO: make sure multiple entities cant be down at once via mousePriority
            this.mouseDown = this.hovered && mdown
        }

        if (debug) {
            this._debugDraw()
        }

        for (let callback of this.callbacks) {
            if (callback.type === Entity.Callbacks.TICK) callback.fn(this)
        }
    }
    draw() {

    }
    _debugDraw() {
        if (this.collisions) {
            draw.lineWidth = "1"
            draw.fillStyle = "yellow"
            draw.font = smallFont
            draw.fillText(`Personal${this.personalLayers}`, this.x, this.y + 12)
            draw.fillText(`Collides${this.collisionLayers}`,this.x,this.y + 24)
            draw.fillText(`Current${this.activeCollisions}`,this.x,this.y + 36)

            draw.strokeStyle = "yellow"
            draw.strokeRect(this.x, this.y, this.width, this.height)
            draw.beginPath();
            draw.moveTo(this.x + this.width / 2, this.y + this.height / 2);
            draw.lineTo(this.x + this.width / 2 + this.vx, this.y + this.height / 2 + this.vy);
            draw.stroke();
        }
        if (this.hasMouseCollision) {
            draw.lineWidth = "1"
            draw.strokeStyle = "purple"
            draw.strokeRect(this.x + 2, this.y + 2, this.width - 4, this.height - 4)
            if (this.hovered) {
                draw.lineWidth = "4"
                draw.strokeStyle = draw.fillStyle = "green"
                draw.strokeRect(this.x, this.y, this.width, this.height)
            }
            if (this.mouseDown) {
                draw.strokeStyle = draw.fillStyle = "blue"
                draw.strokeRect(this.x + 4, this.y + 4, this.width - 8, this.height - 8)
            }
        }
    }
    addCallback(type, fn) {
        this.callbacks.push({type, fn})
    }

    setPos(x,y) {
        this.setPosition(x,y)
        return this
    }
    setPosition(x,y) {
        this.x = x
        this.y = y
        return this
    }
    setSize(width,height) {
        this.width = width
        this.height = height
        return this
    }
    setBounds(x0,y0,x1,y1) {
        this.setPosition(x0,y0)
        this.setSize(x1-x0,y1-y0)
        return this
    }
    setPosAndSize(x,y,w,h) {
        this.setPosition(x,y)
        this.setSize(w,h)
        return this
    }

    //#region Getters for bounds
    get left() {
        return this.x
    }
    get right() {
        return this.x + this.width
    }
    get top() {
        return this.y
    }
    get bottom() {
        return this.y + this.height
    }
    //#endregion

    static Callbacks = Object.freeze({
        TICK: 0,
    })

    //#region Getters and setters for attributes
    get x() {
        return this._x
    }
    set x(a) {
        this._x = a
    }
    get y() {
        return this._y
    }
    set y(a) {
        this._y = a
    }
    get width() {
        return this._width
    }
    set width(a) {
        this._width = a
    }
    get height() {
        return this._height
    }
    set height(a) {
        this._height = a
    }
    //#endregion

    toString() {
        return this.entityType
    }
}

/* Holds multiple entities together as one */
class Group extends Entity {
    constructor() {
        super()
        this.entityType = "group"
        this.entities = []
    }
    tick() {
        super.tick()
        for (let e of this.entities) {
            if (this.vx < 0.5) this.vx = 0
            else e.x += this.vx * dt
            if (this.vy < 0.5) this.vy = 0
            else e.y += this.vy * dt
            if (!e.disabled) e.tick()
        }
    }
    addChild(e, xOrChangePosition = false, y=0) {
        this.entities.push(e)
        e.parent = this

        if (typeof xOrChangePosition === "number") {
            e.x = xOrChangePosition
            e.y = y
        }
        else if (xOrChangePosition) {
            e.x = this.x
            e.y = this.y
        }
        return e
    }
    removeChild(e) {
        this.entities.splice(this.entities.indexOf(e), 1)
        e.parent = null
    }
}

class SpriteBase extends Entity {
    constructor() {
        super()
        this.entityType = "sprite"

        this.r = 0
        this.vr = 0
        this.scaleX = 1
        this.scaleY = 1
        this.opacity = 1
    }

    draw() {
        draw.save()
        draw.translate(this.x + this.width / 2, this.y + this.height / 2);
        draw.rotate(this.r)
        draw.globalAlpha = this.opacity

        draw.drawImage(
            this.drawCanvas,
            -this.width / 2 * this.scaleX,
            -this.height / 2 * this.scaleY,
            this.scaleX * this.width,
            this.scaleY * this.height
        )
        draw.restore()
    }

    /** Sets a complex canvas **/
    setComplex(callback) {
        this.drawCanvas = new OffscreenCanvas(this.width, this.height)
        this.drawCtx = this.drawCanvas.getContext("2d")
        this.drawCtx.imageSmoothingEnabled = this.drawCtx.webkitImageSmoothingEnabled = this.drawCtx.mozImageSmoothingEnabled = false
        callback(this.drawCtx, this.width, this.height)
    }
}

class Sprite extends SpriteBase {
    constructor(type = null, option0, option1, width = 200, height = 200) {
        super()

        this.width = width
        this.height = height

        if (type !== null) {
                 if (type === Sprite.DrawType.IMAGE) this.setImage(option0, option1)
            else if (type === Sprite.DrawType.TRIANGLE) this.setTriangle(option0)
            else if (type === Sprite.DrawType.COMPLEX) this.setComplex(option0)
            else if (type === Sprite.DrawType.TEXT_SMALL) this.setTextSmall(option0, option1)
            else if (type === Sprite.DrawType.TEXT_MEDIUM) this.setTextMedium(option0, option1)
            else if (type === Sprite.DrawType.TEXT_LARGE) this.setTextLarge(option0, option1)
            else if (type === Sprite.DrawType.RECT) this.setRect(option0, option1)
            else if (type === Sprite.DrawType.CIRCLE) this.setCircle(option0)
            else if (type === Sprite.DrawType.GRADIENT) this.setGradient(option0)
        } else this.setComplex(() => {})
    }
    tick() {
        super.tick()
        this.r += this.vr * dt
    }

    setImage(src, hue = 0) {
        this.setComplex((ctx, w, h) => {
            let img = new Image()
            img.src = src.startsWith("assets/") ? src : "assets/sprite/"+src+".png"

            img.addEventListener("load", () => {
                ctx.filter = `hue-rotate(${hue}deg)`
                ctx.drawImage(img, 0, 0, w, h)
                ctx.filter = "none"
            })
        })
    }
    setTriangle(color) {
        this.setComplex((ctx,w,h) => {
            ctx.fillStyle = color
            ctx.beginPath()
            ctx.moveTo(0,h)
            ctx.lineTo(w,h)
            ctx.lineTo(w/2,0)
            ctx.lineTo(0,h)
            ctx.fill()
        })
    }
    setTextSmall(text = "Missing Text", color="white") {
        this.setComplex((ctx,w,h) => {
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.fillStyle = color
            ctx.font = smallFont
            ctx.fillText(text, w/2, h/2)
        })
    }
    setTextSmallWrap(text = "Missing Text", color = "white") {
        this.setComplex((ctx,w,h) => {
            ctx.textBaseline = 'top';
            ctx.textAlign = 'left';
            text = text.split(/(?<= )/)
            ctx.fillStyle = color
            ctx.font = smallFont
            let x = 0
            let y = 0
            for (let word of text) {
                let size = ctx.measureText(word)
                if (x + size.width > w) {
                    x = 0
                    y += size.actualBoundingBoxDescent + 8
                }
                ctx.fillText(word, x, y)
                x += size.width
            }
        })
    }
    setTextMedium(text = "Missing Text", color="white") {
        this.setComplex((ctx,w,h) => {
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.fillStyle = color
            ctx.font = mediumFont
            ctx.fillText(text, w/2, h/2)
        })
    }
    setTextMediumWrap(text = "Missing Text", color = "white") {
        this.setComplex((ctx,w,h) => {
            ctx.textBaseline = 'top';
            ctx.textAlign = 'left';
            text = text.split(/(?<= )/)
            ctx.fillStyle = color
            ctx.font = mediumFont
            let x = 0
            let y = 0
            for (let word of text) {
                let size = ctx.measureText(word)
                if (x + size.width > w) {
                    x = 0
                    y += size.actualBoundingBoxDescent + 8
                }
                ctx.fillText(word, x, y)
                x += size.width
            }
        })
    }
    setTextLarge(text = "Missing Text", color="white") {
        this.setComplex((ctx,w,h) => {
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.fillStyle = color
            ctx.font = largeFont
            ctx.fillText(text, w/2, h/2)
        })
    }
    // TODO add large wrap
    setRect(color, radius = 0) {
        this.setComplex((ctx,w,h) => {
            ctx.fillStyle = color
            ctx.beginPath()
            ctx.roundRect(0,0,w,h,radius)
            ctx.fill()
        })
    }
    setCircle(color) {
        this.setRect(color, 10000)
    }
    setGradient(colors) {
        if (Array.isArray(colors[0])) {
            let newColors = {}
            for (let i = 0; i < colors.length; i++) {
                newColors[i*(1/(colors.length-1))] = colors[i]
            }
            colors = newColors
        }
        this.setComplex((ctx, w, h) => {
            let gradient = ctx.createLinearGradient(0, 0, 0, h)
            for (let i of Object.keys(colors)) {
                gradient.addColorStop(i, colors[i])
            }
            ctx.fillStyle = gradient
            ctx.fillRect(0,0,width,height)
        })
    }

    static DrawType = Object.freeze({
        IMAGE: "img",
        TRIANGLE: "tri",
        COMPLEX: "complex",
        TEXT_SMALL: "small_text",
        TEXT_MEDIUM: "medium_text",
        TEXT_LARGE: "large_text",
        RECT: "rect",
        RECTANGLE: "rect",
        CIRCLE: "circle",
        ELLIPSE: "circle",
        GRADIENT: "gradient"
    })
}

class AnimatedSprite extends SpriteBase {
    constructor(width, height, frames) {
        super()
        this.width = width
        this.height = height
        this.fps = 4
        this.time = 0
        this.frames = []
        for (let frame of frames) {
            this.frames.push(new Sprite(Sprite.DrawType.IMAGE, frame, null,  this.width, this.height))
        }
    }
    draw() {
        this.time += dt
        let frame = Math.floor((this.time * this.fps) % this.frames.length)
        this.frames[frame].r = this.r
        this.frames[frame].vr = this.vr
        this.frames[frame].scaleX = this.scaleX
        this.frames[frame].scaleY = this.scaleY
        this.frames[frame].opacity = this.opacity
        this.frames[frame].setPosAndSize(this.x,this.y,this.width,this.height)
        this.frames[frame].draw()
    }
}

class NineSlice extends Group {
    constructor(name = "standard") {
        super();
        this.entityType = "9slice"

        this.width = 300
        this.height = 200

        /** Border Radius */
        this.border = 32

        this.tl = this.addChild(new Sprite(Sprite.DrawType.IMAGE, `assets/9slice/${name}/tl.png`))
        this.t = this.addChild(new Sprite(Sprite.DrawType.IMAGE, `assets/9slice/${name}/t.png`))
        this.tr = this.addChild(new Sprite(Sprite.DrawType.IMAGE, `assets/9slice/${name}/tr.png`))
        this.l = this.addChild(new Sprite(Sprite.DrawType.IMAGE, `assets/9slice/${name}/l.png`))
        this.m = this.addChild(new Sprite(Sprite.DrawType.IMAGE, `assets/9slice/${name}/m.png`))
        this.r = this.addChild(new Sprite(Sprite.DrawType.IMAGE, `assets/9slice/${name}/r.png`))
        this.bl = this.addChild(new Sprite(Sprite.DrawType.IMAGE, `assets/9slice/${name}/bl.png`))
        this.b = this.addChild(new Sprite(Sprite.DrawType.IMAGE, `assets/9slice/${name}/b.png`))
        this.br = this.addChild(new Sprite(Sprite.DrawType.IMAGE, `assets/9slice/${name}/br.png`))

        this.finishedInit = true
        this.resetChildren()
    }

    resetChildren() {
        if (typeof this.finishedInit === "undefined") return

        let partialWidth = this.width - this.border * 2
        let partialHeight = this.height - this.border * 2

        this.tl.setPosAndSize(this.x,this.y,this.border,this.border)
        this.t.setPosAndSize(this.x + this.border,this.y,partialWidth,this.border)
        this.tr.setPosAndSize(this.x + this.width - this.border,this.y,this.border,this.border)
        this.l.setPosAndSize(this.x, this.y + this.border, this.border, partialHeight)
        this.m.setPosAndSize(this.x + this.border, this.y + this.border, partialWidth, partialHeight)
        this.r.setPosAndSize(this.x + partialWidth + this.border, this.y + this.border, this.border, partialHeight)
        this.bl.setPosAndSize(this.x, this.y + partialHeight + this.border, this.border, this.border)
        this.b.setPosAndSize(this.x + this.border, this.y + partialHeight + this.border, partialWidth, this.border)
        this.br.setPosAndSize(this.x + partialWidth + this.border, this.y + partialHeight + this.border, this.border, this.border)
    }

    tick() {
        for (let e of this.entities) {
            if (this.vx < 0.5) this.vx = 0
            else e.x += this.vx * dt
            if (this.vy < 0.5) this.vy = 0
            else e.y += this.vy * dt
            e.tick()
        }
    }

    //#region Setters
    get x() {return super.x}
    set x(a) {
        super.x = a
        this.resetChildren()
    }
    get y() {return super.y}
    set y(a) {
        super.y = a
        this.resetChildren()
    }
    get width() {return super.width}
    set width(a) {
        super.width = a
        this.resetChildren()
    }
    get height() {return super.height}
    set height(a) {
        super.height = a
        this.resetChildren()
    }
    //#endregion
}

class UIElement extends Entity {
    constructor(type, text, width, height, action = (e) => {}) {
        super();
        this.entityType = "ui"

        this.hasMouseCollision = true

        this.disableAction = false

        this.standardSlice = new NineSlice()
        this.hoveredSlice = new NineSlice("selected")
        this.disabledSlice = new NineSlice("disabled")
        this.textContents = text
        this.text = new Sprite()
        this.setText(text)

        this.time = 0
        this.rate = 30

        this.width = width
        this.height = height

        this.action = action

        this.collisions = true
        this.hasMouseCollision = true
        this.mousePriority = 0

        this.type = type
    }

    setText(text = this.textContents) {
        this.textContents = text
        this.text.setTextMedium(text, "white")
    }

    tick() {
        super.tick()
        if (this.disableAction) this.disabledSlice.tick()
        else if (this.hovered) this.hoveredSlice.tick()
        else this.standardSlice.tick()
        this.text.tick()

        if (this.disableAction) return
        if (this.type === UIElement.Type.PRESS_BUTTON && this.mouseDown && this.hovered) {
            mdown = false
            this.action(this)
        } else if (this.type === UIElement.Type.HOLD_BUTTON && this.mouseDown && this.hovered) {
            this.time -= dt
            while (this.time < 0) {
                this.time += 1/this.rate
                this.action(this)
            }
        }
    }

    static Type = Object.freeze({
        LABEL: "label",
        PRESS_BUTTON: "press",
        HOLD_BUTTON: "hold",
    })

    get x() {
        return super.x
    }
    set x(a) {
        super.x = a
        this.standardSlice.x = this.hoveredSlice.x = this.disabledSlice.x = this.text.x = a
        this.setText()
    }
    get y() {
        return super.y
    }
    set y(a) {
        super.y = a
        this.standardSlice.y = this.hoveredSlice.y = this.disabledSlice.y = this.text.y = a
        this.setText()
    }
    get width() {
        return super.width
    }
    set width(a) {
        super.width = a
        this.standardSlice.width = this.hoveredSlice.width = this.disabledSlice.width = this.text.width = a
        this.setText()
    }
    get height() {
        return super.height
    }
    set height(a) {
        super.height = a
        this.standardSlice.height = this.hoveredSlice.height = this.disabledSlice.height = this.text.height = a
        this.setText()
    }
}

class Particle extends Group {
    constructor(color, x, y, quantity = 25, lifespan = 0.4, speed = 250) {
        super();
        this.entityType = "particle"

        this.x = x
        this.y = y

        let timeRemaining = lifespan

        for (let i = 0; i < quantity; i++) {
            let sprite = new Sprite()
            sprite.setTriangle(color)
            sprite.width = 12
            sprite.height = 12
            sprite.vx = Math.cos(Math.PI * 2 * i / quantity) * speed * Math.random()
            sprite.vy = Math.sin(Math.PI * 2 * i / quantity) * speed * Math.random()
            sprite.vr = Math.cos(Math.PI * 2 * i / quantity) * speed * Math.random() * 0.2
            sprite.opacity = 0.4
            this.addChild(sprite, true)
        }
        this.addCallback(Entity.Callbacks.TICK, () => {
            timeRemaining -= dt
            for (let child of this.entities) {
                child.scaleX = child.scaleY = Math.max(timeRemaining / lifespan, 0)
                child.vx *= (1-dt)
                child.vy *= (1-dt)
            }
            if (timeRemaining < -0.1) this.parent.removeChild(this)
        })
    }
}

const World = new Group()
World.color = bgColor
let _time = null
let _entities = []
let timeElapsed = 0

let mx = 0
let my = 0
let mdown = false
let _hoveredEntities = []

canvas.addEventListener("mousemove", (e) => {
    mx = ((e.clientX - canvas.offsetLeft) / canvas.offsetWidth) * canvas.width
    my = ((e.clientY - canvas.offsetTop) / canvas.offsetHeight) * canvas.height
})
document.addEventListener("mousedown", (e) => {
    mdown = true
})
document.addEventListener("mouseup", (e) => {
    mdown = false
})
document.addEventListener("mouseleave", (e) => {
    mdown = false
})

function _tick(a) {
    if (_time === null) {
        _time = a
        requestAnimationFrame(_tick)
        return
    }
    dt = ((a - _time)/1000)
    if (dt > 1/15) { // If frame takes longer than a 15th of a second, kill it (dt will be too high and may cause issues)
        _time = a
        timeElapsed += dt
        requestAnimationFrame(_tick)
        return
    }
    let realDt = dt
    dt *= dtMultiplier

    if (clearConsolePerTick) console.clear()

    draw.fillStyle = World.color
    draw.fillRect(0,0,width,height)
    World.tick()

    // TODO fix hovered to not include elements once they are disabled
    if (debug) {
        draw.font = smallFont
        draw.fillStyle = "yellow"
        draw.fillText(`${Math.round(1/(realDt))}fps (${dtMultiplier} speed multiplier)`,0,16)
        draw.fillText(`(${Math.round(mx)}, ${Math.round(my)})`,0,40)
        draw.fillText(`Down: ${mdown}`,0,64)
        draw.fillText(`Hovered: ${_hoveredEntities}`,0,88)
        draw.fillText(`${_entities.length} entities`,0,112)
    }

    draw.fillStyle = "yellow"
    draw.fillRect(mx,my,4,4)

    for (let entity of _entities) {
        if (!entity.collisions) continue
        let layers = []
        let collidingWith = []
        for (let check of _entities) {
            if (check === entity || !check.collisions) continue
            for (let layer of entity.collisionLayers) {
                if (check.personalLayers.includes(layer)) {
                    let points = [
                        {x: check.left, y: check.top},
                        {x: check.right, y: check.top},
                        {x: check.left, y: check.bottom},
                        {x: check.right, y: check.bottom}
                    ]
                    for (let p of points) {
                        if (entity.left < p.x && p.x < entity.right && entity.top < p.y && p.y < entity.bottom) {
                            layers.push(layer)
                            collidingWith.push(check)
                        }
                    }
                }
            }
            entity.activeCollisions = layers
            entity.collidingWith = collidingWith
        }
    }

    _time = a
    timeElapsed += dt
    _entities = []
    requestAnimationFrame(_tick)
}

//#endregion Engine
