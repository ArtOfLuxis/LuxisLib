
export let createDetector

function wrapDetector(ctx, plantID) {
    const square = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Square.ts")
    const plant = ctx.unsafe.engine.getSystemModule(`chunks:///_virtual/${plantID}.ts`)

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
            ctx.unsafe.hooks.wrapMethod({
                target: proto,
                methodName: func,
                handler: ({args, thisArg, callNext}) => {
                    callNext(...args)
                    createDetector(thisArg, thisArg.objdataOwn.DetectorOverride)
                }
            })
        } else ctx.log.warn(`${func} doesnt exist for ${plantID}`)
    })

    const laneOffsetReturningPlants = new Set(["Dandelion"])
    const alwaysShootHandlers = {
        Dandelion(result) {
            return result === -2
                ? Math.floor(Math.random() * 3) - 1
                : 0
        }
    }

    let detectFunction = "detectEnemy"
    switch (plantID) {
        case "AppleMortar":
            detectFunction = "detectEnemies3"
            break
        case "BowlingBulb":
        case "Dandelion":
            detectFunction = "detectEnemies"
            break
        case "Cactus":
            detectFunction = "detectShootEnemy"
    }
    if (typeof proto[detectFunction] === "function") {
        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: detectFunction,
            handler: ({args, thisArg, callNext}) => {
                const override = thisArg.objdataOwn.DetectorOverride
                const result = callNext(...args)

                const alwaysShoots = thisArg.objdataOwn.AlwaysShoots
                if (!override && !alwaysShoots)
                    return result

                let newResult = false
                let laneOffset = 0

                if (alwaysShoots) {
                    newResult = true
                    laneOffset = alwaysShootHandlers[plantID]?.(result) ?? 0
                } else {
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
                            newResult = true
                            laneOffset = offset
                            break
                        }
                    }
                }

                return laneOffsetReturningPlants.has(plantID)
                    ? laneOffset
                    : newResult
            }
        })
    } else ctx.log.warn(`${detectFunction} doesn't exist for ${plantID}`)
}

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const characterManager = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/CharacterManager.ts")
        const square = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Square.ts")

        const cc = ctx.unsafe.engine.getCc()

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

            const xOffset = override.xOffset ?? 0
            const yOffset = override.yOffset ?? 0

            if (isCentered) {
                const behind = Math.min(
                    Math.max(0, LnC.cIndex - xOffset),
                    override.x - 1
                )

                const inFront = Math.min(
                    Math.max(0, 8 - LnC.cIndex + xOffset),
                    override.x - behind - 1
                )

                const width = behind + inFront + 1

                const centerX =
                    baseX +
                    (inFront - behind) * square.Square.SquareWidth / 2 +
                    xOffset * square.Square.SquareWidth

                thisArg.detector = characterManager.Rectangle.createRectangleCenter(
                    new cc.Vec2(
                        centerX,
                        baseY + yOffset * square.Square.SquareHeight
                    ),
                    width * square.Square.SquareWidth,
                    override.y * square.Square.SquareHeight
                )
            } else {
                thisArg.detector = characterManager.Rectangle.createRectangleSide(
                    new cc.Vec2(
                        LnC.node.worldPosition.x + xOffset * square.Square.SquareWidth,
                        LnC.node.worldPosition.y + yOffset * square.Square.SquareHeight
                    ),
                    Math.min(
                        override.x,
                        9 - LnC.cIndex + xOffset
                    ) * square.Square.SquareWidth,
                    override.y * square.Square.SquareHeight
                )
            }
        }

        const detectorPlants = [
            "Peashooter", "ThreePeater", "PuffShroom",
            "RedStinger", "AppleMortar", "Peanut",
            "StarFruit", "ShootingStarfruit",
            "BowlingBulb", "CabbagePult",
            "Cactus", "Dandelion",
            "Anthurium", "SplitPea",
            "FirePeashooter"
        ]

        detectorPlants.forEach((plantID) => {
            wrapDetector(ctx, plantID)
        })
    })
}