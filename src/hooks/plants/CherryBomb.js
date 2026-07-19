import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const cherryBomb = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/CherryBomb.ts")
        const proto = cherryBomb.CherryBombPlant.prototype

        wrapObjDataOwnPlant(ctx, proto, {
            "ExplosionOverride": null,
        })


        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "explode",
            handler: ({ args, thisArg, callNext }) => {
                const explosionOverride = thisArg.objdataOwn.ExplosionOverride
                if (!explosionOverride) return callNext(...args)

                let damage = thisArg._objdataOwn.Damage

                if (
                    thisArg.MintBoosted &&
                    thisArg.objdataOwn.MintDamageFactor > 0
                ) {
                    damage *= thisArg.objdataOwn.MintDamageFactor
                }

                if (typeof thisArg._dmgScale === "number") {
                    damage *= thisArg._dmgScale
                }

                thisArg.inLnC.explodeCherry3x3(
                    damage,
                    explosionOverride.showExplosionText,
                    null, null,
                    explosionOverride.color,
                    explosionOverride.scale,
                    explosionOverride.width,
                    explosionOverride.height,
                    explosionOverride.lanes,
                    explosionOverride.xOffset,
                    explosionOverride.yOffset,
                    explosionOverride.armorProtection,
                    explosionOverride.armorKnockSound,
                    explosionOverride.bodyKnockSound,
                    explosionOverride.damageType,
                    explosionOverride.screenShakeDuration
                )
            }
        })


    })
}