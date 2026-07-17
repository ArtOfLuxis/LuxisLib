import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const splitPea = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/SplitPea.ts");
        const proto = splitPea.SplitPeaPlant.prototype;

        wrapObjDataOwnPlant(ctx, proto, {
            "BackPeaType": null,
        })


        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "_shootBack",
            handler: ({args, thisArg, callNext}) => {
                const peaType = args[2]
                const backPeaType = thisArg.objdataOwn.BackPeaType
                if (backPeaType && (peaType === undefined || peaType === thisArg.objdataOwn.PeaType)) {
                    args[2] = backPeaType
                }
                callNext(...args)
            }
        })


    })
}