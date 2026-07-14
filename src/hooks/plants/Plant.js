import {executeActions} from "../../modules/JSONActionsSystem"
import {isGameRunning} from "../other/levelController"
import {libProperties} from "../other/JSONs";

const prototypeDefaults = new WeakMap()
let wrapped = false

export function wrapObjDataOwnPlant(ctx, proto, keys) {
    let defaults = prototypeDefaults.get(proto)
    if (!defaults) {
        defaults = {}
        prototypeDefaults.set(proto, defaults)
    }

    Object.assign(defaults, keys)

    if (wrapped) return
    wrapped = true

    const plant = ctx.engine.getSystemModule("chunks:///_virtual/Plant.ts")

    ctx.hooks.wrapMethod({
        target: plant.Plant.prototype,
        methodName: "modObjdataOwn",
        handler: ({ thisArg, args, callOriginal }) => {
            let current = Object.getPrototypeOf(thisArg);

            while (current) {
                const defaults = prototypeDefaults.get(current)
                if (defaults) {
                    for (const [key, value] of Object.entries(defaults)) {
                        if (!(key in thisArg._objdataOwn)) {
                            thisArg._objdataOwn[key] = value
                        }
                    }
                }

                current = Object.getPrototypeOf(current)
            }

            return callOriginal(...args)
        }
    })
}

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const plant = ctx.engine.getSystemModule("chunks:///_virtual/Plant.ts")
        const plants = ctx.engine.getSystemModule("chunks:///_virtual/Plants.ts")
        const particles = ctx.engine.getSystemModule("chunks:///_virtual/Particles.ts")
        const nodePools = ctx.engine.getSystemModule("chunks:///_virtual/NodePools.ts")
        const cards = ctx.engine.getSystemModule("chunks:///_virtual/Cards.ts")
        const square = ctx.engine.getSystemModule("chunks:///_virtual/Square.ts")
        const character = ctx.engine.getSystemModule("chunks:///_virtual/Character.ts")
        const proto = plant.Plant.prototype

        const cc = ctx.engine.getCc()

        wrapObjDataOwnPlant(ctx, proto, {
            "OnEnableActions": null,
            "BeforeEnableActions": null,
            "OnFoodActions": null,
            "OnEatActions": null,
            "OnEatenActions": null,
            "OnUpdateActions": null,
            "OnLeftClickActions": null,
            "OnRightClickActions": null,
            "DynamicPlantableCondition": null,
            "ColorOffset": null,
            "ColorMult": null,
            "CostOverride": null,
            "SpeedScale": 1,
            "HealAfterPF": true,
            "UsableInStages": null,
            "NoShadowBoost": null,
            "WorldPositionOffset": null,
            "ForceShovelableMode": null,
            "SmashDamageInsteadOfDeath": null,
            "TimeBeforeSelfExplode": null,
            "AlwaysMintBoosted": false,
            "DetectorOverride": null,
            "Hooks": null,
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "shouldMaterial",
            handler: ({ args, thisArg, callOriginal }) => {
                callOriginal(...args)

                let addColor = new cc.Vec4(0, 0, 0, 1)
                let saturation = 0

                if (thisArg.hurting > 0) {
                    addColor.x += thisArg.hurting / 60
                    addColor.y += thisArg.hurting / 60
                    addColor.z += thisArg.hurting / 60
                    saturation += thisArg.hurting / 20
                }

                if (thisArg._cdScaleByPlantCD > 0) {
                    saturation += libProperties?.GlacierShroomSaturation ?? 0.5
                }

                if (thisArg.hidden > 0) {
                    addColor.x += 0.4
                    addColor.y += 0.4
                    addColor.z -= 0.2
                }

                if (thisArg.countDownInvincibleGlitter > 0) {
                    addColor.x = 194 / 255
                    addColor.y = 0
                    addColor.z = 178 / 255
                }

                let holo = 1
                const colorOffset = thisArg.objdataOwn.ColorOffset
                if (colorOffset) {
                    addColor.x += (colorOffset.r ?? 0) / 255
                    addColor.y += (colorOffset.g ?? 0) / 255
                    addColor.z += (colorOffset.b ?? 0) / 255
                    saturation += colorOffset.s ?? 0
                    holo += colorOffset.holo ?? 0
                }

                const colorMult = thisArg.objdataOwn.ColorMult

                const pass = thisArg.material.passes[0]

                pass.setUniform(pass.getHandle("addColor"), addColor)
                if (colorMult) pass.setUniform(pass.getHandle("multColor"), new cc.Vec4(
                    colorMult.r ?? 1,
                    colorMult.g ?? 1,
                    colorMult.b ?? 1,
                    1
                ))
                pass.setUniform(pass.getHandle("saturation"), saturation)
                if (holo !== 1) pass.setUniform(pass.getHandle("holo"), holo)
                thisArg.anmControl.db.customMaterial = thisArg.material
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "_getShouldColor",
            handler: ({args, thisArg, callOriginal}) => {
                const color = callOriginal(...args).clone()

                const colorOffset = thisArg.objdataOwn.ColorOffset
                if (colorOffset && colorOffset.a) {
                    color.a += colorOffset.a
                }

                return color
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "die",
            handler: ({args, thisArg, callOriginal}) => {
                const result = callOriginal(...args)

                cards.Cards.component.CFs.forEach((card) => {
                    card.SUNCOST += 0 // to update suncost on all cards
                })

                return result
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "eat",
            handler: ({args, thisArg, callOriginal}) => {
                const result = callOriginal(...args)

                const [damageDetails, zombie] = args

                const onEatActions = thisArg.objdataOwn.OnEatActions
                if (onEatActions) {
                    executeActions(onEatActions, {
                        target: thisArg,
                        source: zombie,
                        damageDetails: damageDetails
                    })
                }

                if (thisArg.health <= 0) {
                    const onEatenActions = thisArg.objdataOwn.OnEatenActions
                    if (onEatenActions) {
                        executeActions(onEatenActions, {
                            target: thisArg,
                            source: zombie,
                            damageDetails: damageDetails
                        })
                    }
                }

                const onBiteActions = zombie.objdata.OnBiteActions
                if (onBiteActions) {
                    executeActions(onBiteActions, {
                        target: thisArg,
                        source: zombie,
                        damageDetails: damageDetails
                    })
                }

                return result
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "defaultShouldSpeedScale",
            handler: ({args, thisArg, callOriginal}) => {
                let speed = callOriginal(...args)

                const speedScale = thisArg.objdataOwn.SpeedScale
                if (speedScale) speed *= speedScale

                return speed
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "characterOnEnable",
            handler: ({args, thisArg, callOriginal}) => {
                const beforeEnableActions = thisArg.objdataOwn.BeforeEnableActions
                if (beforeEnableActions) {
                    executeActions(beforeEnableActions, {
                        target: thisArg,
                        source: thisArg,
                    })
                }

                callOriginal(...args)

                const onEnableActions = thisArg.objdataOwn.OnEnableActions
                if (onEnableActions) {
                    executeActions(onEnableActions, {
                        target: thisArg,
                        source: thisArg,
                    })
                }

                if (thisArg.objdataOwn.TimeBeforeSelfExplode) {
                    thisArg.___LuxisLibSelfExploding = true
                    thisArg.___LuxisLibTimeBeforeSelfExplode = thisArg.objdataOwn.TimeBeforeSelfExplode.Time
                }

            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "update",
            handler: ({args, thisArg, callOriginal}) => {
                callOriginal(...args)

                const deltaTime = args[0]

                if (thisArg.___LuxisLibSelfExploding && thisArg.isAlive) {
                    const selfExploding = thisArg.objdataOwn.TimeBeforeSelfExplode
                    if (selfExploding.PauseWhileFooding && thisArg.fooding) return
                    thisArg.___LuxisLibTimeBeforeSelfExplode -= deltaTime

                    const time = thisArg.___LuxisLibTimeBeforeSelfExplode

                    if (time <= 0) {
                        thisArg.dieOnLnC()
                        if (selfExploding.CanBeResurrected === false)
                            thisArg.plantInLnC.deadPlantType = null

                        thisArg.die()
                    } else {
                        const blinkTime = selfExploding.BlinkingStartTime ?? 5

                        if (!thisArg.fooding && time < blinkTime) {
                            const elapsed = blinkTime - time

                            const period = selfExploding.BlinkPeriod ?? 0.5
                            const minAlpha = selfExploding.BlinkMinAlpha ?? 100
                            const maxAlpha = selfExploding.BlinkMaxAlpha ?? 255

                            const t = (elapsed / period) * Math.PI * 2

                            const center = (minAlpha + maxAlpha) / 2
                            const amplitude = (maxAlpha - minAlpha) / 2

                            const alpha = Math.round(
                                center + amplitude * Math.cos(t)
                            );

                            const color = thisArg.baseColor.clone()
                            thisArg.baseColor = new cc.Color(color.r, color.g, color.b, alpha)
                        }
                    }
                }


                const onUpdateActions = thisArg.objdataOwn.OnUpdateActions
                if (onUpdateActions) {
                    executeActions(onUpdateActions, {
                        target: thisArg,
                        source: thisArg,
                        deltaTime: deltaTime
                    })
                }

            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "_onRealPosChange",
            handler: ({ args, thisArg, callOriginal }) => {
                callOriginal(...args)

                const offset = thisArg.objdataOwn.WorldPositionOffset
                if (!offset) return

                const offsetX = (offset.x ?? 0) * square.Square.SquareWidth
                const offsetY = (offset.y ?? 0) * square.Square.SquareHeight

                thisArg.node.worldPosition =
                    thisArg.node.worldPosition.clone().add3f(offsetX, offsetY, 0)
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "food",
            handler: ({args, thisArg, callOriginal}) => {
                let originalHP = thisArg.health
                const result = callOriginal(...args)

                if (thisArg.objdataOwn.HealAfterPF === false) {
                    thisArg.health = originalHP
                }

                if (thisArg.___LuxisLibSelfExploding) {
                    const selfExploding = thisArg.objdataOwn.TimeBeforeSelfExplode
                    if (selfExploding.RestoreTimeOnPF) {
                        thisArg.___LuxisLibTimeBeforeSelfExplode = selfExploding.Time

                        const color = thisArg.baseColor.clone()
                        thisArg.baseColor = new cc.Color(color.r, color.g, color.b, 255)
                    }
                }


                const onFoodActions = thisArg.objdataOwn.OnFoodActions
                if (onFoodActions) {
                    executeActions(onFoodActions, {
                        target: thisArg,
                        source: thisArg,
                    })
                }

                return result
            }
        })


        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "judgeShadowPlantMode",
            handler: ({args, thisArg, callOriginal}) => {
                if (thisArg.haveDarkMode && thisArg.objdataOwn.NoShadowBoost !== true) {
                    callOriginal(...args)
                }
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "dealMint",
            handler: ({thisArg, callOriginal}) => {
                const boostTime = Math.max(
                    plants.plants.MintDuration[thisArg.family_str] ?? 0,
                    plants.plants.SpecificPlantMintDuration[thisArg.Plant_Type] ?? 0
                )

                const isAlive = thisArg.isAlive()
                const isBoosted = isAlive && boostTime > 0
                if (!isAlive && this._MintBoosted) {
                    thisArg._MintBoostedWhenDying = true
                }
                thisArg._MintBoosted = isBoosted
                if (isBoosted && !thisArg._MintParCHA) {
                    const particle = nodePools.instantiatePooly(particles.particle.mintEffect())
                    particle.parent = thisArg.inLane.tombLayer
                    const particleCharacter = particle.getComponent(character.Character)
                    thisArg._MintParCHA = particleCharacter
                    particleCharacter.worldPosition = thisArg.worldPosition
                    particleCharacter.db.playAnimation("Spawn", 1)
                } else if (!isBoosted && thisArg._MintParCHA) {
                    thisArg.killMintPar()
                }
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "shovelable",
            handler: ({args, thisArg, callOriginal}) => {
                const forceShovelableMode = thisArg.objdataOwn.ForceShovelableMode
                if (typeof forceShovelableMode === "boolean") return forceShovelableMode

                return callOriginal(...args)
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "normalSmash",
            handler: ({args, thisArg, callOriginal}) => {
                if (!thisArg.smasherDetectable || thisArg.fooding || thisArg.invincible) return

                const zombie = args[0]
                const slamDamageInsteadOfDeath = thisArg.objdataOwn.SmashDamageInsteadOfDeath
                if (slamDamageInsteadOfDeath) {
                    const damage =
                        slamDamageInsteadOfDeath.forcedDamage ??
                        zombie.objdataOwn.SmashDamage ??
                        1500

                    thisArg.dealDamage(damage)
                }

                return callOriginal(...args)
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "onMouseDown",
            handler: ({args, thisArg, callOriginal}) => {
                let result = callOriginal(...args)

                let actions

                switch (args[0].getButton()) {
                    case 0: // left click
                        actions = thisArg.objdataOwn.OnLeftClickActions
                        break
                    case 2: // right click
                        actions = thisArg.objdataOwn.OnRightClickActions
                }

                if (actions && isGameRunning()) {
                    executeActions(actions, {
                        target: thisArg,
                        source: thisArg
                    })
                }

                return result
            }
        })

        ctx.hooks.wrapProperty({
            target: proto,
            key: "MintBoosted",
            get: ({thisArg, value}) => {
                if (thisArg.objdataOwn.AlwaysMintBoosted) return true

                return value
            }
        })


    })
}