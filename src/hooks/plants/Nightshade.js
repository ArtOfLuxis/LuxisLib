import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const nightshade = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/NightShade.ts")
        const proto = nightshade.NightShadePlant.prototype

        wrapObjDataOwnPlant(ctx, proto, {
            "PeaTypeShadow": null,
            "PeaTypePlantfoodShadow": null,
            "PeaTypePlantfoodMegaShadow": null
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "replant",
            isStatic: false,
            handler({args, thisArg, callNext}) {
                callNext(...args);
                const wallAidOverride = thisArg.objdataOwn.WallnutAidOverride
                if (wallAidOverride) {
                    thisArg.health = thisArg.toughness * (wallAidOverride.HealPercent ?? 1.0)
                    if (wallAidOverride.NightshadeLeafRestore) {
                        thisArg.leftPRJCount = thisArg.objdataOwn.MaxProjectiles
                        thisArg.setPRJSlots()
                    }
                }
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "_shoot",
            isStatic: false,
            handler: ({args, thisArg, callNext}) => {
                const shadowProjectile = thisArg._objdataOwn.PeaTypeShadow ?? thisArg._objdataOwn.PeaType;
                const shadowPfProjectile = thisArg._objdataOwn.PeaTypePlantfoodShadow ?? thisArg._objdataOwn.PeaTypePlantfood;
                const shadowPfMegaProjectile = thisArg._objdataOwn.PeaTypePlantfoodMegaShadow ?? thisArg._objdataOwn.PeaTypePlantfoodMega;
                if (!thisArg.ShadowPowered) {
                    return callNext(...args)
                }

                const type = thisArg.fooding ?
                    ["PeaTypePlantfoodMega", shadowPfMegaProjectile] :
                    thisArg.fooded ?
                        ["PeaTypePlantfood", shadowPfProjectile]:
                    ["PeaType", shadowProjectile]

                const old = thisArg._objdataOwn[type[0]]
                try {
                    thisArg._objdataOwn[type[0]] = type[1]
                    callNext(...args)
                } finally {
                    thisArg._objdataOwn[type[0]] = old
                }
            }
        })
    })
}