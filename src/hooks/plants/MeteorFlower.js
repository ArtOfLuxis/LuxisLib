import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const meteorFlower = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/MeteorFlower.ts")
        const proto = meteorFlower.MeteorFlowerPlant.prototype

        wrapObjDataOwnPlant(ctx, proto, {
            "MeteorTypePlantfood": null,
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "characterOnEnable",
            handler: ({args, thisArg, callNext}) => {
                thisArg.___meteorFooded = false
                return callNext(...args)
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "specialPlantFood",
            handler: ({args, thisArg, callNext}) => {
                thisArg.___meteorFooded = true
                return callNext(...args)
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "specialPlantFoodEnd",
            handler: ({args, thisArg, callNext}) => {
                thisArg.___meteorFooded = false
                return callNext(...args)
            }
        })

        ;[
            "_throwAtZombie",
            "_throw"
        ].forEach(method => {
            ctx.unsafe.hooks.wrapMethod({
                target: proto,
                methodName: method,
                handler: ({args, thisArg, callNext}) => {
                    const old =
                        thisArg.objdataOwn.MeteorType

                    const pfProjectile =
                        thisArg.objdataOwn.MeteorTypePlantfood

                    if (pfProjectile && thisArg.___meteorFooded) {
                        thisArg.objdataOwn.MeteorType = pfProjectile
                    }

                    try {
                        return callNext(...args)
                    } finally {
                        thisArg.objdataOwn.MeteorType = old
                    }
                }
            })
        })


    })
}