"use strict";

// BASE

//#region Initial Setup
console.clear()

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
draw.fillStyle = "purple"
draw.fillRect(0,0,width,height)
//#endregion Initial Setup

//#region Engine
let dt = 0

class Entity {
    constructor() {
        this.x = 100
        this.y = 100

        this.collisions = false
        this.physicsWidth = 100
        this.physicsHeight = 100
        this.personalLayers = []
        this.collisionLayers = []
        this.vx = 0
        this.vy = 0

        this.hasMouseCollision = false
        this.mouseWidth = 100
        this.mouseHeight = 100
        this.mousePriority = 0
        this.hovered = false
        this.mouseDown = false
    }
    _tick() {
        this._draw()
        this.x += this.vx * dt
        this.y += this.vy * dt

        if (this.hasMouseCollision) {
            this.hovered = (this.x < mx && mx < this.x + this.mouseWidth) && (this.y < my && my < this.y + this.mouseHeight)
            if (this.hovered && !_hoveredEntities.includes(this)) _hoveredEntities.push(this)
            else if (!this.hovered && _hoveredEntities.includes(this)) _hoveredEntities.splice(_hoveredEntities.indexOf(this), 1)
            this.mouseDown = this === downEntity
        }

        if (debug) {
            this._debugDraw()
        }
    }
    _draw() {

    }
    _debugDraw() {
        if (this.collisions) {
            draw.lineWidth = "1"
            draw.strokeStyle = draw.fillStyle = "yellow"
            draw.font = "16px Arial"
            draw.strokeRect(this.x, this.y, this.physicsWidth, this.physicsHeight)
            draw.fillText(`Layers${this.personalLayers}, ${this.collisionLayers}`, this.x, this.y)

            draw.beginPath();
            draw.moveTo(this.x + this.physicsWidth / 2, this.y + this.physicsHeight / 2);
            draw.lineTo(this.x + this.physicsWidth / 2 + this.vx, this.y + this.physicsHeight / 2 + this.vy);
            draw.stroke();

            if (this.hasMouseCollision) {
                if (this.hovered) {
                    draw.lineWidth = "4"
                    draw.strokeStyle = draw.fillStyle = "green"
                    draw.strokeRect(this.x + 4, this.y + 4, this.physicsWidth - 8, this.physicsHeight - 8)
                }
                if (this.mouseDown) {
                    draw.strokeStyle = draw.fillStyle = "blue"
                    draw.strokeRect(this.x + 8, this.y + 8, this.physicsWidth - 16, this.physicsHeight - 16)
                }
            }
        }
    }
}

/* Holds multiple entities together as one */
class Group extends Entity {
    constructor() {
        super()
        this.entities = []
        this.mode = Group.MovementMode.CARTESIAN
    }
    _tick() {
        super._tick()
        for (let e of this.entities) {
            e.x += this.vx * dt
            e.y += this.vy * dt
            e._tick()
        }
    }
    addChild(e) {
        this.entities.push(e)
    }

    static MovementMode = {
        CARTESIAN: 0,
        POLAR: 1,
    }
}

class Sprite extends Entity {
    constructor() {
        super()
        this.r = 0
        this.vr = 0.5
        this.scaleX = 1
        this.scaleY = 1

        this.drawCanvas = new OffscreenCanvas(this.physicsWidth, this.physicsHeight)
        this.drawCtx = this.drawCanvas.getContext("2d")
    }
    _tick() {
        super._tick()
        this.r += this.vr * dt
    }
    _draw() {
        super._draw()
        draw.save()
        draw.translate(this.x + this.physicsWidth / 2, this.y + this.physicsHeight / 2);
        draw.rotate(this.r)
        draw.drawImage(
            this.drawCanvas,
            -this.physicsWidth / 2 * this.scaleX,
            -this.physicsHeight / 2 * this.scaleY,
            this.scaleX * this.physicsWidth,
            this.scaleY * this.physicsHeight
        )
        draw.restore()
    }

    static Shape = {
        RECT: 0,
        ELLIPSE: 1,
        CUSTOM: 2,
        IMAGE: 3,
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
    /** Sets a complex canvas **/
    setComplex(callback) {
        this.drawCanvas = new OffscreenCanvas(this.physicsWidth, this.physicsHeight)
        this.drawCtx = this.drawCanvas.getContext("2d")
        callback(this.drawCtx, this.physicsWidth, this.physicsHeight)
    }
}

class UIElement extends Sprite {
    constructor() {
        super();
        this.hasMouseCollision = true
    }
}

class Particle extends Group {
    constructor() {
        super();
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

    draw.fillStyle = World.color
    draw.fillRect(0,0,width,height)
    World._tick()

    testEntity.vx = 80 * Math.sin(timeElapsed * 0.5)
    testEntity.vy = 80 * Math.cos(timeElapsed * 0.5)

    if (debug) {
        draw.font = "16px Arial"
        draw.fillStyle = "yellow"
        draw.fillText(`${Math.round(1/dt)}fps`,0,16)
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
requestAnimationFrame(_tick)

//#endregion Engine

//#region Engine Config
const debug = true
World.color = "purple"
const CollisionLayers = Object.freeze({
    LIGAND: 0,
    RECEPTOR: 1,
})
//#endregion

let testEntity = new Sprite()
testEntity.setTriangle("red")
testEntity.collisions = true
testEntity.hasMouseCollision = true
console.log(testEntity)
World.addChild(testEntity)