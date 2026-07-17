import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const appleMortar = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/AppleMortar.ts");
        const proto = appleMortar.AppleMortar.prototype;

        wrapObjDataOwnPlant(ctx, proto, {
            "ExtraSideApples": false,
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "animationListener",
            handler: ({ args, thisArg, callNext }) => {
                const animation = args[0]

                if (!thisArg.objdataOwn.ExtraSideApples || animation.name !== "Shoot")
                    return callNext(...args)

                thisArg.soundRes.playLobSounds()

                if (thisArg.inLane.LaneIndex !== 0) {
                    thisArg._shoot(thisArg.inLane.UpperLane)
                } else {
                    thisArg.scheduleOnce(() => {
                        thisArg._shoot(thisArg.inLane)
                    }, 0.1)
                }

                thisArg._shoot(thisArg.inLane);

                if (thisArg.inLane.LaneIndex !== 4) {
                    thisArg._shoot(thisArg.inLane.LowerLane)
                } else {
                    thisArg.scheduleOnce(() => {
                        thisArg._shoot(thisArg.inLane)
                    }, 0.1)
                }

                thisArg._shooting = false
            }
        });

    })
}