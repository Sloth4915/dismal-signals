"use strict";

const Phases = Object.freeze({
    MAIN_MENU: 0,
    GAMEPLAY: 1,
    DEAD: 2,
})
let level = 1
let gamePhase = Phases.MAIN_MENU
let phaseDetails = {}

const TargetLocation = Object.freeze({
    AUTOCRINE: 0,
    PARACRINE: 1,
    ENDOCRINE: 2,
})

let levels = {
    1: {
        playtime: 40,
        ligands: 200,
        attributes: {
            "energy": {
                "name": "ATP",
                "delta": -0.04,
                "value": 1,
                "cap": [0,1],
                "safe": [0.1,Infinity],
                "tooMuch": "",
                "tooLittle": "You ran out of energy!",
                "icon": "atp",
                "colors": {
                    0: "red",
                    0.1: "red",
                    0.3: "yellow",
                    1: "green"
                }
            },
            "glucose": {
                "name": "Glucose",
                "delta": 0,
                "value": 1,
                "cap": [0,1],
                "safe": [-Infinity,Infinity],
                "tooMuch": "",
                "tooLittle": "",
                "icon": "glucose",
                "colors": {
                    0: "yellow",
                    1: "green"
                }
            },
            "oxygen": {
                "name": "O₂",
                "delta": 0.3,
                "value": 1,
                "cap": [0,1],
                "safe": [-Infinity,Infinity],
                "tooMuch": "",
                "tooLittle": "",
                "icon": "o2",
                "colors": {
                    0: "yellow",
                    1: "green"
                }
            },
        },
        actions: {
            "cr": {
                "name": "Cellular Respiration",
                "ligand": 1,
                "target": TargetLocation.AUTOCRINE,
                "color": "",
                "rate": 30,
            },
            "hunger": {
                "name": "Send Hunger Signal",
                "ligand": 2,
                "target": TargetLocation.ENDOCRINE,
                "color": 200,
                "rate": 5,
            }
        },
        receptors: {
            "respiration": {
                "ligand": [1],
                "location": TargetLocation.AUTOCRINE,
                "color": 20,
                "receptorStrength": 1,
            },
            "hunger": {
                "ligand": [2],
                "location": TargetLocation.ENDOCRINE,
                "color": 200,
                "receptorStrength": 1,
            }
        }
    }
}

