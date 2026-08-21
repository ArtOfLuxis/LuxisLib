import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const rotobaga = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Rotobaga.ts")
        const proto = rotobaga.RotobagaPlant.prototype

        const cc = ctx.unsafe.engine.getCc()

        wrapObjDataOwnPlant(ctx, proto, {
            "MaxShootAnimationCycles": null,
            "PlantfoodForcedDirections": null,
            "ForcedDirections": null, // used in DetectorManager
            "LimitDirectionAmount": null, // used in DetectorManager
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "_shootX",
            handler: ({ args, thisArg, callNext }) => {
                const max = thisArg.objdataOwn?.MaxShootAnimationCycles

                if (typeof max === "number" && !thisArg.fooding) {
                    thisArg.___LuxisLibDirectionShots ??= new Map()

                    const direction = args[0] ?? new cc.Vec2(1, 1)
                    const key = `${direction.x},${direction.y}`

                    const count = thisArg.___LuxisLibDirectionShots.get(key) ?? 0

                    if (count >= max)
                        return

                    thisArg.___LuxisLibDirectionShots.set(key, count + 1)
                }

                return callNext(...args)
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "onFoodLeftPeaCountDec",
            handler: ({ args, thisArg, callNext }) => {
                const directions = thisArg.objdataOwn?.PlantfoodForcedDirections
                if (!directions) return callNext(...args)

                directions.forEach(function (dir) {
                    thisArg._shootX(new cc.Vec2(dir.x ?? 0, dir.y ?? 0), true, thisArg.objdataOwn.PeaTypePlantfood)
                })
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "startShooting",
            handler: ({ args, thisArg, callNext }) => {
                thisArg.___LuxisLibDirectionShots ??= new Map()
                thisArg.___LuxisLibDirectionShots.clear()

                thisArg.___LuxisLibCachedDirections = null

                return callNext(...args)
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "specialPlantFood",
            handler: ({ args, thisArg, callNext }) => {
                thisArg.___LuxisLibCachedDirections = null

                return callNext(...args)
            }
        })
    })
}