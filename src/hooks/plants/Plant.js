
export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const plant = ctx.engine.getSystemModule("chunks:///_virtual/Plant.ts");
        const cards = ctx.engine.getSystemModule("chunks:///_virtual/Cards.ts")
        const proto = plant.Plant.prototype;

        const plantKeys = {
            "OnEnablePropsOverride": null,
            //"ColorOffset": null,
            "CostOverride": null,
            "SpeedScale": 1,
            "InvincibleDuringPF": true,
            "HealAfterPF": true,
            "UsableInStages": null,
            "NoShadowBoost": null,
        }

        ctx.hooks.wrapProperty({
            target: proto,
            key: "_objdata",
            get: ({thisArg, value}) => {
                if (value) {
                    Object.entries(plantKeys).forEach(([prop, value]) => {
                        if (thisArg[prop] === undefined) thisArg[prop] = value
                    })
                }
                return value
            }
        })

        // ctx.hooks.wrapMethod({
        //     target: proto,
        //     methodName: "_getShouldColor",
        //     handler: ({thisArg, callOriginal}) => {
        //         const color = callOriginal();
        //
        //         const colorOffset = thisArg.objdata?.ColorOffset;
        //         if (
        //             colorOffset &&
        //             color.r === 255 &&
        //             color.g === 255 &&
        //             color.b === 255
        //         ) {
        //             const copy = color.clone();
        //             copy.set(colorOffset.r, colorOffset.g, colorOffset.b, color.a);
        //             return copy;
        //         }
        //
        //         return color;
        //     }
        // })
        //
        // ctx.hooks.wrapMethod({
        //     target: proto,
        //     methodName: "shouldColor",
        //     handler: ({ thisArg }) => {
        //         const color = thisArg._getShouldColor();
        //
        //         thisArg.anmControl.bodyPartsDB.forEach(part => {
        //             part.color = color.clone();
        //             let p = Object.getPrototypeOf(part);
        //         });
        //     }
        // });

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "die",
            handler: ({thisArg, callOriginal}) => {
                const result = callOriginal()

                cards.Cards.component.CFs.forEach((card) => {
                    card.SUNCOST += 0 // to update suncost on all cards
                })

                return result
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

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "food",
            handler: ({thisArg, callOriginal}) => {
                let originalHP = thisArg.health
                const result = callOriginal()

                if (thisArg.objdata.HealAfterPF === false) {
                    thisArg.health = originalHP
                }

                return result
            }
        })


        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "judgeShadowPlantMode",
            handler: ({thisArg, callOriginal}) => {
                if (thisArg.haveDarkMode && (thisArg.objdata ?? thisArg.objdataOwn).NoShadowBoost !== true) {
                    callOriginal()
                }
            }
        })


    })
}