import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const wallnut = ctx.engine.getSystemModule("chunks:///_virtual/WallNut.ts")
        const proto = wallnut.WallNutPlant.prototype

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "normalSmash",
            handler: ({args, thisArg, callOriginal}) => {
                if (!thisArg.smasherDetectable || thisArg.fooding || thisArg.invincible) return

                const slamDamageInsteadOfDeath = thisArg.objdataOwn.SmashDamageInsteadOfDeath
                if (slamDamageInsteadOfDeath) {
                    const zombie = args[0]
                    const damage =
                        slamDamageInsteadOfDeath.forcedDamage ??
                        zombie.objdataOwn.SmashDamage ??
                        1500

                    if (thisArg.armorHealth > 0) {
                        thisArg.armorHealth -= damage
                        if (thisArg.armorHealth <= 0) {
                            thisArg.foodable = true
                            thisArg.setArmor()
                        }
                    } else
                        thisArg.dealDamage(damage)
                } else callOriginal()
            }
        })
    })
}