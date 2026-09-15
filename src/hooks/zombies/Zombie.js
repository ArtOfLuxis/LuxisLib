import {libProperties} from "../other/JSONs"

import {executeActions} from "../../modules/JSONActionsSystem";
import {isGameRunning} from "../other/levelController";


const zombiePropDefaults = {}
let wrapped = false

export function wrapObjDataOwnZombie(ctx, keys) {
    Object.assign(zombiePropDefaults, keys)

    if (wrapped) {
        return
    }

    wrapped = true

    const zombie = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Zombie.ts")
    const zombies = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Zombies.ts")

    const cloneDefault = (value) => {
        if (Array.isArray(value)) {
            return value.concat()
        }

        if (value && typeof value === "object") {
            return structuredClone
                ? structuredClone(value)
                : JSON.parse(JSON.stringify(value))
        }

        return value
    }

    const applyDefaults = (props) => {
        if (!props) {
            return props
        }

        for (const [key, value] of Object.entries(zombiePropDefaults)) {
            if (!(key in props)) {
                props[key] = cloneDefault(value)
            }
        }

        return props
    }

    const resetDefaults = (props) => {
        if (!props) {
            return props
        }

        for (const [key, value] of Object.entries(zombiePropDefaults)) {
            props[key] = cloneDefault(value)
        }

        return props
    }

    ctx.unsafe.hooks.wrapMethod({
        target: zombies.zombies,
        methodName: "getFilledZombieProps",
        handler: ({ args, callNext }) => {
            const result = callNext(...args)

            return applyDefaults(result)
        }
    })

    ctx.unsafe.hooks.wrapMethod({
        target: zombie.Zombie.prototype,
        methodName: "modObjdataOwn",
        handler: ({ args, thisArg, callNext }) => {
            resetDefaults(thisArg._objdataOwn)
            resetDefaults(thisArg._objdataOwnOrg)

            return callNext(...args)
        }
    })
}

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const zombie = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Zombie.ts")
        const frontYard = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/FrontYard.ts")
        const characterManager = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/CharacterManager.ts")
        const soundResources = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/SoundRescourses.ts")
        const particleSelfdestroy = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/ParticleSelfdestroy.ts")
        const nodePools = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/NodePools.ts")
        const particles = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Particles.ts")
        const zombossMechZombie = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/ZombossMechZombie.ts")
        const proto = zombie.Zombie.prototype

        const cc = ctx.unsafe.engine.getCc()

        wrapObjDataOwnZombie(ctx, {
            "ColorOffset": null,
            "ColorMult": null,
            "OnEnableActions": null,
            "OnUpdateActions": null,
            "OnBiteActions": null,
            "OnDamagedActions": null,
            "BeforeDamagedActions": null,
            "OnArmorDamageActions": null,
            "BeforeArmorDamageActions": null,
            "OnDeathActions": null,
            "OnDeathForcedActions": null,
            "BeforeDeathForcedActions": null,
            "OnDamageActions": null,
            "BeforeDamageActions": null,
            "SpeedScale": 1,
            "ImmuneToChiliBean": false,
            "ImmuneToHypno": false,
            "ImmuneToHypnoShroom": false,
            "TimeBeforeSelfExplode": null,
            "ForceFlyingMode": null,
            "PlantSmashDamage": null,
            "SpecificPlantSmashDamage": null,
            "MagnetCanTakeHead": null,
            "MagnetPFCanTakeHead": null,
            "EMPOverride": null,
            "DamageTypeImmunities": null,
            "CannotBeCarriedByInferno": null,
            "HurrikalePushSpeedMult": null,
            "MagnetHeadAbsorptionSpeed": null,

            "GlitteringDurationMultiplier": null,
            "PoisonDurationMultiplier": null,
            "ChillDurationMultiplier": null,
            "FreezeDurationMultiplier": null,
            "ButterDurationMultiplier": null,
            "StunDurationMultiplier": null,
            "DarkMatterDurationMultiplier": null,
            "PerfumeDurationMultiplier": null,
            "SapflingDurationMultiplier": null,

            "StunSpeedMultiplier": null,
            "ButterSpeedMultiplier": null,
            "FreezeSpeedMultiplier": null,
            "ChiliStunSpeedMultiplier": null,
            "ChillSpeedMultiplier": null,
            "PerfumeSpeedMultiplier": null,
            "SapSpeedMultiplier": null,
            "DarkmatterHealthRatioMultiplier": null,
            "DarkmatterSpeedMultiplier": null,
        })


        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "shouldMaterial",
            priority: -99999,
            handler: ({ args, thisArg, callNext }) => {
                callNext(...args)

                const offset = thisArg.objdataOwn.ColorOffset

                let color = new cc.Color(0, 0, 0, 255)
                let saturation = 0

                saturation += thisArg.additionalSatuation()

                let holo = 0

                if (!thisArg.dead && !thisArg.fallingInSky) {
                    if (thisArg.potionInvisible) {
                        holo = libProperties?.ZombieInvisibilityPotionOpacity ?? 0.5
                    }
                }

                if (offset) {
                    color.r += offset.r ?? 0
                    color.g += offset.g ?? 0
                    color.b += offset.b ?? 0
                    holo += offset.holo ?? 0
                    saturation += offset.s ?? 0
                }

                const colorMult = thisArg.objdataOwn.ColorMult ?
                    new cc.Vec4(
                        thisArg.objdataOwn.ColorMult.r ?? 1,
                        thisArg.objdataOwn.ColorMult.g ?? 1,
                        thisArg.objdataOwn.ColorMult.b ?? 1,
                        1
                    ) :
                    null

                const pass = thisArg.material.passes[0]

                pass.setUniform(pass.getHandle("addColor"), color)
                if (colorMult) pass.setUniform(pass.getHandle("multColor"), colorMult)
                pass.setUniform(pass.getHandle("saturation"), saturation)
                pass.setUniform(pass.getHandle("holo"), holo)

                thisArg.body.db.customMaterial = thisArg.material

                return { color, colorMult, saturation, holo }
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "defaultShouldSpeedScale",
            handler: ({thisArg, callNext}) => {
                const defaultShouldSpeedScale = function () {
                    if (thisArg.leapHeightTween && !thisArg.isAlive()) {
                        return 0
                    }
                    if (thisArg.dead) {
                        return 1
                    }
                    if (
                        thisArg.fadingAway ||
                        thisArg.iceblocked ||
                        thisArg.icebloom_block ||
                        thisArg.teleporting ||
                        !thisArg.invincible && (
                            thisArg.fallingInSky ||
                            thisArg.chilibeanPoisoning ||
                            thisArg.___LuxisLibEMPCD > 0
                        )
                    ) {
                        return 0
                    }

                    let speed = 1

                    if (!thisArg.invincible) {
                        if (thisArg.stunned > 0) {
                            speed *= thisArg.objdataOwn.StunSpeedMultiplier ?? libProperties?.ZombieStunSpeedMultiplier ?? 0
                        }
                        if (thisArg.butterStun > 0) {
                            speed *= thisArg.objdataOwn.ButterSpeedMultiplier ?? libProperties?.ZombieButterSpeedMultiplier ?? 0
                        }
                        if (thisArg.freeze > 0) {
                            speed *= thisArg.objdataOwn.FreezeSpeedMultiplier ?? libProperties?.ZombieFreezeSpeedMultiplier ?? 0
                        }
                        if (thisArg.chiliStun > 0) {
                            speed *= thisArg.objdataOwn.ChiliStunSpeedMultiplier ?? libProperties?.ZombieChiliStunSpeedMultiplier ?? 0
                        }



                        if (thisArg.chill > 0 && thisArg.freeze <= 0) {
                            speed *= thisArg.objdataOwn.ChillSpeedMultiplier ?? libProperties?.ZombieChillSpeedMultiplier ?? 0.5
                        }
                        if (thisArg.perfume > 0) {
                            speed *= thisArg.objdataOwn.PerfumeSpeedMultiplier ?? libProperties?.ZombiePerfumeSpeedMultiplier ?? 0.5
                        }
                        if (thisArg.sapflingCD > 0) {
                            speed *= thisArg.objdataOwn.SapSpeedMultiplier ?? libProperties?.ZombieSapSpeedMultiplier ?? 0.5
                        }
                    }
                    speed *= Math.pow(thisArg.potionSpeedDeltaSPDScalePerLevel, thisArg.potionSpeedLevel)
                    if (thisArg.isWalking && thisArg.inWater) {
                        speed *= thisArg.objdataOwn.SpeedScaleInWater
                    }
                    if (thisArg.darkmatter > 0) {
                        const ratio = thisArg.health / thisArg.toughness
                        speed *= (1 - ratio * (thisArg.objdataOwn.DarkmatterHealthRatioMultiplier ?? libProperties?.ZombieDarkmatterHealthRatioMultiplier ?? 0.75))
                            * (thisArg.objdataOwn.DarkmatterSpeedMultiplier ?? libProperties?.ZombieDarkmatterSpeedMultiplier ?? 1)
                    }
                    thisArg._speed_stacked.forEach(function (e) {
                        speed *= e.SpeedMult
                    })
                    thisArg.ShrinkProps.forEach(function (e) {
                        speed *= e.SpeedScale
                    })
                    if (thisArg.scaredByTyranno) {
                        speed *= libProperties?.ZombieScaredByTyrannoSpeedMultiplier ?? 4
                    }
                    if (thisArg.isWalking) {
                        switch (frontYard.FrontYard.getCurrentJam()) {
                            case frontYard.JamStyle.jam_punk:
                                speed *= thisArg.objdataOwnOrg.JamPunkWalkSpeed ?? 1
                                break
                            case frontYard.JamStyle.jam_pop:
                                speed *= thisArg.objdataOwnOrg.JamPopWalkSpeed ?? 1
                                break
                            case frontYard.JamStyle.jam_metal:
                                speed *= thisArg.objdataOwnOrg.JamMetalWalkSpeed ?? 1
                        }
                    }
                    return speed
                }

                let speed = defaultShouldSpeedScale()

                const speedScale = thisArg.objdataOwn.SpeedScale
                if (speedScale) speed *= speedScale

                return speed
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "chilibeanFart",
            handler: ({args, thisArg, callNext}) => {
                if (thisArg.objdataOwn.ImmuneToChiliBean) return

                callNext(...args)
            }
        })


        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "characterOnEnable",
            handler: ({args, thisArg, callNext}) => {
                callNext(...args)

                thisArg.___LuxisLibEMPCD = 0
                thisArg.empPSD = undefined

                if (typeof thisArg.objdataOwn.ForceFlyingMode === "boolean")
                    thisArg.flying = thisArg.objdataOwn.ForceFlyingMode

                if (thisArg.objdataOwn.TimeBeforeSelfExplode && isGameRunning()) {
                    thisArg.___LuxisLibSelfExploding = true
                    thisArg.___LuxisLibTimeBeforeSelfExplode = thisArg.objdataOwn.TimeBeforeSelfExplode.Time
                }

                const onEnableActions = thisArg.objdataOwn.OnEnableActions
                if (onEnableActions && isGameRunning()) {
                    executeActions(onEnableActions, {
                        target: thisArg,
                        source: thisArg,
                    })
                }
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "defaultDealDamage",
            handler: ({args, thisArg, callNext}) => {
                const damageDetails = args[0]

                const beforeDamagedActions = thisArg.objdataOwn.BeforeDamagedActions
                if (beforeDamagedActions && isGameRunning()) {
                    executeActions(beforeDamagedActions, {
                        target: thisArg,
                        source: thisArg,
                        damageDetails: damageDetails
                    })
                }

                callNext(...args)

                const onDamagedActions = thisArg.objdataOwn.OnDamagedActions
                if (onDamagedActions && isGameRunning()) {
                    executeActions(onDamagedActions, {
                        target: thisArg,
                        source: thisArg,
                        damageDetails: damageDetails
                    })
                }

                if (thisArg.health <= 0) {
                    const onDeathActions = thisArg.objdataOwn.OnDeathActions
                    if (onDeathActions && isGameRunning()) {
                        executeActions(onDeathActions, {
                            target: thisArg,
                            source: thisArg,
                            damageDetails: damageDetails
                        })
                    }
                }

            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "playDie",
            handler: ({args, thisArg, callNext}) => {
                if (!thisArg.dead) {
                    const beforeDeathActions = thisArg.objdataOwn.BeforeDeathForcedActions
                    if (beforeDeathActions && isGameRunning()) {
                        executeActions(beforeDeathActions, {
                            target: thisArg,
                            source: thisArg
                        })
                    }

                    if (thisArg.empPSD) {
                        const db = thisArg.empPSD.db
                        if (db) db.playAnimation("Die", 1)
                        thisArg.empPSD.willBeKilled = true
                    }
                    thisArg.empPSD = null

                    callNext(...args)

                    const onDeathActions = thisArg.objdataOwn.OnDeathForcedActions
                    if (onDeathActions && isGameRunning()) {
                        executeActions(onDeathActions, {
                            target: thisArg,
                            source: thisArg
                        })
                    }
                }
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "update",
            handler: ({args, thisArg, callNext}) => {
                callNext(...args)

                const deltaTime = args[0]

                if (thisArg.___LuxisLibSelfExploding && thisArg.isAlive() && isGameRunning()) {
                    const selfExploding = thisArg.objdataOwn.TimeBeforeSelfExplode
                    thisArg.___LuxisLibTimeBeforeSelfExplode -= deltaTime

                    const time = thisArg.___LuxisLibTimeBeforeSelfExplode

                    if (time <= 0) {
                        const damageDetails =
                            new characterManager.ZombieDamageDetails(Infinity)

                        const customDamageDetails = selfExploding?.DeathDamageDetails
                        if (customDamageDetails) {
                            if (customDamageDetails.Damage)
                                damageDetails._damage = customDamageDetails.Damage
                            if (customDamageDetails.DamageType)
                                damageDetails._damageType = characterManager.ZombieDamageType[
                                    customDamageDetails.DamageType
                                ]
                        }
                        damageDetails._damageDirection = new cc.Vec2(
                            customDamageDetails.DamageDirection?.x ?? 0,
                            customDamageDetails.DamageDirection?.y ?? 0,
                        )

                        thisArg.defaultDealDamage(damageDetails)

                        thisArg.___LuxisLibTimeBeforeSelfExplode =
                            (selfExploding.RestartTime ?? Infinity)
                    }
                }

                if (typeof thisArg.objdataOwn.ForceFlyingMode === "boolean")
                    thisArg.flying = thisArg.objdataOwn.ForceFlyingMode


                if (thisArg.___LuxisLibEMPCD > 0) {
                    if (thisArg.empPSD) {
                        soundResources.sounds.playEmpSpark()
                        thisArg.empPSD.node.worldPosition = new cc.Vec3(
                            thisArg.worldPosition.x,
                            thisArg.worldPosition.y + thisArg.height + (thisArg.zombieHeight ?? 0) / 2,
                            1
                        )
                    }
                    thisArg.___LuxisLibEMPCD -= deltaTime
                    if (thisArg.___LuxisLibEMPCD <= 0) {
                        if (thisArg.empPSD) {
                            const db = thisArg.empPSD.db
                            if (db) db.playAnimation("Die", 1)
                            thisArg.empPSD.willBeKilled = true
                        }
                        thisArg.empPSD = null

                        if (thisArg.activateSound)
                            soundResources.sounds.playOneShot(thisArg.activateSound, 1, 0.1)
                    }
                }

                const onUpdateActions = thisArg.objdataOwn.OnUpdateActions
                if (onUpdateActions && isGameRunning()) {
                    executeActions(onUpdateActions, {
                        target: thisArg,
                        source: thisArg,
                        deltaTime: deltaTime
                    })
                }
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "defaultDealDamage",
            handler: ({args, thisArg, callNext}) => {
                const damageDetails = args[0]

                const immunities = thisArg.objdataOwn.DamageTypeImmunities

                if (immunities && (thisArg.armors.length <= 0 || !damageDetails.armorProtection)) {
                    for (const [typeName, multiplier] of Object.entries(immunities)) {
                        const damageType = characterManager.ZombieDamageType[typeName]

                        if (damageType === undefined) {
                            console.warn(
                                `Damage type "${typeName}" doesn't exist`,
                                characterManager.ZombieDamageType
                            )
                            continue
                        }

                        if (damageDetails.damageType === damageType) {
                            damageDetails._damage *= multiplier
                            break
                        }
                    }
                }

                if (damageDetails.damage < 0) {
                    thisArg.heal(-damageDetails.damage)
                }

                const beforeDamageActions = thisArg.objdataOwn.BeforeDamageActions
                if (beforeDamageActions && isGameRunning()) {
                    executeActions(beforeDamageActions, {
                        target: thisArg,
                        source: thisArg,
                        damageDetails: damageDetails
                    })
                }

                callNext(...args)

                const onDamageActions = thisArg.objdataOwn.OnDamageActions
                if (onDamageActions && isGameRunning()) {
                    executeActions(onDamageActions, {
                        target: thisArg,
                        source: thisArg,
                        damageDetails: damageDetails
                    })
                }
            }
        })


        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "eatByZombie",
            handler: ({args, thisArg, callNext}) => {
                const result = callNext(...args)

                const [damageDetails, zombie] = args

                const onBiteActions = zombie.objdataOwn.OnBiteActions
                if (onBiteActions && isGameRunning()) {
                    executeActions(onBiteActions, {
                        target: thisArg,
                        source: zombie,
                        damageDetails: damageDetails
                    })
                }

                return result
            }
        })


        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "defaultSetHypnoTized",
            handler: ({args, thisArg, callNext}) => {
                const immuneToHypno = thisArg.objdataOwn.ImmuneToHypno

                if (!immuneToHypno || typeof immuneToHypno !== "boolean") {
                    return callNext(...args)
                }
            }
        })


        const effectList = {
            "Glittering": 0,
            "Poison": 1,
            "Chill": 0,
            "Freeze": 0,
            "Butter": 0,
            "Stun": 0,
            "DarkMatter": 0,
            "Perfume": 0,
            "Sapfling": 0
        }

        Object.entries(effectList).forEach(([effect, durationArg]) => {
            ctx.unsafe.hooks.wrapMethod({
                target: proto,
                methodName: `set${effect}`,
                handler: ({args, thisArg, callNext}) => {
                    let duration = args[durationArg]

                    const durationMultiplier = thisArg.objdataOwn[`${effect}DurationMultiplier`]
                    if (typeof durationMultiplier === "number")
                        duration *= durationMultiplier

                    args[durationArg] = duration

                    return callNext(...args)
                }
            })
        })

        const getHead = function(zombie) {
            const head = zombie.dropHead(null)
            zombie.playDie()
            if (head) {
                head.MagnetShroomConsumingSpeed = 5 * (zombie.objdataOwn.MagnetHeadAbsorptionSpeed ?? 1)
                head.linearVelocity &&= new cc.Vec2(0, 0)
                head.bodyLinearVelocity &&= 0
            }
            return head
        }

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "getMagnetedObject",
            handler: ({args, thisArg, callNext}) => {
                const takeHead = thisArg.objdataOwn.MagnetCanTakeHead
                if (takeHead && thisArg.isAlive()) {
                    return getHead(thisArg)
                } else {
                    return callNext(...args)
                }
            }
        })


        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "getFoodMagnetedObject",
            handler: ({args, thisArg, callNext}) => {
                const takeHead = thisArg.objdataOwn.MagnetPFCanTakeHead
                if (takeHead && thisArg.isAlive()) {
                    return getHead(thisArg)
                } else {
                    return callNext(...args)
                }
            }
        })


        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "empStun",
            handler: ({args, thisArg, callNext}) => {
                if (!thisArg.objdataOwn.EMPOverride)
                    return callNext(...args)

                let [duration] = args

                duration *= thisArg.objdataOwn.EMPStunTimeScale ?? 1
                if (thisArg.___LuxisLibEMPCD <= 0 && duration > 0) {
                    if (thisArg.objdataOwn.EMPOverride.SpawnEMPParticles) {
                        const empEffect = nodePools.instantiatePooly(particles.particle.empEffect())
                        empEffect.parent = thisArg.node.parent
                        const particleSelfDestroy = empEffect.getComponent(particleSelfdestroy.ParticleSelfdestroy)
                        thisArg.empPSD = particleSelfDestroy
                        particleSelfDestroy.db.playAnimation("Idle1", 1)

                        empEffect.worldPosition = new cc.Vec3(
                            thisArg.worldPosition.x,
                            thisArg.worldPositionY + thisArg.height + (thisArg.zombieHeight ?? 1) / 2,
                            1
                        )
                    }

                    thisArg.endSandStorm()

                    if (thisArg.deactivateSound) {
                        soundResources.sounds.playOneShot(thisArg.deactivateSound, 1, 0.1)
                    }
                }
                thisArg.___LuxisLibEMPCD = thisArg.___LuxisLibEMPCD < duration ? duration : thisArg.___LuxisLibEMPCD
            }
        })


        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "characterOnLaneChange",
            handler: ({args, thisArg, callNext}) => {
                callNext(...args)

                if (thisArg.empPSD) {
                    thisArg.empPSD.node.setParent(thisArg.inLane.prjLayer, true)
                }
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "dealHurrikale",
            handler: ({ args, thisArg, callNext }) => {
                const mult =
                    thisArg.objdataOwn.HurrikalePushSpeedMult ?? 1

                args[0] *= mult

                return callNext(...args)
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "damageToArmors",
            handler: ({args, thisArg, callNext}) => {
                const armor = thisArg.armors?.[0]
                if (!armor) return callNext(...args)

                const damageDetails = args[0]

                const immunities = armor.props.DamageTypeImmunities

                if (immunities) {
                    for (const [typeName, multiplier] of Object.entries(immunities)) {
                        const damageType = characterManager.ZombieDamageType[typeName]

                        if (damageType === undefined) {
                            console.warn(
                                `Damage type "${typeName}" doesn't exist`,
                                characterManager.ZombieDamageType
                            )
                            continue
                        }

                        if (damageDetails.damageType === damageType) {
                            damageDetails._damage *= multiplier
                            break
                        }
                    }
                }

                if (damageDetails.damage < 0) {
                    armor.health = Math.min(armor.health + -damageDetails.damage, armor.toughness)
                    armor.setDisplay()

                    return
                }

                const beforeDamageActions = thisArg.objdataOwn.BeforeArmorDamageActions
                if (beforeDamageActions && isGameRunning()) {
                    executeActions(beforeDamageActions, {
                        target: thisArg,
                        source: thisArg,
                        damageDetails: damageDetails
                    })
                }

                callNext(...args)

                const onDamageActions = thisArg.objdataOwn.OnArmorDamageActions
                if (onDamageActions && isGameRunning()) {
                    executeActions(onDamageActions, {
                        target: thisArg,
                        source: thisArg,
                        damageDetails: damageDetails
                    })
                }
            }
        })


        ctx.unsafe.hooks.wrapMethod({
            target: zombossMechZombie.ZombossMechZombie.prototype,
            methodName: "heal",
            disposeOnProfileChange: true,
            handler: ({ args, thisArg }) => {
                if (!thisArg.isAlive()) return

                const hitPointHealths = thisArg.hitPointHealths
                let maxHealth = thisArg.toughness

                if (Array.isArray(hitPointHealths) && hitPointHealths.length > 0) {
                    const s = hitPointHealths.length - 1 - thisArg.currentStage
                    if (s >= 0 && s < hitPointHealths.length) {
                        maxHealth = Math.min(maxHealth, hitPointHealths[s] - 0.1)
                    }
                }

                const amount = args[0]
                thisArg.health = Math.min(maxHealth, thisArg.health + amount)
            }
        })


    })
}