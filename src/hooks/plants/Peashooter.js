
export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const peashooter = ctx.engine.getSystemModule("chunks:///_virtual/Peashooter.ts");
        const proto = peashooter.PeashooterPlant.prototype;

        const plantKeys = {
            "DetectorOverride": null,
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

    })
}