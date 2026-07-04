
export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const zombie = ctx.engine.getSystemModule("chunks:///_virtual/Zombie.ts");
        const proto = zombie.Zombie.prototype;

        const zombieKeys = {
            "OnEnablePropsOverride": null,
            "SpeedScale": 1,
            "ImmuneToChiliBean": false,
        }

        ctx.hooks.wrapProperty({
            target: proto,
            key: "_objdata",
            get: ({thisArg, value}) => {
                if (value) {
                    Object.entries(zombieKeys).forEach(([prop, value]) => {
                        if (thisArg[prop] === undefined) thisArg[prop] = value
                    })
                }
                return value
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "defaultShouldSpeedScale",
            handler: ({thisArg, callOriginal}) => {
                let speed = callOriginal()

                const speedScale = thisArg.objdata.SpeedScale;
                if (speedScale) speed *= speedScale

                return speed;
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "chilibeanFart",
            handler: ({args, thisArg, callOriginal}) => {
                if (thisArg.objdata.ImmuneToChiliBean) return

                callOriginal()
            }
        })


        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "characterOnEnable",
            handler: ({thisArg, callOriginal}) => {
                callOriginal()

                const onEnablePropsOverride = thisArg.objdata.OnEnablePropsOverride;
                if (onEnablePropsOverride) {
                    Object.entries(onEnablePropsOverride).forEach(([prop, value]) => {
                        thisArg[prop] = value
                    })
                }
            }
        })

    })
}