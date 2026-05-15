let testEntity = new Sprite()
testEntity.setImage("ligandtest.png")
testEntity.collisions = true
testEntity.hasMouseCollision = true
testEntity.addCallback(Entity.Callbacks.TICK, (e) => {
    if (e.mouseDown) {
        mdown = false
        console.log('clicked')
        World.addChild(new Particle(`hsl(${Math.random() * 360}deg, 90%, 50%)`, Math.random() * width, Math.random() * height, 90))
    }
})
testEntity.y = 300
World.addChild(testEntity)

let curveFollower = new Sprite()
curveFollower.setTriangle("blue")
curveFollower.name = "triangle"
let curve = new Bezier(50, 700, 700, 200, 400, 10)
curveFollower.addCallback(Entity.Callbacks.TICK, (e) => {
    e.x = curve.x((timeElapsed/5) % 1) - e.width / 2
    e.y = curve.y((timeElapsed/5) % 1) - e.height / 2
    curve.draw()
})
World.addChild(curveFollower)

let curveFollower2 = new Sprite()
curveFollower2.setTriangle("blue")
curveFollower2.name = "triangle"
let curve2 = new Bezier(50, 700, 700, 200, 900, 700)
curveFollower2.addCallback(Entity.Callbacks.TICK, (e) => {
    e.x = curve2.x((timeElapsed/5) % 1) - e.width / 2
    e.y = curve2.y((timeElapsed/5) % 1) - e.height / 2
    curve2.draw()
})
World.addChild(curveFollower2)

let el = World.addChild(new UIElement(UIElement.Type.PRESS_BUTTON, "test text", 200, 50))
el.x = 500
el.y = 500

let text = World.addChild(new Sprite(Sprite.DrawType.ELLIPSE, "blue"))
text.collisions = true
text.width = 400
text.height = 400
text.x = 600
