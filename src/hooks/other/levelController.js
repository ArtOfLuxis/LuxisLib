import {libProperties} from "./JSONs";
import {executeActions} from "../../modules/JSONActionsSystem";

export let isGameRunning

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const levelController = ctx.engine.getSystemModule("chunks:///_virtual/levelController.ts")
        const levelPlay = levelController.LevelPlay
        const proto = levelController.levelController.prototype

        isGameRunning = function () {
            return levelPlay.component.gaming
        }

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "readObj",
            handler: ({ args, thisArg, callOriginal }) => {
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

                return callOriginal(...args)
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

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "gameStart",
            handler: ({ args, thisArg, callOriginal }) => {
                const result = callOriginal(...args)

                if (thisArg.OnStartActions) {
                    executeActions(thisArg.OnStartActions, {
                        target: thisArg,
                        source: thisArg
                    })
                }

                return result
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "update",
            handler: ({args, thisArg, callOriginal}) => {
                callOriginal(...args)

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