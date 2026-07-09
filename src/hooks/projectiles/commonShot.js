import {evaluate, evaluateExpression, executeActions} from "../../modules/JSONActionsSystem";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const commonShot = ctx.engine.getSystemModule("chunks:///_virtual/commonShot.ts")
        const projectiles = ctx.engine.getSystemModule("chunks:///_virtual/Projectiles.ts")
        const character = ctx.engine.getSystemModule("chunks:///_virtual/Character.ts")
        const square = ctx.engine.getSystemModule("chunks:///_virtual/Square.ts")
        const projectileShootingFunctions = projectiles.ProjectileShootingFunctions
        const proto = commonShot.commonShot.prototype

        const cc = ctx.engine.getCc()

        const projectileKeys = {
            "Scale": null,
            "ColorOffset": null,
            "ColorMult": null,
            "ProjectileSpread": null,
            "ZombieInvisibilityPotion": null,
            "ZombieToughnessPotion": null,
            "ZombieSpeedPotion": null,
            "OnEnableActions": null,
            "OnHitActions": null,
            "OnUpdateActions": null,
            "EnemyTypeOverride": null,
            "CanBePeaVineBuffed": null,
        }

        ctx.hooks.wrapProperty({
            target: proto,
            key: "objdata",
            set: ({ nextValue, thisArg }) => {
                Object.entries(projectileKeys).forEach(([key, value]) => {
                    if (thisArg._objdata[key] === undefined) {
                        thisArg._objdata[key] = value
                    }
                })

                return nextValue
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

                    if (value === undefined || value === null) return

                    switch (key) {
                        case "Scale": {
                            thisArg.scale = value
                            break
                        }
                        case "OnEnableActions": {
                            executeActions(value, {
                                target: thisArg,
                                source: thisArg,
                            })
                            break
                        }
                        default: {
                            thisArg[key] = value
                            break
                        }
                    }
                })
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "shouldMaterial",
            handler: ({ thisArg, callOriginal }) => {
                callOriginal()

                const color = new cc.Vec4(0, 0, 0, 1)

                const offset = thisArg.ColorOffset
                if (offset) {
                    color.x += offset.r / 255 ?? 0
                    color.y += offset.g / 255  ?? 0
                    color.z += offset.b / 255  ?? 0
                }

                const colorMult = thisArg.objdataOwn.ColorMult

                const pass = thisArg.material.passes[0]

                pass.setUniform(pass.getHandle("addColor"), color)
                if (colorMult) pass.setUniform(pass.getHandle("multColor"), new cc.Vec4(
                    colorMult.r ?? 1,
                    colorMult.g ?? 1,
                    colorMult.b ?? 1,
                    1
                ))

                thisArg.db.customMaterial = thisArg.material
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "detectEnemy",
            handler: ({args, thisArg, callOriginal}) => {
                if (thisArg.ProjectileSpread) {
                    if (thisArg._hasSpread) {
                        return callOriginal()
                    }

                    const originX = thisArg._worldPositionX
                    const originY = thisArg._worldPositionY
                    const height = thisArg.height
                    const prjLayer = thisArg.inLane.prjLayer
                    const speed = Math.hypot(
                        thisArg.linearVelocity.x,
                        thisArg.linearVelocity.y
                    )
                    const enemyType = thisArg.enemyType

                    thisArg.ProjectileSpread.forEach((spreadPattern) => {
                        const projectilesPerInterval = Math.floor(spreadPattern.ProjectilesPerInterval)
                        const intervalTimes = spreadPattern.ProjectileAmount / projectilesPerInterval
                        if (intervalTimes !== Math.floor(intervalTimes)) {
                            ctx.ui.toast(`ProjectileAmount is not a multiple of ProjectilesPerInterval`, "error")
                            ctx.log.error(`ProjectileAmount is not a multiple of ProjectilesPerInterval: ${spreadPattern}`);
                        }
                        thisArg.inLnC.schedule(function () {
                            for (let i = 0; i < projectilesPerInterval; i++) {
                                const spread = spreadPattern.ProjectileSpreadDegrees

                                if (!Array.isArray(spread) || spread.length === 0) {
                                    ctx.ui.toast(`Invalid ProjectileSpreadDegrees: ${spread}`, "error")
                                    ctx.log.error(`Invalid ProjectileSpreadDegrees: ${spread}`);
                                    return;
                                }

                                const initialDegreeOffset = spreadPattern.InitialDegreeOffset ?? 0

                                const randomSpread = spread[Math.floor(Math.random() * spread.length)]
                                const degrees =
                                    (randomSpread.min + Math.random() *
                                        (randomSpread.max - randomSpread.min)) + initialDegreeOffset
                                // random degrees from "min" to "max" plus InitialDegreeOffset
                                const radians = degrees * Math.PI / 180;

                                const velocity = new cc.Vec2(
                                    speed * Math.cos(radians),
                                    speed * Math.sin(radians),
                                ); // velocity based on degrees

                                const centerOffset = spreadPattern.CenterOffset ?? { "x": 0, "y": 0 }

                                const projectile = projectileShootingFunctions.shootOnePea(
                                    spreadPattern.ProjectileType,
                                    {
                                        x: originX + centerOffset.x * square.Square.SquareWidth,
                                        y: originY + centerOffset.y * square.Square.SquareHeight
                                    },
                                    height,
                                    prjLayer,
                                    velocity,
                                    enemyType
                                )
                                projectile._hasSpread = true
                            }
                        },
                            spreadPattern.ProjectileInterval,
                            intervalTimes - 1,
                            spreadPattern.FirstProjectileInterval,
                        )
                    })
                    thisArg.fade()
                    return
                }

                callOriginal(...args)
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "dealDamageToZombie",
            handler: ({args, thisArg, callOriginal}) => {
                callOriginal(...args)

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

                const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

                const toughnessPotion = thisArg.ZombieToughnessPotion
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


                const onHitActions = thisArg.OnHitActions
                if (onHitActions) {
                    executeActions(onHitActions, {
                        target: zombie,
                        source: thisArg
                    })
                }
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "addPeaBuff",
            handler: ({args, thisArg, callOriginal}) => {
                if (thisArg.CanBePeaVineBuffed || thisArg.CanBePeaVineBuffed === undefined) {
                    callOriginal(...args)
                }
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "update",
            handler: ({args, thisArg, callOriginal}) => {
                callOriginal(...args)

                if (thisArg.EnemyTypeOverride) {
                    thisArg.enemyType = character.CharacterType[thisArg.EnemyTypeOverride]
                }

                const onUpdateActions = thisArg.OnUpdateActions
                if (onUpdateActions) {
                    executeActions(onUpdateActions, {
                        target: thisArg,
                        source: thisArg,
                        deltaTime: args[0]
                    })
                }
            }
        })

    })
}