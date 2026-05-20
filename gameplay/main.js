"use strict";

/*
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
*/

/*
let x = World.addChild(new Sprite(Sprite.DrawType.RECT, "red"), 100, height/2 - 50)
x.collisions = true
x.collisionLayers = [0, 1]
x.addCallback(Entity.Callbacks.TICK, () => {
    x.x = mx
    x.y = my
})

let receptor = World.addChild(new Sprite(Sprite.DrawType.RECT, "white"), width / 2 - 100, height/2 - 50)
receptor.collisions = true
receptor.personalLayers = [0]

let receptor2 = World.addChild(new Sprite(Sprite.DrawType.CIRCLE, "white"), width / 2 + 60, height/2 - 80)
receptor2.collisions = true
receptor2.personalLayers = [1]
 */

let Phases = Object.freeze({
    MAIN_MENU: 0,
    GAMEPLAY: 1,
    DEAD: 2,
})
let level = 1
let gamePhase = Phases.MAIN_MENU
let phaseDetails = {}

/*
Energy: constantly goes down at a slow pace
Oxygen: constantly goes up.
Waste: constantly goes up.
pH: Stays constant and is modified by other actions
Disease: Occasionally pops up and then increases exponentially. Increases rate of energy consumption.
Temperature: Swings either down or up randomly

Actions:
Cellular Respiration - Creates energy, consumes oxygen, decreases pH
Exocytosis - Uses energy, reduces waste, increases pH (in reality, this usually decreases pH)
Release antibodies - uses energy, increases waste
Active Ion Transport - uses energy, increases pH
Burn energy - uses energy, increases temperature
 */
let cell = {
    "energy": {
        "name": "ATP",
        "delta": -0.04,
        "value": 1,
        "cap": [0,1],
        "safe": [0.1,Infinity],
        "tooMuch": "",
        "tooLittle": "You ran out of energy!"
    },
    "oxygen": {
        "name": "O₂",
        "delta": 0.3,
        "value": 1,
        "cap": [0,1],
        "safe": [-Infinity,Infinity],
        "tooMuch": "",
        "tooLittle": ""
    },
    "waste": {
        "name": "Waste",
        "delta": 0.1,
        "value": 0,
        "cap": [0,1],
        "safe": [-Infinity,0.9],
        "tooMuch": "There was too many waste products in the cell", // todo: should this be was or were
        "tooLittle": ""
    },
    "ph": {
        "name": "pH",
        "delta": 0,
        "value": 7.2,
        "cap": [0,14],
        "safe": [6.6,7.8], // 7.0 to 7.4 is normal for mammalian cytoplasm
        "tooMuch": "Your pH got too high and your proteins denatured",
        "tooLittle": "Your pH got too low and your proteins denatured"
    },
    "disease": {
        "name": "Disease",
        "delta": 0,
        "value": 0,
        "cap": [0,1],
        "safe": [0,1],
        "tooMuch": "You were killed by disease",
        "tooLittle": ""
    },
    "temperature": {
        "name": "Temperature",
        "delta": -0.25,
        "value": 37,
        "cap": [30,50],
        "safe": [34,40], // 34-40c is normal for mammals.
        "tooMuch": "You got too hot and your proteins denatured",
        "tooLittle": "You got too cold and died"
    }
}

let mainMenu = World.addChild(new Group())
{
    mainMenu.addChild(new Sprite(Sprite.DrawType.TEXT_LARGE, "bio game", undefined, 400, 50)).setPosition((width - 400)/2, 170)

    function levelButton(num) {
        let level = mainMenu.addChild(new UIElement(UIElement.Type.PRESS_BUTTON, `Level ${num}`, 500, 50, () => {
            loadLevel(num)
        }))
        level.setPosition((width - level.width) / 2, 200 + 70 * num)
    }
    levelButton(1)
    levelButton(2)
    levelButton(3)
    levelButton(4)
}
let gameplay = World.addChild(new Group())
{
    var gameplayTick = function() {
        for (let attr of Object.keys(cell)) {
            cell[attr]["value"] = Math.max(cell[attr]["cap"][0], Math.min(cell[attr]["cap"][1], cell[attr]["value"] + cell[attr]["delta"] * dt))
            if (cell[attr]["safe"][1] < cell[attr]["value"]) {
                cellDeath(cell[attr]["tooMuch"])
                return
            }
            if (cell[attr]["safe"][0] > cell[attr]["value"]) {
                cellDeath(cell[attr]["tooLittle"])
                return
            }
        }
    }
}
let deathScreen = World.addChild(new Group())
{
    let text = deathScreen.addChild(new Sprite(Sprite.DrawType.TEXT_LARGE, "You died!", "white", 500, 200))
    text.setPosition(width/2-250,height/2-150)
    let deathReasonText = deathScreen.addChild(new Sprite())
    deathReasonText.setSize(width,100)
    deathReasonText.setPosition(0,height/2-50)

    let tryAgain = deathScreen.addChild(new UIElement(UIElement.Type.PRESS_BUTTON, "Try again", 150, 60, () => {
        loadLevel(level)
    }))
    tryAgain.setPosition(width/2 - 160, height/2 + 30)

    let backToMenu = deathScreen.addChild(new UIElement(UIElement.Type.PRESS_BUTTON, "Menu", 150, 60, () => {
        gamePhase = Phases.MAIN_MENU
        console.log("test")
    }))
    backToMenu.addCallback(Entity.Callbacks.TICK, (e) => {
        console.log(e.hovered, e.mouseDown, mdown)
    })
    backToMenu.setPosition(width/2 + 10, height/2 + 30)

    var cellDeath = function(reason) {
        deathReasonText.setTextMedium(reason, "red")
        gamePhase = Phases.DEAD
    }
}

World.addCallback(Entity.Callbacks.TICK, () => {
    mainMenu.disabled = !(gamePhase === Phases.MAIN_MENU)
    gameplay.disabled = !(gamePhase === Phases.GAMEPLAY)
    deathScreen.disabled = !(gamePhase === Phases.DEAD)
    if (gamePhase === Phases.GAMEPLAY) { // Gameplay
        gameplayTick()
    }
})

function loadLevel(num) {
    level = num
    gamePhase = Phases.GAMEPLAY
}