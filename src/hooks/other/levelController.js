import {libProperties} from "./JSONs";
import {executeActions} from "../../modules/JSONActionsSystem";

export let isGameRunning

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const levelController = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/levelController.ts")
        const levelPlay = levelController.LevelPlay
        const proto = levelController.levelController.prototype

        isGameRunning = function () {
            return levelPlay.component.gaming
        }

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "readObj",
            handler: ({ args, thisArg, callNext }) => {
                const obj = args[0];

                switch (obj?.objclass) {
                    case "MaxSunAmountProps":
                    case "LLMaxSunAmountProps":
                        return thisArg.module_MaxSunAmountProps(obj.objdata)
                    case "LLSetOnUpdateActions":
                        return thisArg.module_SetOnUpdateActions(obj.objdata)
                    case "LLSetOnStartActions":
                        return thisArg.module_SetOnStartActions(obj.objdata)
                }

                return callNext(...args)
            }
        })

        proto.module_MaxSunAmountProps = function (data) {
            this.MaxSunAmount = data.MaxSunAmount
        }

        proto.module_SetOnStartActions = function (data) {
            this.OnStartActions = data.Actions
        }

        proto.module_SetOnUpdateActions = function (data) {
            this.OnUpdateActions = data.Actions
        }

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "readWave",
            handler: ({ args, thisArg, callNext }) => {
                const obj = args[0];

                switch (obj?.objclass) {
                    case "LLExecuteActions":
                        return thisArg.readWave_ExecuteActions(obj.objdata)
                }

                return callNext(...args)
            }
        })

        proto.readWave_ExecuteActions = function (data) {
            executeActions(data.Actions, {
                target: this,
                source: this
            })
        }

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "gameStart",
            handler: ({ args, thisArg, callNext }) => {
                const result = callNext(...args)

                if (thisArg.OnStartActions) {
                    executeActions(thisArg.OnStartActions, {
                        target: thisArg,
                        source: thisArg
                    })
                }

                return result
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "update",
            handler: ({args, thisArg, callNext}) => {
                callNext(...args)

                const deltaTime = args[0]

                if (thisArg.OnUpdateActions && isGameRunning()) {
                    executeActions(thisArg.OnUpdateActions, {
                        target: thisArg,
                        source: thisArg,
                        deltaTime: deltaTime
                    })
                }
            }
        })

    })
}