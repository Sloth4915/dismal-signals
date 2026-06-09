const Phases = Object.freeze({
    MAIN_MENU: 0,
    GAMEPLAY: 1,
    DEAD: 2,
    VICTORY: 3,
})
let level = 1
let gamePhase = Phases.MAIN_MENU
let phaseDetails = {}

class CellularResponse {
    constructor() {
        this.responses = {"type":"block","do": []}
        this.addingTo = [this.responses]
    }

    /**
     * All comparisons are kinda loose. Must be greater or less by a threshold of 0.01.
     * Equality is allowed if within 0.01
     */
    static Comparison = Object.freeze({
        GREATER_THAN: ">",
        LESS_THAN: "<",
        EQUAL_TO: "="
    })

    once() {
        this.addingTo.push({"type": "once", "do": []})
        return this
    }
    withDelay(delay) {
        this.addingTo.push({"type": "delay", "delay": delay, "do": []})
        return this
    }
    persistently(length) {
        this.addingTo.push({"type": "persistently", "length": length, "do": []})
        return this
    }
    checkIf(a, conditional, b) {
        this.addingTo.push({"type": "if", "a": a, "b": b, "conditional": conditional, "do": []})
        return this
    }
    chance(chance) {
        this.addingTo.push({"type": "chance", "chance": chance, "do": []})
        return this
    }
    apply(attr, delta, applyDt = false) {
        this.addingTo[this.addingTo.length-1]["do"].push({
            "type": "apply",
            "attr": attr,
            "delta": delta,
            "applyDt": applyDt,
        })
        return this
    }
    callLevelFunction(func) {
        this.addingTo[this.addingTo.length-1]["do"].push({
            "type": "func",
            "func": func
        })
        return this
    }
    endBlock() {
        this.addingTo[this.addingTo.length - 2]["do"].push(this.addingTo[this.addingTo.length - 1])
        this.addingTo.splice(this.addingTo.length - 1, 1)
        return this
    }

    build() {
        while (this.addingTo.length > 1) {
            this.endBlock()
        }
        return structuredClone(this).responses
    }

    static execute(response) {
        let thingsToRemove = []
        let thingsToAdd = []
        for (let block of response["do"]) {
            if (block.type === "once") {
                thingsToRemove.push(block)
                this.execute(block)
            }
            else if (block.type === "chance") {
                thingsToRemove.push(block)
                if (block.chance > Math.random()) this.execute(block)
            }
            else if (block.type === "persistently") {
                block.length -= dt
                if (block.length < 0) thingsToRemove.push(block)
                this.execute(block)
            }
            else if (block.type === "delay") {
                block.delay -= dt
                if (block.delay < 0) {
                    thingsToRemove.push(block)
                    thingsToAdd.push(...block["do"])
                }
            }
            else if (block.type === "if") {
                let a = block["a"]
                let b = block["b"]
                if (typeof a === "string") a = cell[a]["value"]
                if (typeof b === "string") b = cell[b]["value"]
                if (block.conditional === CellularResponse.Comparison.GREATER_THAN) {
                    if (a - 0.01 > b) {
                        this.execute(block)
                    }
                }
                else if (block.conditional === CellularResponse.Comparison.LESS_THAN) {
                    if (a + 0.01 < b) {
                        this.execute(block)
                    }
                }
                if (block.conditional === CellularResponse.Comparison.EQUAL_TO) {
                    if (Math.abs(a - b) < 0.01) {
                        this.execute(block)
                    }
                }
            }
            else if (block.type === "apply") {
                cell[block.attr]["value"] = Math.min(Math.max(cell[block.attr]["value"] + block.delta * (block.applyDt ? dt : 1), cell[block.attr]["cap"][0]), cell[block.attr]["cap"][1])
            }
            else if (block.type === "func") {
                levelFunctions[level][block.func].call()
            }
            else {
                console.log(`${block.type} not implemented`, block)
            }
        }
        for (let i of thingsToRemove) {
            response["do"].splice(response["do"].indexOf(i), 1)
        }
        for (let i of thingsToAdd) {
            response["do"].push(i)
        }
    }
}

const TargetLocation = Object.freeze({
    AUTOCRINE: 0,
    PARACRINE: 1,
    ENDOCRINE: 2,
})

