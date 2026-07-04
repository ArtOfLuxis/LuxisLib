
export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const commonShot = ctx.engine.getSystemModule("chunks:///_virtual/commonShot.ts");
        const projectiles = ctx.engine.getSystemModule("chunks:///_virtual/Projectiles.ts");
        const character = ctx.engine.getSystemModule("chunks:///_virtual/Character.ts");
        const projectileShootingFunctions = projectiles.ProjectileShootingFunctions
        const characterType = character.CharacterType
        const proto = commonShot.commonShot.prototype;

        const projectileKeys = {
            "Scale": 1,
            "ProjectileSpread": null,
            "ZombieInvisibilityPotion": null,
            "ZombieToughnessPotion": null,
            "ZombieSpeedPotion": null,
            "OnHitPropsOverride": null,
            "CanBePeaVineBuffed": null,
        }

        ctx.hooks.wrapProperty({
            target: proto,
            key: "_objdata",
            get: ({thisArg, value}) => {
                const objdata = value
                if (objdata) {
                    Object.entries(projectileKeys).forEach(([prop, value]) => {
                        if (objdata[prop] === undefined) {
                            objdata[prop] = value
                        }
                    })
                }
                return value
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "defaultReadObjdata",
            handler: ({ args, thisArg, callOriginal }) => {
                callOriginal(...args)

                const objdata = args[0]

                Object.keys(projectileKeys).forEach((key) => {
                    const value = objdata[key]

                    if (value === undefined) return

                    if (key === "Scale") {
                        thisArg.scale = value
                    } else {
                        thisArg[key] = value
                    }
                })
            }
        });

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "detectEnemy",
            handler: ({thisArg, callOriginal}) => {
                if (thisArg.ProjectileSpread) {
                    if (thisArg._hasSpread) {
                        return callOriginal();
                    }

                    const originX = thisArg._worldPositionX;
                    const originY = thisArg._worldPositionY;
                    const height = thisArg.height;
                    const prjLayer = thisArg.inLane.prjLayer;
                    const velocityConstructor = thisArg.linearVelocity.constructor;
                    const speed = Math.hypot(
                        thisArg.linearVelocity.x,
                        thisArg.linearVelocity.y
                    );

                    thisArg.ProjectileSpread.forEach((spreadPattern) => {
                        thisArg.inLnC.schedule(function () {
                            const spread = spreadPattern.ProjectileSpreadDegrees

                            if (!Array.isArray(spread) || spread.length === 0) {
                                ctx.ui.toast(`Invalid ProjectileSpreadDegrees: ${spread}`, "info")
                                console.warn(`Invalid ProjectileSpreadDegrees: ${spread}`);
                                return;
                            }

                            const randomSpread = spread[Math.floor(Math.random() * spread.length)]
                            const degrees =
                                randomSpread.min + Math.random() *
                                (randomSpread.max - randomSpread.min) // random degrees from "min" to "max"
                            const radians = degrees * Math.PI / 180;

                            const velocity = new velocityConstructor(
                                speed * Math.cos(radians),
                                speed * Math.sin(radians),
                            ); // velocity based on degrees

                            const projectile = projectileShootingFunctions.shootOnePea(
                                spreadPattern.ProjectileType,
                                { x: originX, y: originY},
                                height,
                                prjLayer,
                                velocity,
                                characterType.zombie
                            )
                            projectile._hasSpread = true
                        },
                            spreadPattern.ProjectileInterval,
                            spreadPattern.ProjectileAmount - 1,
                            spreadPattern.FirstProjectileInterval,
                        )
                    })
                    thisArg.fade()
                    return
                }

                callOriginal();
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "dealDamageToZombie",
            handler: ({args, thisArg, callOriginal}) => {
                callOriginal()

                const zombie = args[0]

                const invisibilityPotion = thisArg.ZombieInvisibilityPotion
                if (
                    invisibilityPotion !== undefined &&
                    (
                        invisibilityPotion.value ||
                        (zombie.potionInvisible && invisibilityPotion.forced)
                    )
                ) {
                    zombie.potionInvisible = invisibilityPotion
                }

                const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

                const toughnessPotion = thisArg.ZombieToughnessPotion;
                if (toughnessPotion !== undefined) {
                    zombie.potionToughnessLevel = clamp(
                        zombie.potionToughnessLevel + toughnessPotion.value,
                        toughnessPotion.min,
                        toughnessPotion.max
                    )
                }
                const speedPotion = thisArg.ZombieSpeedPotion
                if (speedPotion !== undefined)
                    zombie.potionSpeedLevel = clamp(
                        zombie.potionSpeedLevel + speedPotion.value,
                        speedPotion.min,
                        speedPotion.max
                    )

                function completeAction(previousValue, actions) {
                    for (const action of actions) {
                        switch (action.mode) {
                            case "InvertBool":
                                previousValue = !previousValue;
                                break;

                            case "AddValue":
                                previousValue = previousValue + action.value;
                                break;

                            case "MultiplyValue":
                                previousValue = previousValue * action.value;
                                break;

                            case "SetValue":
                                previousValue = action.value;
                                break;

                            default:
                                ctx.ui.toast(`Unknown action mode: ${action?.mode}`, "info");
                                console.warn(`Unknown action mode: ${action?.mode}`);
                                break;
                        }
                    }

                    return previousValue;
                }

                const onHitPropsOverride = thisArg.OnHitPropsOverride
                if (onHitPropsOverride) Object.entries(onHitPropsOverride).forEach(([prop, action]) => {
                    zombie[prop] = completeAction(zombie[prop], action)
                })

            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "addPeaBuff",
            handler: ({thisArg, callOriginal}) => {
                if (thisArg.CanBePeaVineBuffed || thisArg.CanBePeaVineBuffed === undefined) {
                    callOriginal()
                }
            }
        })

    })
}