import {libProperties} from "../other/JSONs"

import {executeActions} from "../../modules/JSONActionsSystem";
import {isGameRunning} from "../other/levelController";

const prototypeDefaults = new WeakMap()
let wrapped = false

export function wrapObjDataOwnZombie(ctx, proto, keys) {
    let defaults = prototypeDefaults.get(proto)
    if (!defaults) {
        defaults = {}
        prototypeDefaults.set(proto, defaults)
    }

    Object.assign(defaults, keys)

    if (wrapped) return
    wrapped = true

    const zombie = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Zombie.ts")

    ctx.unsafe.hooks.wrapProperty({ // i have no fucking idea why this works but it does so we dont touch it
        target: zombie.Zombie.prototype,
        key: "_objdata",
        get: ({ thisArg, value }) => {
            let current = Object.getPrototypeOf(thisArg)

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

            return value
        }
    })
}

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const zombie = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Zombie.ts")
        const materials = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Materials.ts")
        const frontYard = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/FrontYard.ts")
        const characterManager = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/CharacterManager.ts")
        const proto = zombie.Zombie.prototype

        const cc = ctx.unsafe.engine.getCc()

        wrapObjDataOwnZombie(ctx, proto, {
            "ColorOffset": null,
            "ColorMult": null,
            "OnEnableActions": null,
            "OnUpdateActions": null,
            "OnBiteActions": null,
            "OnDamagedActions": null,
            "BeforeDamagedActions": null,
            "OnDeathActions": null,
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

            "GlitteringDurationMultiplier": null,
            "PoisonDurationMultiplier": null,
            "ChillDurationMultiplier": null,
            "FreezeDurationMultiplier": null,
            "ButterDurationMultiplier": null,
            "StunDurationMultiplier": null,
            "DarkMatterDurationMultiplier": null,
            "PerfumeDurationMultiplier": null,
            "SapflingDurationMultiplier": null,
        })


        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "shouldMaterial",
            handler: ({ args, thisArg, callNext }) => {
                callNext(...args)

                const offset = thisArg.objdata.ColorOffset

                let color = new cc.Color(0, 0, 0, 255)
                let saturation = 0

                if (thisArg.teleporting) {
                    color.r += thisArg.addColor.r
                    color.g += thisArg.addColor.g
                    color.b += thisArg.addColor.b
                }

                if (thisArg.CarriedSporeShroom) {
                    color.r += materials.materialRes.zombieSporeShroomCarrier.r
                    color.g += materials.materialRes.zombieSporeShroomCarrier.g
                    color.b += materials.materialRes.zombieSporeShroomCarrier.b
                }

                if (thisArg.hurting > 0) {
                    color.r += thisArg.hurting * 8
                    color.g += thisArg.hurting * 8
                    color.b += thisArg.hurting * 8
                    saturation += thisArg.hurting / 20
                }

                saturation += thisArg.additionalSatuation()

                let holo = 0

                if (!thisArg.dead && !thisArg.fallingInSky) {
                    if (thisArg.havePlantfood) {
                        color.r += materials.materialRes.zombiePF.r
                        color.g += materials.materialRes.zombiePF.g
                        color.b += materials.materialRes.zombiePF.b
                    }

                    if (thisArg.haveSun > 0) {
                        color.r += materials.materialRes.zombieSunAdd.r
                        color.g += materials.materialRes.zombieSunAdd.g
                        color.b += materials.materialRes.zombieSunAdd.b
                    }

                    if (thisArg.potionInvisible) {
                        holo = libProperties?.ZombieInvisibilityPotionOpacity ?? 0.5
                        color.r += materials.materialRes.zombieInvisiblilityPotion.r
                        color.g += materials.materialRes.zombieInvisiblilityPotion.g
                        color.b += materials.materialRes.zombieInvisiblilityPotion.b
                    }
                }

                if (thisArg.glittering > 0) {
                    color.r = 194;
                    color.g = 0;
                    color.b = 178;
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
                        colorMult.r ?? 1,
                        colorMult.g ?? 1,
                        colorMult.b ?? 1,
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
                            thisArg.stunned > 0 ||
                            thisArg.butterStun > 0 ||
                            thisArg.fallingInSky ||
                            thisArg.freeze > 0 ||
                            thisArg.chilibeanPoisoning ||
                            thisArg.chiliStun > 0
                        )
                    ) {
                        return 0
                    }
                    let speed = 1
                    if (!thisArg.invincible) {
                        if (thisArg.chill > 0) {
                            speed *= libProperties?.ZombieChillSpeedMultiplier ?? 0.5
                        }
                        if (thisArg.perfume > 0) {
                            speed *= libProperties?.ZombiePerfumeSpeedMultiplier ?? 0.5
                        }
                        if (thisArg.sapflingCD > 0) {
                            speed *= libProperties?.ZombieSapSpeedMultiplier ?? 0.5
                        }
                    }
                    speed *= Math.pow(thisArg.potionSpeedDeltaSPDScalePerLevel, thisArg.potionSpeedLevel)
                    if (thisArg.isWalking && thisArg.inWater) {
                        speed *= thisArg.objdataOwn.SpeedScaleInWater
                    }
                    if (thisArg.darkmatter > 0) {
                        const ratio = thisArg.health / thisArg.toughness
                        speed *= (1 - ratio * (libProperties?.ZombieDarkmatterHealthRatioMultiplier ?? 0.75))
                            * (libProperties?.ZombieDarkmatterSpeedMultiplier ?? 1)
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

                const speedScale = thisArg.objdata.SpeedScale
                if (speedScale) speed *= speedScale

                return speed
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "chilibeanFart",
            handler: ({args, thisArg, callNext}) => {
                if (thisArg.objdata.ImmuneToChiliBean) return

                callNext(...args)
            }
        })


        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "characterOnEnable",
            handler: ({args, thisArg, callNext}) => {
                callNext(...args)

                if (thisArg.objdata.TimeBeforeSelfExplode && isGameRunning()) {
                    thisArg.___LuxisLibSelfExploding = true
                    thisArg.___LuxisLibTimeBeforeSelfExplode = thisArg.objdata.TimeBeforeSelfExplode.Time
                }

                const onEnableActions = thisArg.objdata.OnEnableActions
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

                const beforeDamagedActions = thisArg.objdata.BeforeDamagedActions
                if (beforeDamagedActions && isGameRunning()) {
                    executeActions(beforeDamagedActions, {
                        target: thisArg,
                        source: thisArg,
                        damageDetails: damageDetails
                    })
                }

                callNext(...args)

                const onDamagedActions = thisArg.objdata.OnDamagedActions
                if (onDamagedActions && isGameRunning()) {
                    executeActions(onDamagedActions, {
                        target: thisArg,
                        source: thisArg,
                        damageDetails: damageDetails
                    })
                }

                if (thisArg.health <= 0) {
                    const onDeathActions = thisArg.objdata.OnDeathActions
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
            methodName: "update",
            handler: ({args, thisArg, callNext}) => {
                callNext(...args)

                const deltaTime = args[0]

                if (thisArg.___LuxisLibSelfExploding && thisArg.isAlive() && isGameRunning()) {
                    const selfExploding = thisArg.objdata.TimeBeforeSelfExplode
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

                if (typeof thisArg.objdata.ForceFlyingMode === "boolean")
                    thisArg.flying = thisArg.objdata.ForceFlyingMode

                const onUpdateActions = thisArg.objdata.OnUpdateActions
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

                const beforeDamageActions = thisArg.objdata.BeforeDamageActions
                if (beforeDamageActions && isGameRunning()) {
                    executeActions(beforeDamageActions, {
                        target: thisArg,
                        source: thisArg,
                        damageDetails: damageDetails
                    })
                }

                callNext(...args)

                const onDamageActions = thisArg.objdata.OnDamageActions
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

                const onBiteActions = zombie.objdata.OnBiteActions
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
                const immuneToHypno = zombie.objdata?.ImmuneToHypno

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

                    const durationMultiplier = thisArg.objdata[`${effect}DurationMultiplier`]
                    if (typeof durationMultiplier === "number")
                        duration *= durationMultiplier

                    args[durationArg] = duration

                    return callNext(...args)
                }
            })
        })


    })
}