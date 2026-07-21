import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const bowlingBulb = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/BowlingBulb.ts")
        const proto = bowlingBulb.BowlingBulbPlant.prototype

        wrapObjDataOwnPlant(ctx, proto, {
            "ShootAnimationSpeed": null,
        })


        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "shootAnimation",
            handler: ({args, thisArg, callNext}) => {
                if (thisArg.haveBall) {
                    const speed = thisArg.objdataOwn.ShootAnimationSpeed ?? 1
                    const rollOrder = thisArg.objdataOwn.RollOrder

                    let ballId = "0"

                    for (let i = 0; i < rollOrder.length; i++) {
                        ballId = rollOrder[i]

                        console.log(ballId, thisArg["ball" + ballId + "Loaded"])

                        if (thisArg["ball" + ballId + "Loaded"]) {
                            break
                        }
                    }

                    thisArg.shot = false

                    const animationName = "Shoot" + ballId

                    thisArg.anmControl.playAnimation(animationName, 1, 0, speed)
                    thisArg.shooting = true
                    thisArg.soundRes.playPreshoot()
                }
            }
        })


    })
}