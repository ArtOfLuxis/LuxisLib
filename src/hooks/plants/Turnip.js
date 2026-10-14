import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const turnip = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Turnip.ts");
        const proto = turnip.TurnipPlant.prototype;

        wrapObjDataOwnPlant(ctx, proto, {
            "PlantfoodChildrenCount": 2
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "characterOnEnable",
            handler: ({args, thisArg, callNext}) => {
                callNext(...args)

                const foodThrowAmount = thisArg.objdataOwn.PlantfoodChildrenCount;
                if (typeof foodThrowAmount === "number" && isFinite(foodThrowAmount))
                    thisArg.maxFoodThrowAmount = foodThrowAmount;
            }
        })

    })
}