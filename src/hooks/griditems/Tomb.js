import {isGameRunning} from "../other/levelController";
import {executeActions} from "../../modules/JSONActionsSystem";
import {libProperties} from "../other/JSONs";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const tomb = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Tomb.ts")
        const proto = tomb.Tomb.prototype

        const tombKeys = {
            "OnEnableActions": null,
            "OnUpdateActions": null,
            "OnDamageActions": null,
            "BeforeDamageActions": null,
            "OnDeathActions": null,
            "BeforeDeathActions": null,
            "SpawnedScale": null,
            "ColorOffset": null
        }

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "shouldMaterial",
            handler: ({ args, thisArg, callNext }) => {
                callNext(...args)

                let addColor = new cc.Vec4(0, 0, 0, 1)
                let saturation = 0

                if (thisArg._cdScaleByPlantCD > 0) {
                    saturation += libProperties?.GlacierShroomSaturation ?? 0.5
                }

                let holo = 0
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
                if (holo !== 0) pass.setUniform(pass.getHandle("holo"), holo)
                thisArg.body.customMaterial = thisArg.material
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "modObjdataOwn",
            handler: ({ thisArg, args, callNext }) => {
                for (const [key, value] of Object.entries(tombKeys)) {
                    if (!(key in thisArg._objdataOwn)) {
                        thisArg._objdataOwn[key] = value
                    }
                }

                return callNext(...args)
            }
        })

        // wrap property is really bugged and i have no idea how to do this otherwise
        // ctx.unsafe.hooks.wrapProperty({
        //     target: proto,
        //     key: "scale",
        //     get: ({ thisArg, value }) => {
        //         if (thisArg.hypnotized) return -value
        //         return value
        //     }
        // })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "update",
            handler: ({ args, thisArg, callNext }) => {
                callNext(...args)

                const deltaTime = args[0]

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
            methodName: "dealDamage",
            handler: ({ args, thisArg, callNext }) => {
                const damageDetails = args[0]

                const beforeDamageActions = thisArg.objdataOwn.BeforeDamageActions
                if (beforeDamageActions && isGameRunning()) {
                    executeActions(beforeDamageActions, {
                        target: thisArg,
                        source: thisArg,
                        damageDetails: damageDetails
                    })
                }

                const result = callNext(...args)

                const onDamageActions = thisArg.objdataOwn.OnDamageActions
                if (onDamageActions && isGameRunning()) {
                    executeActions(onDamageActions, {
                        target: thisArg,
                        source: thisArg,
                        damageDetails: damageDetails
                    })
                }

                return result
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "characterOnEnable",
            handler: ({ args, thisArg, callNext }) => {
                const result = callNext(...args)

                if (thisArg.objdataOwn.SpawnedScale) thisArg.scale = thisArg.objdataOwn.SpawnedScale;

                thisArg.scheduleOnce(() => {
                    const onEnableActions = thisArg.objdataOwn.OnEnableActions
                    if(onEnableActions && isGameRunning()) {
                        executeActions(onEnableActions, {
                            target: thisArg,
                            source: thisArg
                        })
                    }
                }, 0)

                return result
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "die",
            handler: ({ args, thisArg, callNext }) => {

                const beforeDeathActions = thisArg.objdataOwn.BeforeDeathActions
                if (beforeDeathActions && isGameRunning()) {
                    executeActions(beforeDeathActions, {
                        target: thisArg,
                        source: thisArg
                    })
                }

                const result = callNext(...args)

                const onDeathActions = thisArg.objdataOwn.OnDeathActions
                if (onDeathActions && isGameRunning()) {
                    executeActions(onDeathActions, {
                        target: thisArg,
                        source: thisArg
                    })
                }

                return result
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "characterOnEnable",
            handler: ({ args, thisArg, callNext }) => {
                const result = callNext(...args)

                const actions = thisArg.objdataOwn.OnEnableActions
                if (actions && isGameRunning()) {
                    executeActions(actions, {
                        target: thisArg,
                        source: thisArg
                    })
                }

                return result
            }
        })


    })
}