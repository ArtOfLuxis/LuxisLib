import {wrapObjDataOwnTile} from "./Tile";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const goldTile = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/goldTile.ts")
        const sunflower = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Sunflower.ts")
        const levelController = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/levelController.ts")
        const arrayGet = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/ArrayGet.ts")
        const proto = goldTile.goldTile.prototype

        wrapObjDataOwnTile(ctx, proto, {
            "FirstProduceValue": null,
            "ProduceValue": null,
            "PlantDetector": null,
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "specialTileOnEnable",
            handler: ({ thisArg, args, callNext }) => {
                callNext(...args)
                thisArg.___LuxisLibIsFirstProduce = true
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "_produce",
            handler: ({ thisArg }) => {
                let produceValue = thisArg.objdataOwn.ProduceValue
                if (thisArg.___LuxisLibIsFirstProduce) {
                    produceValue = thisArg.objdataOwn.FirstProduceValue
                    thisArg.___LuxisLibIsFirstProduce = false
                }

                thisArg.db.playAnimation("Produce", 1)
                sunflower.sunflower.produceSun(
                    produceValue ?? 50,
                    thisArg.inLnC.plantPoint.worldPosition.toVec2(),
                    1,
                    true
                )
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "specialTileUpdate",
            handler: ({ thisArg, args }) => {
                const deltaTime = args[0]
                if (!thisArg.dead) {
                    const LnC = thisArg.inLnC

                    const plantDetector = thisArg.objdataOwn.PlantDetector ?? { "x": 1, "y": 1 }
                    let hasPlantsOnTop = false
                    LnC.getArea(
                        plantDetector.x, plantDetector.y,
                        plantDetector.xOffset ?? 0,
                        plantDetector.yOffset ?? 0,
                    ).forEach((LnC) => {
                        if (!hasPlantsOnTop)
                            hasPlantsOnTop = LnC.getAllPlants().length > 0
                    })
                    if (LnC && hasPlantsOnTop) {
                        thisArg.stage = 2

                        if (thisArg.produceCD > 0) {
                            if (levelController.LevelPlay.gaming) {
                                thisArg.produceCD -= deltaTime
                            }
                        } else if (thisArg.produceCD <= 0) {
                            thisArg.produceCD = arrayGet.ValueRange.getRandomFromRange(thisArg.objdataOwn.ProduceInterval)
                            thisArg._produce()
                        }
                    } else {
                        thisArg.stage = Math.min(thisArg.stage, 1)
                    }
                }
            }
        })

    })
}