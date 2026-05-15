"use strict";

//#region Engine Config Part 1
let fonts = ["Metamorphous"]
const smallFont = "16px Metamorphous, Arial"
const mediumFont = "24px Metamorphous, Arial"
const largeFont = "32px Metamorphous, Arial"
//#endregion

//#region Initial Setup
document.body.style["margin"] = "0"
document.body.style["display"] = "flex"
document.body.style["justify-content"] = "center"
document.body.style["align-items"] = "center"
document.body.style["width"] = "100vw"
document.body.style["height"] = "100vh"
document.body.style["background-color"] = "black"

let width = 1200
let height = 800
let canvas = document.createElement("canvas")
document.body.appendChild(canvas)
canvas.width = width
canvas.height = height
canvas.style.maxWidth = "100vw"
canvas.style.maxHeight = "100vh"
let draw = canvas.getContext("2d")
draw.font = smallFont

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

class Bezier {
    /** XY0, XY2, optional XY1 */
    constructor(x0, y0, x2, y2, x1 = x0 + (x2 - x0) * Math.random(), y1 = y0 + (y2 - y0) * Math.random()) {
        this.x0 = x0
        this.y0 = y0
        this.x2 = x2
        this.y2 = y2
        this.x1 = x1
        this.y1 = y1
    }
    x(t) {
        return (Math.pow(1-t,2) * this.x0) + (2 * (1 - t) * t * this.x1) + (Math.pow(t,2) * this.x2)
    }
    y(t) {
        return (Math.pow(1-t,2) * this.y0) + (2 * (1 - t) * t * this.y1) + (Math.pow(t,2) * this.y2)
    }
    draw() {
        if (debug) {
            draw.fillStyle = "yellow"
            draw.fillRect(this.x0 - 4, this.y0 - 4, 8, 8)
            draw.fillRect(this.x1 - 4, this.y1 - 4, 8, 8)
            draw.fillRect(this.x2 - 4, this.y2 - 4, 8, 8)

            draw.lineWidth = "1"
            draw.strokeStyle = "rgba(255,255,255,0.3)"
            draw.moveTo(this.x0, this.y0)
            for (let t = 0; t < 1; t += 0.1) {
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
        this._x = 100
        this._y = 100

        this.collisions = false
        this._width = 100
        this._height = 100
        this.personalLayers = []
        this.collisionLayers = []
        this.vx = 0
        this.vy = 0

        this.hasMouseCollision = false
        this.mousePriority = 0
        this.hovered = false
        this.mouseDown = false

        this.callbacks = []

        this.hidden = false

        this.name = "entity"
    }
    tick() {
        if (!this.hidden) this.draw()

        if (Math.abs(this.vx) < 0.1) this.vx = 0
        else this.x += this.vx * dt
        if (Math.abs(this.vy) < 0.1) this.vy = 0
        else this.y += this.vy * dt

        if (this.hasMouseCollision) {
            this.hovered = (this.x < mx && mx < this.x + this.width) && (this.y < my && my < this.y + this.height)
            if (this.hovered && !_hoveredEntities.includes(this)) _hoveredEntities.push(this)
            else if (!this.hovered && _hoveredEntities.includes(this)) _hoveredEntities.splice(_hoveredEntities.indexOf(this), 1)
            this.mouseDown = this === downEntity
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
            draw.strokeStyle = draw.fillStyle = "yellow"
            draw.font = smallFont
            draw.strokeRect(this.x, this.y, this.width, this.height)
            draw.fillText(`Layers${this.personalLayers}, ${this.collisionLayers}`, this.x, this.y)

            draw.beginPath();
            draw.moveTo(this.x + this.width / 2, this.y + this.height / 2);
            draw.lineTo(this.x + this.width / 2 + this.vx, this.y + this.height / 2 + this.vy);
            draw.stroke();

            if (this.hasMouseCollision) {
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
    }
    addCallback(type, fn) {
        this.callbacks.push({type, fn})
    }

    setPos(x,y) {
        this.setPosition(x,y)
    }
    setPosition(x,y) {
        this.x = x
        this.y = y
    }
    setSize(width,height) {
        this.width = width
        this.height = height
    }
    setBounds(x0,y0,x1,y1) {
        this.setPosition(x0,y0)
        this.setSize(x1-x0,y1-y0)
    }
    setPosAndSize(x,y,w,h) {
        this.setPosition(x,y)
        this.setSize(w,h)
    }

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
}

/* Holds multiple entities together as one */
class Group extends Entity {
    constructor() {
        super()
        this.entities = []
    }
    tick() {
        super.tick()
        for (let e of this.entities) {
            if (this.vx < 0.5) this.vx = 0
            else e.x += this.vx * dt
            if (this.vy < 0.5) this.vy = 0
            else e.y += this.vy * dt
            e.tick()
        }
    }
    addChild(e, changePosition = false) {
        this.entities.push(e)
        e.parent = this
        if (changePosition) {
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

class Sprite extends Entity {
    constructor(type = null, option0, option1) {
        super()
        this.r = 0
        this.vr = 0
        this.scaleX = 1
        this.scaleY = 1
        this.opacity = 1

        if (type !== null) {
                 if (type === Sprite.DrawType.IMAGE) this.setImage(option0)
            else if (type === Sprite.DrawType.TRIANGLE) this.setTriangle(option0)
            else if (type === Sprite.DrawType.COMPLEX) this.setComplex(option0)
            else if (type === Sprite.DrawType.TEXT_SMALL) this.setTextSmall(option0, option1)
            else if (type === Sprite.DrawType.TEXT_MEDIUM) this.setTextMedium(option0, option1)
            else if (type === Sprite.DrawType.RECT) this.setRect(option0, option1)
            else if (type === Sprite.DrawType.CIRCLE) this.setCircle(option0)
        } else this.setComplex(() => {})
    }
    tick() {
        super.tick()
        this.r += this.vr * dt
    }
    draw() {
        super.draw()
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

    setImage(src) {
        this.setComplex((ctx, w, h) => {
            let img = new Image()
            img.src = src
            img.addEventListener("load", () => {
                ctx.drawImage(img, 0, 0, w, h)
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
            ctx.fillStyle = color
            ctx.font = smallFont
            ctx.fillText(text, w/2, h/2)
        })
    }
    setTextMedium(text = "Missing Text", color="white") {
        this.setComplex((ctx,w,h) => {
            ctx.fillStyle = color
            ctx.font = mediumFont
            ctx.fillText(text, w/2, h/2)
        })
    }
    setTextLarge(text = "Missing Text", color="white") {
        this.setComplex((ctx,w,h) => {
            ctx.fillStyle = color
            ctx.font = largeFont
            ctx.fillText(text, w/2, h/2)
        })
    }
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
    /** Sets a complex canvas **/
    setComplex(callback) {
        this.drawCanvas = new OffscreenCanvas(this.width, this.height)
        this.drawCtx = this.drawCanvas.getContext("2d")
        this.drawCtx.textBaseline = 'middle';
        this.drawCtx.textAlign = 'center';

        callback(this.drawCtx, this.width, this.height)
    }

    static DrawType = Object.freeze({
        IMAGE: "img",
        TRIANGLE: "tri",
        COMPLEX: "complex",
        TEXT_SMALL: "small_text",
        TEXT_MEDIUM: "medium_text",
        TEXT_LARGE: "large_text",
        // TODO: implement the following
        RECT: "rect",
        RECTANGLE: "rect",
        CIRCLE: "circle",
        ELLIPSE: "circle"
    })
}

class NineSlice extends Group {
    constructor(name = "standard") {
        super();

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
        console.warn('resetting children')

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
        console.log(this.x, a)
        super.x = a
        console.log(this.x)
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
        this.hasMouseCollision = true

        this.disabled = false

        this.standardSlice = new NineSlice()
        this.hoveredSlice = new NineSlice("selected")
        this.disabledSlice = new NineSlice("disabled")
        this.textContents = text
        this.text = new Sprite()
        this.setText(text)

        this.width = width
        this.height = height

        this.action = action

        this.collisions = true
        this.hasMouseCollision = true

        this.type = type
    }

    setText(text = this.textContents) {
        this.textContents = text
        this.text.setTextMedium(text, "white")
    }

    tick() {
        super.tick()
        if (this.disabled) this.disabledSlice.tick()
        else if (this.hovered) this.hoveredSlice.tick()
        else this.standardSlice.tick()
        this.text.tick()

        if (this.type === UIElement.Type.PRESS_BUTTON && this.mouseDown) {
            mdown = false
            this.action.call(this)
            console.log("push")
        } else if (this.type === UIElement.Type.HOLD_BUTTON && this.mouseDown) {
            this.action.call(this)
            console.log("push")
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
let _time = null
let timeElapsed = 0

let mx = 0
let my = 0
let mdown = false
let _hoveredEntities = []
let downEntity = null

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
    dt = (a - _time)/1000
    if (dt > 1/15) { // If frame takes longer than a 15th of a second, kill it (dt will be too high and may cause issues)
        _time = a
        timeElapsed += dt
        requestAnimationFrame(_tick)
        return
    }

    if (clearConsolePerTick) console.clear()

    draw.fillStyle = World.color
    draw.fillRect(0,0,width,height)
    World.tick()

    if (debug) {
        draw.font = smallFont
        draw.fillStyle = "yellow"
        draw.fillText(`${Math.round(1/dt)}fps`,0,16)
        draw.fillText(`(${Math.round(mx)}, ${Math.round(my)})`,0,40)
    }

    draw.fillStyle = "yellow"
    draw.fillRect(mx,my,4,4)

    downEntity = {mousePriority: Infinity}
    if (mdown) {
        for (let entity of _hoveredEntities) {
            if (entity.mousePriority < downEntity.mousePriority) downEntity = entity
        }
    }

    _time = a
    timeElapsed += dt
    requestAnimationFrame(_tick)
}

//#endregion Engine

//#region Engine Config
const debug = true
const clearConsolePerTick = false
World.color = "rgb(26,4,49)"
const CollisionLayers = Object.freeze({
    LIGAND: 0,
    RECEPTOR: 1,
})
//#endregion
