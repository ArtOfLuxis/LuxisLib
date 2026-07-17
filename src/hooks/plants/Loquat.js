import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const loquat = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Loquat.ts")
        const characterManager = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/CharacterManager.ts")
        const square = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Square.ts")
        const proto = loquat.LoquatPlant.prototype

        const cc = ctx.unsafe.engine.getCc()

        wrapObjDataOwnPlant(ctx, proto, {
            "TornadoAOE": null,
            "TornadoDamage": null,
        })

        ctx.unsafe.hooks.wrapMethod({
            target: loquat.LoquatPlant.prototype,
            methodName: "_ro",
            handler: ({ args, thisArg, callNext }) => {
                callNext(...args)

                if (thisArg.currentLT) {
                    thisArg.currentLT.___plant = thisArg
                }
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: loquat.LoquatTornado.prototype,
            methodName: "update",
            handler: ({ args, thisArg }) => {
                const deltaTime = args[0]

                thisArg.LifeCD -= deltaTime

                const objdata = thisArg.___plant.objdataOwn
                const aoe = objdata?.TornadoAOE ?? { "x":3, "y":3, "lanes":[-1, 0, 1] }
                const damage = objdata?.TornadoDamage

                const rect = characterManager.Rectangle.createRectangleCenter(
                    new cc.Vec2(thisArg.worldPosition.x, thisArg.inLane.midY),
                    square.Square.SquareWidth * aoe.x,
                    square.Square.SquareHeight * aoe.y
                )

                const zombies = []

                for (const offset of aoe.lanes) {
                    const laneIndex = thisArg.inLane.LaneIndex + offset
                    if (laneIndex < 0 || laneIndex >= 5) continue

                    const lane = square.Square.getLane(laneIndex)

                    for (const zombie of lane.zombiePool()) {
                        if (
                            zombie.knockBackable &&
                            zombie.specialZombieKnockbackable() &&
                            rect.judgeCrossRec(zombie.bodyRecReal) &&
                            !zombies.includes(zombie)
                        ) {
                            zombies.push(zombie)
                        }
                    }
                }

                for (const zombie of zombies) {
                    const target = zombie.LoquatDragTarget()
                    if (!target) continue

                    if (!target.ImmuneToLoquats()) {
                        const drag = thisArg.worldPosition
                            .clone()
                            .subtract(target.worldPosition)
                            .multiplyScalar(thisArg.ZombieDraggingFactor * deltaTime)

                        target.worldPosition = target.worldPosition.add(drag)
                    }
                    if (damage) zombie.defaultDealDamage(new characterManager.ZombieDamageDetails(
                        damage.DPS * deltaTime,
                        damage.ArmorProtection,
                        damage.ArmorKnockSound,
                        damage.BodyKnockSound,
                        new cc.Vec2(damage.DamageDirection.x, damage.DamageDirection.y),
                        characterManager.ZombieDamageType[damage.DamageType],
                        damage.Flash,
                        damage.ArmorAlsoDamagedWhenNotProtecting
                    ))

                    target.setStun(0.5)
                }
            }
        })


    })
}