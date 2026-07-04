export function wrapDetector(ctx, proto) {
    const characterManager = ctx.engine.getSystemModule("chunks:///_virtual/CharacterManager.ts")
    const square = ctx.engine.getSystemModule("chunks:///_virtual/Square.ts")

    ctx.hooks.wrapMethod({
        target: proto,
        methodName: "setDetecter",
        handler: ({args, thisArg, callOriginal}) => {
            const override = thisArg.objdata.DetectorOverride;
            if (!override) {
                return callOriginal(...args);
            }

            const LnC = thisArg.inLnC;

            thisArg.detector = characterManager.Rectangle.createRectangleNodeSide(
                LnC.node,
                square.Square.SquareWidth * Math.min(9 - LnC.cIndex, override.x),
                square.Square.SquareHeight * (override.y)
            )
        }
    })

    ctx.hooks.wrapMethod({
        target: proto,
        methodName: "detectEnemy",
        handler: ({args, thisArg, callOriginal}) => {
            const override = thisArg.objdata.DetectorOverride
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
}

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const detectorPlants = [
            "Peashooter", "ThreePeater", "PuffShroom"
        ]
        detectorPlants.forEach((plantID) => {
            const plant = ctx.engine.getSystemModule(`chunks:///_virtual/${plantID}.ts`)
            console.log("[Luxis Lib] Patching " + plantID)
            wrapDetector(ctx, plant[`${plantID}Plant`].prototype)
        })
    })
}