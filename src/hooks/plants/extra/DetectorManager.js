
export let createDetector

function wrapDetector(ctx, plantID) {
    const square = ctx.engine.getSystemModule("chunks:///_virtual/Square.ts")
    const plant = ctx.engine.getSystemModule(`chunks:///_virtual/${plantID}.ts`)

    ctx.log.info("Patching " + plantID)
    let protoID = `${plantID}Plant`
    switch (plantID) {
        case "AppleMortar":
            protoID = plantID
    }
    const proto = plant[protoID].prototype

    const detectorFunctions = [
        "setDetecter",
        "specialPlantOnSquareChange"
    ]
    detectorFunctions.forEach((func) => {
        if (typeof proto[func] === "function") {
            ctx.hooks.wrapMethod({
                target: proto,
                methodName: func,
                handler: ({args, thisArg, callOriginal}) => {
                    callOriginal(...args)
                    createDetector(thisArg, thisArg.objdataOwn.DetectorOverride)
                }
            })
        } else ctx.log.warn(`${func} doesnt exist for ${plantID}`)
    })

    let detectFunction = "detectEnemy"
    switch (plantID) {
        case "AppleMortar":
            detectFunction = "detectEnemies3"
            break
        case "BowlingBulb":
            detectFunction = "detectEnemies"
    }
    if (typeof proto[detectFunction] === "function") {
        ctx.hooks.wrapMethod({
            target: proto,
            methodName: detectFunction,
            handler: ({args, thisArg, callOriginal}) => {
                const override = thisArg.objdataOwn.DetectorOverride
                if (!override) {
                    return callOriginal(...args)
                }

                for (const offset of override.lanes) {
                    const laneIndex = thisArg.inLnC.lIndex + offset
                    if (laneIndex < 0 || laneIndex > 4) continue

                    const lane = square.Square.getLane(laneIndex)

                    if (
                        lane.zombiePool().some(zombie =>
                            thisArg.detector.judgeCrossRec(zombie.bodyRecForShooter)
                        ) ||
                        lane.tombPool().some(tomb =>
                            thisArg.detector.judgeCrossRec(tomb.bodyRec)
                        )
                    ) {
                        return true
                    }
                }

                return false
            }
        })
    } else ctx.log.warn(`${detectFunction} doesn't exist for ${plantID}`)
}

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const characterManager = ctx.engine.getSystemModule("chunks:///_virtual/CharacterManager.ts")
        const square = ctx.engine.getSystemModule("chunks:///_virtual/Square.ts")

        const cc = ctx.engine.getCc()

        ctx.log.info("Patching plant detectors")

        createDetector = function (thisArg, override) {
            if (!override) return

            const isCentered = override.isCentered ?? false

            const LnC = thisArg.inLnC

            const baseX = isCentered
                ? thisArg.worldPosition.x
                : LnC.node.worldPosition.x + square.Square.SquareWidth * ((override.x - 1) / 2)

            const baseY = isCentered
                ? thisArg.worldPosition.y
                : LnC.node.worldPosition.y

            thisArg.detector = characterManager.Rectangle.createRectangleCenter(
                new cc.Vec2(
                    baseX + square.Square.SquareWidth * (override.xOffset ?? 0),
                    baseY + square.Square.SquareHeight * (override.yOffset ?? 0)
                ),
                square.Square.SquareWidth * Math.min(
                    override.x,
                    9 - LnC.cIndex + (override.xOffset ?? 0)
                ),
                square.Square.SquareHeight * override.y
            )
        }

        const detectorPlants = [
            "Peashooter", "ThreePeater", "PuffShroom",
            "RedStinger", "AppleMortar", "Peanut",
            "StarFruit", "ShootingStarfruit",
            "BowlingBulb"
        ]

        detectorPlants.forEach((plantID) => {
            wrapDetector(ctx, plantID)
        })
    })
}