const AttributeChangeTypes = Object.freeze({
    CHANGE_AT_TIME: 0,
    GROWTH: 1,
})

const levelFunctions = {
    4: {
        "paracrineDiseaseHelp": function() {
            spawnLigand({
                "name": "Signal",
                "ligand": 6,
                "target": TargetLocation.AUTOCRINE,
                "color": 250,
                "rate": 20,
            }, [1000, 650])
        },
        "endocrineDiseaseHelp": function() {
            spawnLigand({
                "name": "Signal",
                "ligand": 6,
                "target": TargetLocation.AUTOCRINE,
                "color": 250,
                "rate": 20,
            }, [-100, 0])
        }
    },
    5: {
        "paracrineDiseaseHelp": function() {
            spawnLigand({
                "name": "Signal",
                "ligand": 6,
                "target": TargetLocation.AUTOCRINE,
                "color": 250,
                "rate": 20,
            }, [1000, 650])
        },
        "endocrineDiseaseHelp": function() {
            spawnLigand({
                "name": "Signal",
                "ligand": 6,
                "target": TargetLocation.AUTOCRINE,
                "color": 250,
                "rate": 20,
            }, [-100, 0])
        }
    }
}

let levels = {
    1: {
        playtime: 45,
        ligands: 200,
        attributes: {
            "energy": {
                "name": "ATP",
                "delta": -0.0525,
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
                "name": "Hunger",
                "ligand": 2,
                "target": TargetLocation.ENDOCRINE,
                "color": 200,
                "rate": 6,
            }
        },
        receptors: {
            "respiration": {
                "ligand": [1],
                "location": TargetLocation.AUTOCRINE,
                "color": 20,
                "receptorStrength": 1,
                "response": new CellularResponse().once().apply("glucose", -0.02).endBlock()
                            .persistently(0.5).checkIf("glucose", CellularResponse.Comparison.GREATER_THAN, 0).checkIf("oxygen", CellularResponse.Comparison.GREATER_THAN, 0).apply("oxygen", -0.09, true).apply("energy", 0.07, true)
                            .build()
            },
            "hunger": {
                "ligand": [2],
                "location": TargetLocation.ENDOCRINE,
                "color": 200,
                "receptorStrength": 1,
                "response": new CellularResponse().withDelay(1).persistently(0.5).apply("glucose", 0.1, true).build()
            }
        }
    },
    2: {
        playtime: 60,
        ligands: 250,
        attributes: {
            "energy": {
                "name": "ATP",
                "delta": -0.0525,
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
            "waste": {
                "name": "Waste",
                "delta": 0.032,
                "value": 0,
                "cap": [0,1],
                "safe": [0,0.95],
                "tooMuch": "You filled with waste products",
                "tooLittle": "",
                "icon": "waste",
                "colors": {
                    0: "green",
                    1: "brown"
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
                "name": "Hunger",
                "ligand": 2,
                "target": TargetLocation.ENDOCRINE,
                "color": 200,
                "rate": 5,
            },
            "exocytosis": {
                "name": "Exocytosis",
                "ligand": 3,
                "target": TargetLocation.AUTOCRINE,
                "color": 100,
                "rate": 3,
            },
        },
        receptors: {
            "respiration": {
                "ligand": [1],
                "location": TargetLocation.AUTOCRINE,
                "color": 20,
                "receptorStrength": 1,
                "response": new CellularResponse().once().apply("glucose", -0.02).endBlock()
                    .persistently(0.5).checkIf("glucose", CellularResponse.Comparison.GREATER_THAN, 0).checkIf("oxygen", CellularResponse.Comparison.GREATER_THAN, 0).apply("oxygen", -0.09, true).apply("energy", 0.07, true)
                    .build()
            },
            "exocytosis": {
                "ligand": [3],
                "location": TargetLocation.AUTOCRINE,
                "color": 100,
                "receptorStrength": 1,
                "response": new CellularResponse().withDelay(1).once()
                    .checkIf("energy", CellularResponse.Comparison.GREATER_THAN, 0.1)
                    .apply("energy", -0.05).apply("waste", -0.1)
                    .build()
            },
            "hunger": {
                "ligand": [2],
                "location": TargetLocation.ENDOCRINE,
                "color": 200,
                "receptorStrength": 1,
                "response": new CellularResponse().withDelay(1).persistently(0.5).apply("glucose", 0.1, true).build()
            }
        }
    },
    3: {
        playtime: 75,
        ligands: 400,
        attributes: {
            "energy": {
                "name": "ATP",
                "delta": -0.035,
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
            "waste": {
                "name": "Waste",
                "delta": 0.018,
                "value": 0,
                "cap": [0,1],
                "safe": [0,0.95],
                "tooMuch": "You filled with waste products",
                "tooLittle": "",
                "icon": "waste",
                "colors": {
                    0: "green",
                    1: "brown"
                }
            },
            "disease": {
                "name": "disease",
                "delta": [{type:AttributeChangeTypes.GROWTH, rate: 0.11},
                    {type:AttributeChangeTypes.CHANGE_AT_TIME, time: 64, delta: 0.1},
                    {type:AttributeChangeTypes.CHANGE_AT_TIME, time: 30, delta: 0.1}],
                "value": 0,
                "cap": [0,1],
                "safe": [0,0.95],
                "tooMuch": "You were overwhelmed with disease",
                "tooLittle": "",
                "icon": "disease",
                "colors": {
                    0: "green",
                    0.1: "yellow",
                    0.4: "red",
                    1: "rgb(98,2,2)"
                },
                "cost": {
                    "energy": -0.01
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
                "name": "Hunger",
                "ligand": 2,
                "target": TargetLocation.ENDOCRINE,
                "color": 200,
                "rate": 5,
            },
            "exocytosis": {
                "name": "Exocytosis",
                "ligand": 3,
                "target": TargetLocation.AUTOCRINE,
                "color": 100,
                "rate": 3,
            },
            "antibodies": {
                "name": "Antibodies",
                "ligand": 4,
                "target": TargetLocation.AUTOCRINE,
                "color": 300,
                "rate": 20,
            },
        },
        receptors: {
            "respiration": {
                "ligand": [1],
                "location": TargetLocation.AUTOCRINE,
                "color": 20,
                "receptorStrength": 1,
                "response": new CellularResponse().once().apply("glucose", -0.02).endBlock()
                    .persistently(0.55).checkIf("glucose", CellularResponse.Comparison.GREATER_THAN, 0).checkIf("oxygen", CellularResponse.Comparison.GREATER_THAN, 0).apply("oxygen", -0.09, true).apply("energy", 0.085, true)
                    .build()
            },
            "exocytosis": {
                "ligand": [3],
                "location": TargetLocation.AUTOCRINE,
                "color": 100,
                "receptorStrength": 1,
                "response": new CellularResponse().withDelay(1).once()
                    .checkIf("energy", CellularResponse.Comparison.GREATER_THAN, 0.1)
                    .apply("energy", -0.05).apply("waste", -0.1)
                    .build()
            },
            "hunger": {
                "ligand": [2],
                "location": TargetLocation.ENDOCRINE,
                "color": 200,
                "receptorStrength": 1,
                "response": new CellularResponse().withDelay(1).persistently(0.7).apply("glucose", 0.12, true).build()
            },
            "antibodies3": {
                "ligand": [4],
                "location": TargetLocation.AUTOCRINE,
                "color": 300,
                "receptorStrength": 3,
                "response": new CellularResponse().persistently(0.4).apply("energy", -0.04, true).apply("waste", 0.04, true).endBlock()
                    .withDelay(0.4).once().apply("disease", -0.05).build()
            }
        }
    },
    4: {
        playtime: 75,
        ligands: 600,
        attributes: {
            "energy": {
                "name": "ATP",
                "delta": -0.035,
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
            "waste": {
                "name": "Waste",
                "delta": 0.018,
                "value": 0,
                "cap": [0,1],
                "safe": [0,0.95],
                "tooMuch": "You filled with waste products",
                "tooLittle": "",
                "icon": "waste",
                "colors": {
                    0: "green",
                    1: "brown"
                }
            },
            "disease": {
                "name": "disease",
                "delta": [{type:AttributeChangeTypes.GROWTH, rate: 0.11},
                    {type:AttributeChangeTypes.CHANGE_AT_TIME, time: 60, delta: 0.1},
                    {type:AttributeChangeTypes.CHANGE_AT_TIME, time: 28, delta: 0.1}],
                "value": 0,
                "cap": [0,1],
                "safe": [0,0.95],
                "tooMuch": "You were overwhelmed with disease",
                "tooLittle": "",
                "icon": "disease",
                "colors": {
                    0: "green",
                    0.1: "yellow",
                    0.4: "red",
                    1: "rgb(98,2,2)"
                },
            },
        },
        actions: {
            "hunger": {
                "name": "Hunger",
                "ligand": 2,
                "target": TargetLocation.ENDOCRINE,
                "color": 200,
                "rate": 5,
            },
            "generic": {
                "name": "Stress",
                "ligand": 5,
                "target": TargetLocation.AUTOCRINE,
                "color": 60,
                "rate": 20,
                "cost": {
                    "energy": -0.02
                }
            },
            "antibodies": {
                "name": "Antibodies",
                "ligand": 4,
                "target": TargetLocation.AUTOCRINE,
                "color": 300,
                "rate": 20,
                "cost": {
                    "energy": -0.01
                }
            },
            "exocytosis": {
                "name": "Exocytosis",
                "ligand": 3,
                "target": TargetLocation.AUTOCRINE,
                "color": 100,
                "rate": 3,
            },
            "cr": {
                "name": "Cellular Respiration",
                "ligand": 1,
                "target": TargetLocation.AUTOCRINE,
                "color": "",
                "rate": 30,
            },
        },
        receptors: {
            "respiration": {
                "ligand": [1],
                "location": TargetLocation.AUTOCRINE,
                "color": 20,
                "receptorStrength": 1,
                "response": new CellularResponse().once().apply("glucose", -0.02).endBlock()
                    .persistently(0.55).checkIf("glucose", CellularResponse.Comparison.GREATER_THAN, 0).checkIf("oxygen", CellularResponse.Comparison.GREATER_THAN, 0).apply("oxygen", -0.09, true).apply("energy", 0.085, true)
                    .build()
            },
            "exocytosis": {
                "ligand": [3],
                "location": TargetLocation.AUTOCRINE,
                "color": 100,
                "receptorStrength": 1,
                "response": new CellularResponse().withDelay(1).once()
                    .checkIf("energy", CellularResponse.Comparison.GREATER_THAN, 0.1)
                    .apply("energy", -0.05).apply("waste", -0.1)
                    .build()
            },
            "hunger": {
                "ligand": [2],
                "location": TargetLocation.ENDOCRINE,
                "color": 200,
                "receptorStrength": 1,
                "response": new CellularResponse().withDelay(1).persistently(0.7).apply("glucose", 0.12, true).build()
            },
            "antibodies": {
                "ligand": [5],
                "location": TargetLocation.ENDOCRINE,
                "color": 320,
                "receptorStrength": 1,
                "response": new CellularResponse().once().callLevelFunction("endocrineDiseaseHelp").build()
            },
            "antibodies2": {
                "ligand": [5],
                "location": TargetLocation.PARACRINE,
                "color": 320,
                "receptorStrength": 2,
                "response": new CellularResponse().once().callLevelFunction("paracrineDiseaseHelp").build()
            },
            "support": {
                "ligand": [6],
                "location": TargetLocation.AUTOCRINE,
                "color": 250,
                "receptorStrength": 20,
                "response": new CellularResponse().persistently(0.6).apply("energy", 0.13, true).apply("glucose", 0.13, true).apply("oxygen", 0.13, true).endBlock()
                    .once().chance(0.1).apply("disease", 0.05).build()
            },
            "antibodies3": {
                "ligand": [4],
                "location": TargetLocation.AUTOCRINE,
                "color": 300,
                "receptorStrength": 3,
                "response": new CellularResponse().persistently(0.4).apply("energy", -0.04, true).apply("waste", 0.04, true).endBlock()
                    .withDelay(0.4).once().apply("disease", -0.05).build()
            }
        }
    },
    5: {
        playtime: 120,
        ligands: 1000,
        attributes: {
            "energy": {
                "name": "ATP",
                "delta": -0.035,
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
            "waste": {
                "name": "Waste",
                "delta": 0.018,
                "value": 0,
                "cap": [0,1],
                "safe": [0,0.95],
                "tooMuch": "You filled with waste products",
                "tooLittle": "",
                "icon": "waste",
                "colors": {
                    0: "green",
                    1: "brown"
                }
            },
            "disease": {
                "name": "disease",
                "delta": [{type:AttributeChangeTypes.GROWTH, rate: 0.11},
                    {type:AttributeChangeTypes.CHANGE_AT_TIME, time: 98, delta: 0.1},
                    {type:AttributeChangeTypes.CHANGE_AT_TIME, time: 61, delta: 0.1},
                    {type:AttributeChangeTypes.CHANGE_AT_TIME, time: 23, delta: 0.19}],
                "value": 0,
                "cap": [0,1],
                "safe": [0,0.95],
                "tooMuch": "You were overwhelmed with disease",
                "tooLittle": "",
                "icon": "disease",
                "colors": {
                    0: "green",
                    0.1: "yellow",
                    0.4: "red",
                    1: "rgb(98,2,2)"
                },
            },
            "temp": {
                "name": "temperature",
                "delta": [{type:AttributeChangeTypes.GROWTH, rate: -0.01}],
                "value": 0.5,
                "cap": [0,1],
                "safe": [0.1,0.8],
                "tooMuch": "You got too hot",
                "tooLittle": "You froze",
                "icon": "temperature",
                "colors": {
                    0: "rgb(144,159,245)",
                    .7: "pink"
                },
            },
        },
        actions: {
            "hunger": {
                "name": "Hunger",
                "ligand": 2,
                "target": TargetLocation.ENDOCRINE,
                "color": 200,
                "rate": 5,
            },
            "stress": {
                "name": "Stress",
                "ligand": 5,
                "target": TargetLocation.AUTOCRINE,
                "color": 60,
                "rate": 20,
                "cost": {
                    "energy": -0.02,
                    "temp": 0.007
                }
            },
            "antibodies": {
                "name": "Antibodies",
                "ligand": 4,
                "target": TargetLocation.AUTOCRINE,
                "color": 300,
                "rate": 20,
                "cost": {
                    "energy": -0.01
                }
            },
            "exocytosis": {
                "name": "Exocytosis",
                "ligand": 3,
                "target": TargetLocation.AUTOCRINE,
                "color": 100,
                "rate": 3,
            },
            "cr": {
                "name": "Cellular Respiration",
                "ligand": 1,
                "target": TargetLocation.AUTOCRINE,
                "color": "",
                "rate": 30,
            },
        },
        receptors: {
            "respiration": {
                "ligand": [1, 5],
                "location": TargetLocation.AUTOCRINE,
                "color": 20,
                "receptorStrength": 1,
                "response": new CellularResponse().once().apply("glucose", -0.02).endBlock()
                    .persistently(0.55).checkIf("glucose", CellularResponse.Comparison.GREATER_THAN, 0).checkIf("oxygen", CellularResponse.Comparison.GREATER_THAN, 0)
                    .apply("oxygen", -0.09, true).apply("energy", 0.085, true).apply("temp", 0.007, true)
                    .build()
            },
            "exocytosis": {
                "ligand": [3],
                "location": TargetLocation.AUTOCRINE,
                "color": 100,
                "receptorStrength": 1,
                "response": new CellularResponse().withDelay(1).once()
                    .checkIf("energy", CellularResponse.Comparison.GREATER_THAN, 0.1)
                    .apply("energy", -0.05).apply("waste", -0.1)
                    .endBlock().endBlock().withDelay(1).persistently(3).apply("temp", -0.008, true)
                    .build()
            },
            "hunger": {
                "ligand": [2],
                "location": TargetLocation.ENDOCRINE,
                "color": 200,
                "receptorStrength": 1,
                "response": new CellularResponse().withDelay(1).persistently(0.7).apply("glucose", 0.12, true).apply("temp", -0.002, true).build()
            },
            "stress2": {
                "ligand": [5],
                "location": TargetLocation.ENDOCRINE,
                "color": 320,
                "receptorStrength": 4,
                "response": new CellularResponse().once().callLevelFunction("endocrineDiseaseHelp").build()
            },
            "stress1": {
                "ligand": [5],
                "location": TargetLocation.PARACRINE,
                "color": 320,
                "receptorStrength": 6,
                "response": new CellularResponse().once().callLevelFunction("paracrineDiseaseHelp").build()
            },
            "support": {
                "ligand": [6],
                "location": TargetLocation.AUTOCRINE,
                "color": 250,
                "receptorStrength": 20,
                "response": new CellularResponse().persistently(0.6).apply("energy", 0.13, true).apply("glucose", 0.13, true).apply("oxygen", 0.13, true).endBlock()
                    .once().chance(0.1).apply("disease", 0.05).build()
            },
            "antibodies": {
                "ligand": [4],
                "location": TargetLocation.AUTOCRINE,
                "color": 300,
                "receptorStrength": 3,
                "response": new CellularResponse().persistently(0.4).apply("temp", -0.01, true).apply("energy", -0.04, true).apply("waste", 0.04, true).endBlock()
                    .withDelay(0.4).once().apply("disease", -0.05).build()
            }
        }
    },
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
Exocytosis - Uses energy, reduces waste, decrease pH
Release antibodies - uses energy, increases waste
Active Ion Transport - uses energy, increases pH
Burn energy - uses energy, increases temperature

Paracrine Actions:
Warn of disease - Warns other cells of disease but uses a lot of energy.

Endocrine Actions:
Hunger - Makes organism hungry and will cause delayed increase in glucose.

Juxtacrine Actions: n/a
 */

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

    for (let i of Object.keys(levels)) {
        levelButton(i)
    }

    let instructions = mainMenu.addChild(new Sprite())
    instructions.setPosAndSize(100,200,400, 400)
    instructions.setTextSmallWrap(`
In this game, you are a cell trying to maintain homeostasis. You do this by sending out signals.
As in real life, you have limited resources and must manage them carefully. 
To represent limited resources here, you may only send out some amount of ligands (signals) per level. Play conservatively to balance it all.
Each level builds upon the previous ones by adding more for you to keep track of.
Some receptors may respond to multiple ligands. Signals that help with one attribute may hurt another.
Remember that all models are wrong, but some are useful. This model of cells and cell signaling is gamified, and as such loses some biological accuracy.
   `.trim())
    instructions.hasMouseCollision = true
    instructions.collisions = false
}
let gameplay = World.addChild(new Group())
{
    let dialHeight = 140
    let dialWidth = 40
    let dialGap = 10
    let receptorSize = 50
    let receptorPadding = 20
    let ligandSize = 32
    let ligandMinSpeedMultiplier = 0.2
    let ligandMaxSpeedMultiplier = 0.4

    let currentResponses = []

    let receptorLocations = {}

    var loadLevel = function(num) {
        receptorLocations = {}
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

            entity.addCallback(Entity.Callbacks.TICK, () => {
                for (let e of entity.collidingWith) {
                    if (e.parent !== null) { // Sometimes they linger for an extra tick or so
                        e.parent.removeChild(e)
                        currentResponses.push(structuredClone(receptor.response))
                    }
                }
            })
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
        for (let id of shuffle(Object.keys(actions))) {
            let action = actions[id]
            let button = new UIElement(UIElement.Type.HOLD_BUTTON, action.name, 300, 75, () => {
                if (phaseDetails.ligands > 0) {
                    for (let cost of Object.keys(action.cost ?? {})) {
                        cell[cost].value += action.cost[cost]
                    }

                    spawnLigand(action)

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

        gameplay.addChild(new NineSlice("standard")).setBounds(i * (dialWidth + dialGap) + 254, height - 75, i * (dialWidth + dialGap) + 334, height)
        phaseDetails["timeLeftText"] = new Sprite()
        gameplay.addChild(phaseDetails["timeLeftText"]).setBounds(i * (dialWidth + dialGap) + 254, height - 75, i * (dialWidth + dialGap) + 334, height)

        gamePhase = Phases.GAMEPLAY
    }

    function calculateIndicatorY(attr) {
        let y = Math.min(height - dialHeight * (attr.value - attr.cap[0]) / (attr.cap[1] - attr.cap[0]), height - 10)
        return y
    }

    var spawnLigand = function(action, startPt = [210,720]) {
        let particle = gameplay.addChild(new Sprite(Sprite.DrawType.IMAGE, `ligand/${action.ligand}`, action.color, ligandSize, ligandSize))
        particle.r = Math.random() * Math.PI * 2
        particle.vr = Math.random()
        particle.collisions = true
        particle.personalLayers = [action.ligand]

        let target = receptorLocations[action.ligand][Math.floor(Math.random() * receptorLocations[action.ligand].length)]

        let points = [startPt]

        if (target[2] === TargetLocation.AUTOCRINE || target[2] === TargetLocation.PARACRINE) {
            points.push([Math.random() * 600, Math.random() * 440 + 400])
            points.push([Math.random() * 600, Math.random() * 440 + 400])
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
    }

    var gameplayTick = function() {
        phaseDetails["playtime"] -= dt
        if (phaseDetails["playtime"] < 0) {
            updateWinScreen()
            gamePhase = Phases.VICTORY
            return
        }

        let deadResponses = []
        for (let response of currentResponses) {
            CellularResponse.execute(response)
            if (response["do"].length < 0) deadResponses.push(response)
        }
        for (let response of deadResponses) {
            currentResponses.splice(currentResponses.indexOf(response), 1)
        }

        for (let attr of Object.keys(cell)) {
            let change = cell[attr]["delta"]
            if (typeof change === "number") {
                change = [change]
            }
            for (let effect of change) {
                if (typeof effect === "number") {
                    cell[attr]["value"] = Math.max(cell[attr]["cap"][0], Math.min(cell[attr]["cap"][1], cell[attr]["value"] + cell[attr]["delta"] * dt))
                } else {
                    if (effect["type"] === AttributeChangeTypes.CHANGE_AT_TIME) {
                        if (!effect["occurred"] && phaseDetails["playtime"] < effect["time"]) {
                            effect["occurred"] = true
                            cell[attr]["value"] += effect["delta"]
                        }
                    }
                    if (effect["type"] === AttributeChangeTypes.GROWTH) {
                        if (cell[attr]["value"] > 0.05) {
                            cell[attr]["value"] *= 1 + (effect["rate"] * dt)
                        }
                    }
                }
            }
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
        phaseDetails["timeLeftText"].setTextMedium(`${Math.floor(phaseDetails.playtime/60)}:${(Math.floor(phaseDetails.playtime % 60) + "").padStart(2, "0")}`)
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
let victoryScreen = World.addChild(new Group())
{
    let text = victoryScreen.addChild(new Sprite(Sprite.DrawType.TEXT_LARGE, `Level Complete!`, "white", 500, 200))
    text.setPosition(width/2-250,height/2-150)

    let nextLevel = victoryScreen.addChild(new UIElement(UIElement.Type.PRESS_BUTTON, "Next level", 150, 60, () => {
        loadLevel(parseInt(level) + 1)
    }))
    nextLevel.setPosition(width/2 - 160, height/2 + 30)

    let backToMenu = victoryScreen.addChild(new UIElement(UIElement.Type.PRESS_BUTTON, "Menu", 150, 60, () => {
        gamePhase = Phases.MAIN_MENU
    }))
    backToMenu.setPosition(width/2 + 10, height/2 + 30)

    var updateWinScreen = function() {
        let finalLevel = (level == Object.keys(levels).length)
        nextLevel.disabled = finalLevel
        backToMenu.setPosition(finalLevel ? width/2 - 75 : width/2 + 10, height/2 + 30)
    }
}

World.addCallback(Entity.Callbacks.TICK, () => {
    mainMenu.disabled = !(gamePhase === Phases.MAIN_MENU)
    gameplay.disabled = !(gamePhase === Phases.GAMEPLAY)
    deathScreen.disabled = !(gamePhase === Phases.DEAD)
    victoryScreen.disabled = !(gamePhase === Phases.VICTORY)
    if (gamePhase === Phases.GAMEPLAY) { // Gameplay
        gameplayTick()
    }
})
