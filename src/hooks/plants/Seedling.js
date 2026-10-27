import {wrapObjDataOwnPlant} from "./Plant.js";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const seedling = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Seedling.ts")
        const proto = seedling.SeedlingPlant.prototype

        wrapObjDataOwnPlant(ctx, proto, {
            "DoesntExplode": null,
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "characterOnEnable",
            handler: ({ args, thisArg, callNext }) => {
                callNext(...args)

                if (thisArg.objdataOwn.DoesntExplode) {
                    thisArg.deathAnm = ""
                }
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "grow",
            handler: ({ args, thisArg, callNext }) => {
                callNext(...args)

                if (thisArg.objdataOwn.DoesntExplode) {
                    thisArg.deathAnm = ""
                }
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "detectEnemy",
            handler: ({ args, thisArg, callNext }) => {
                if (thisArg.objdataOwn.DoesntExplode) {
                    return
                }

                return callNext(...args)
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "shoot",
            handler: ({ args, thisArg, callNext }) => {
                if (thisArg.objdataOwn.DoesntExplode) {
                    return
                }

                return callNext(...args)
            }
        })
    })
}