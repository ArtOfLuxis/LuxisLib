import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const squash = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Squash.ts")
        const characterManager = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/CharacterManager.ts")
        const square = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Square.ts")
        const proto = squash.SquashPlant.prototype

        const cc = ctx.unsafe.engine.getCc()

        wrapObjDataOwnPlant(ctx, proto, {
            "SmashAOE": null,
        })


        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "getZombiesInSmashingRange",
            handler: ({args, thisArg, callNext}) => {
                const aoe = thisArg.objdataOwn.SmashAOE
                if (!aoe) return callNext(...args)

                const center = args[0] ?? thisArg

                const range = characterManager.Rectangle.createRectangleCenter(
                    new cc.Vec2(center.worldPositionX, center.inLane.midY),
                    square.Square.SquareWidth * aoe.x,
                    square.Square.SquareHeight * aoe.y
                )

                const result = new Set()

                for (const offset of aoe.lanes) {
                    const laneIndex = center.inLnC.lIndex + offset
                    if (laneIndex < 0 || laneIndex >= 5) continue

                    const lane = square.Square.getLane(laneIndex)

                    for (const zombie of lane.zombiePool()) {
                        if (range.judgeCrossRec(zombie.bodyRecReal)) {
                            result.add(zombie)
                        }
                    }
                }

                return result
            }
        })


    })
}