/*
Energy: constantly goes down at a slow pace
Glucose: Stays constant, modified by other actions.
Oxygen: constantly goes up.
Waste: constantly goes up.
pH: Stays constant and is modified by other actions
Disease: Occasionally pops up and then increases exponentially. Increases rate of energy consumption.
Temperature: Swings either down or up randomly

Autocrine Actions:
Cellular Respiration - Creates energy, consumes oxygen, decreases pH
Exocytosis - Uses energy, reduces waste, increases pH (in reality, this usually decreases pH)
Release antibodies - uses energy, increases waste
Active Ion Transport - uses energy, increases pH
Burn energy - uses energy, increases temperature

Paracrine Actions:
Warn of disease - Warns other cells of disease but uses a lot of energy.

Endocrine Actions:
Hunger - Makes organism hungry and will cause delayed increase in glucose.

Juxtacrine Actions: n/a
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
    "glucose": {
        "name": "Glucose",
        "delta": 0,
        "value": 1,
        "cap": [0,1],
        "safe": [-Infinity,Infinity],
        "tooMuch": "",
        "tooLittle": ""
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
        "tooMuch": "There was too many waste products in the cell", // todo: should this be was or were?
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
    mainMenu.addChild(new Sprite(Sprite.DrawType.TEXT_LARGE, GAME_NAME, undefined, 400, 50)).setPosition((width)/2, 170)

    function levelButton(num) {
        let level = mainMenu.addChild(new UIElement(UIElement.Type.PRESS_BUTTON, `Level ${num}`, 300, 50, () => {
            loadLevel(num)
        }))
        level.setPosition((width - level.width) / 2 + 200, 200 + 70 * num)
        return level
    }
    levelButton(1)
    levelButton(2).disableAction = true
    levelButton(3).disableAction = true
    levelButton(4).disableAction = true

    let instructions = mainMenu.addChild(new Sprite())
    instructions.setPosAndSize(100,200,400, 400)
    instructions.setTextSmallWrap(`
In this game, you are a cell trying to maintain homeostasis. You do this by sending out signals.
Each signal may have positive effects on some metric and negative effects on others.
The actions may not be perfectly accurate to real life, but the idea is to give you a better idea of cell signalling.
As in real life, you have limited resources and must manage them carefully. 
To represent limited resources here, you may only send out some amount of ligands (signals) per level. Play conservatively to balance it all.
Each level builds upon the previous ones by adding more for you to keep track of.
Some receptors may respond to multiple ligands. Signals that help with one attribute may hurt another.
   `.trim())
    instructions.hasMouseCollision = true
    instructions.collisions = false
}
let gameplay = World.addChild(new Group())
{
    let dialHeight = 190
    let dialWidth = 60
    let dialGap = 10
    let receptorSize = 50
    let receptorPadding = 20
    let ligandSize = 20
    let ligandMinSpeedMultiplier = 0.2
    let ligandMaxSpeedMultiplier = 0.4

    var loadLevel = function(num) {
        level = num
        World.removeChild(gameplay)
        gameplay = World.addChild(new Group())
        console.log('loading ' + num, levels[num])

        let cells = new AnimatedSprite(width, height, ["bg/sprite_0", "bg/sprite_1", "bg/sprite_2", "bg/sprite_3"])
        cells.fps = 2
        gameplay.addChild(cells).setPosition(0,0)

        let blood = new AnimatedSprite(width, height, ["bg_blood/00", "bg_blood/01", "bg_blood/02", "bg_blood/03", "bg_blood/04", "bg_blood/05", "bg_blood/06", "bg_blood/07", "bg_blood/08", "bg_blood/09", "bg_blood/10", "bg_blood/11"])
        blood.fps = 40
        blood.opacity = 0.25
        gameplay.addChild(blood).setPosition(0,0)

        let levelDetails = structuredClone(levels[num])

        phaseDetails["playtime"] = levelDetails["playtime"]
        phaseDetails["ligands"] = levelDetails["ligands"]
        cell = levelDetails["attributes"]
        phaseDetails["actions"] = levelDetails["actions"]

        let takenLocationsForReceptors = []
        let receptorLocations = {}
        for (let receptorName of Object.keys(levelDetails["receptors"])) {
            let receptor = levelDetails["receptors"][receptorName]
            let entity = new Sprite(Sprite.DrawType.IMAGE, `receptor/${receptor.ligand[0]}`, receptor.color, receptorSize, receptorSize)
            gameplay.addChild(entity)
            entity.collisions = true
            entity.collisionLayers = receptor.ligand
            let x
            let y
            let w = receptorSize
            let h = receptorSize
            if (receptor.location === TargetLocation.AUTOCRINE) {
                do {
                    x = Math.random() * 550 + 40
                    y = Math.random() * 200 + 400
                    if (x < 240) y = Math.random() * 70 + 420
                } while (isReceptorLocationTaken(x,y))
                entity.r = Math.random() * Math.PI * 2
            } else if (receptor.location === TargetLocation.PARACRINE) {
                do {
                    x = 650 + Math.random() * 40
                    y = 380 + Math.random() * 400
                } while (isReceptorLocationTaken(x,y))
                entity.r = Math.random() * 0.3 - (Math.PI / 2) - 0.15
            } else if (receptor.location === TargetLocation.ENDOCRINE) {
                x = width+2
                y = 100
                w = 300
                h = 400
            }
            entity.setPosAndSize(x,y,w,h)
            takenLocationsForReceptors.push([x,y])
            for (let ligand of receptor.ligand) {
                if (typeof receptorLocations[ligand] === "undefined") receptorLocations[ligand] = []
                for (let i = 0; i < receptor.receptorStrength; i++) {
                    receptorLocations[ligand].push([x + w / 2, y + h / 2, receptor.location])
                }
            }
        }

        function isReceptorLocationTaken(x,y) {
            for (let location of takenLocationsForReceptors) {
                if (Math.sqrt(Math.pow(x-location[0],2)+Math.pow(y-location[1],2)) < receptorSize + receptorPadding) {
                    return true
                }
            }
            return false
        }

        let actions = phaseDetails["actions"]
        let i = 0
        for (let id of Object.keys(actions)) {
            let action = actions[id]
            let button = new UIElement(UIElement.Type.HOLD_BUTTON, action.name, 300, 75, () => {
                if (phaseDetails.ligands > 0) {
                    let particle = gameplay.addChild(new Sprite(Sprite.DrawType.IMAGE, `ligand/${action.ligand}`, action.color, ligandSize, ligandSize))
                    particle.r = Math.random() * Math.PI * 2
                    particle.vr = Math.random()
                    particle.setPos(210, 720)

                    let target = receptorLocations[action.ligand][Math.floor(Math.random() * receptorLocations[action.ligand].length)]

                    let points = [[210, 720]]

                    if (target[2] === TargetLocation.AUTOCRINE) {
                        points.push([Math.random() * 600, Math.random() * 380 + 400])
                        points.push([Math.random() * 600, Math.random() * 380 + 400])
                    }
                    else if (target[2] === TargetLocation.PARACRINE) { // Same as autocrine
                        points.push([Math.random() * 600, Math.random() * 380 + 400])
                        points.push([Math.random() * 600, Math.random() * 380 + 400])
                    }
                    else if (target[2] === TargetLocation.ENDOCRINE) {
                        points.push([Math.random() * 400,Math.random() * 300])
                    }
                    points.push(target)

                    let curve = new Bezier2d(points)

                    let t = 0
                    let speed = ligandMinSpeedMultiplier + (Math.random() * (ligandMaxSpeedMultiplier - ligandMinSpeedMultiplier))
                    particle.addCallback(Entity.Callbacks.TICK, () => {
                        t = Math.min(t + dt * speed, 1)
                        curve.draw()
                        particle.setPos(curve.x(t) - ligandSize / 2, curve.y(t) - ligandSize / 2)
                    })

                    phaseDetails.ligands -= 1
                }
            })
            button.rate = action.rate
            gameplay.addChild(button)
            button.x = width - 300
            button.y = i * 80

            i++
        }

        let attrs = cell
        i = 0;
        for (let attrId of Object.keys(attrs)) {
            let attr = attrs[attrId]

            let gradient = new Sprite(Sprite.DrawType.GRADIENT, attr["colors"], null, dialWidth, dialHeight)
            gameplay.addChild(gradient)
            gradient.r = Math.PI
            gradient.setPosition(i * (dialWidth + dialGap), height - dialHeight)

            let icon = new Sprite(Sprite.DrawType.IMAGE, attr["icon"], null, dialWidth, dialWidth)
            gameplay.addChild(icon)
            icon.setPosition(i * (dialWidth + dialGap), height - dialHeight - dialWidth)

            let indicator = cell[attrId]["indicator"] = new Sprite(Sprite.DrawType.RECT, "black", 4, dialWidth, 10)
            let indicator2 = cell[attrId]["indicator2"] = new Sprite(Sprite.DrawType.RECT, "yellow", 4, dialWidth, 6)
            gameplay.addChild(indicator)
            gameplay.addChild(indicator2)
            indicator.x = indicator2.x = i * (dialWidth + dialGap)

            i++
        }

        gameplay.addChild(new NineSlice("standard")).setBounds(i * (dialWidth + dialGap), height - 75, i * (dialWidth + dialGap) + 250, height)
        phaseDetails["ligandsText"] = new Sprite()
        gameplay.addChild(phaseDetails["ligandsText"]).setBounds(i * (dialWidth + dialGap), height - 75, i * (dialWidth + dialGap) + 250, height)

        gamePhase = Phases.GAMEPLAY
    }

    function calculateIndicatorY(attr) {
        let y = height - dialHeight * (attr.value - attr.cap[0]) / (attr.cap[1] - attr.cap[0])
        return y
    }

    var gameplayTick = function() {
        phaseDetails["playtime"] -= dt
        if (phaseDetails["playtime"] < 0) console.log("win! yippee")

        for (let attr of Object.keys(cell)) {
            cell[attr]["value"] = Math.max(cell[attr]["cap"][0], Math.min(cell[attr]["cap"][1], cell[attr]["value"] + cell[attr]["delta"] * dt))
            if (cell[attr]["safe"][1] < cell[attr]["value"]) {
                cellDeath(cell[attr]["tooMuch"], attr)
                return
            }
            if (cell[attr]["safe"][0] > cell[attr]["value"]) {
                cellDeath(cell[attr]["tooLittle"], attr)
                return
            }
            cell[attr]["indicator"].y = calculateIndicatorY(cell[attr])
            cell[attr]["indicator2"].y = calculateIndicatorY(cell[attr]) + 2
        }

        phaseDetails["ligandsText"].setTextMedium(`${phaseDetails.ligands} ligands left`)
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
    }))
    backToMenu.setPosition(width/2 + 10, height/2 + 30)

    var cellDeath = function(reason, attr) {
        console.warn("Died due to ", reason, attr)
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

loadLevel(1)
