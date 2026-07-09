import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const hypnoShroom = ctx.engine.getSystemModule("chunks:///_virtual/HypnoShroom.ts")
        const proto = hypnoShroom.HypnoShroomPlant.prototype

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "specialPlantOnEaten",
            handler: ({args, thisArg, callOriginal}) => {
                const zombie = args[1]

                const immuneToHypnoShroom = zombie.objdata.ImmuneToHypnoShroom
                if (!immuneToHypnoShroom) return callOriginal(...args)
            }
        })


    })
}