import {projectileWrapHits} from "./commonShot";
import {executeActions} from "../../modules/JSONActionsSystem";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const infernoTornado = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/infernoTornado.ts")
        const proto = infernoTornado.infernoTornado.prototype

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "zombieCanBeCarried",
            handler: ({ args, thisArg, callNext }) => {
               return callNext(...args) && args[0].objdataOwn.CannotBeCarriedByInferno !== true
            }
        })
    })
}