import {isGameRunning} from "../other/levelController";
import {executeActions} from "../../modules/JSONActionsSystem";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const tomb = ctx.engine.getSystemModule("chunks:///_virtual/Tomb.ts")
        const proto = tomb.Tomb.prototype

        const tombKeys = {
            "ForceHypnotized": null,
            "OnEnableActions": null,
            "OnUpdateActions": null,
            "OnDamageActions": null,
            "BeforeDamageActions": null,
            "OnDeathActions": null,
            "BeforeDeathActions": null,
        }

        ctx.hooks.wrapProperty({
            target: proto,
            key: "_objdataOwn",
            get: ({ thisArg, value }) => {
                if (value) {
                    Object.entries(tombKeys).forEach(([prop, propValue]) => {
                        if (value[prop] === undefined) value[prop] = propValue
                    })
                }
                return value
            }
        })

        ctx.hooks.wrapProperty({
            target: proto,
            key: "scale",
            get: ({ thisArg, value }) => {
                if (thisArg.hypnotized) return -value
                return value
            }
        })


        ctx.hooks.wrapProperty({
            target: proto,
            key: "hypnotized",
            get: ({ thisArg, value }) => {
                if (thisArg.objdataOwn.ForceHypnotized) return true
                return value
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "update",
            handler: ({ args, thisArg, callOriginal }) => {
                callOriginal(...args)

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

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "dealDamage",
            handler: ({ args, thisArg, callOriginal }) => {
                const damageDetails = args[0]

                const beforeDamageActions = thisArg.objdataOwn.BeforeDamageActions
                if (beforeDamageActions && isGameRunning()) {
                    executeActions(beforeDamageActions, {
                        target: thisArg,
                        source: thisArg,
                        damageDetails: damageDetails
                    })
                }

                const result = callOriginal(...args)

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

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "characterOnEnable",
            handler: ({ args, thisArg, callOriginal }) => {
                const result = callOriginal(...args)

                const onEnableActions = thisArg.objdataOwn.OnEnableActions
                if (onEnableActions && isGameRunning()) {
                    executeActions(onEnableActions, {
                        target: thisArg,
                        source: thisArg
                    })
                }

                return result
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "die",
            handler: ({ args, thisArg, callOriginal }) => {

                const beforeDeathActions = thisArg.objdataOwn.BeforeDeathActions
                if (beforeDeathActions && isGameRunning()) {
                    executeActions(beforeDeathActions, {
                        target: thisArg,
                        source: thisArg
                    })
                }

                const result = callOriginal(...args)

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

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "characterOnEnable",
            handler: ({ args, thisArg, callOriginal }) => {
                const result = callOriginal(...args)

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