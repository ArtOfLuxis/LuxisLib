
export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const seedChooser = ctx.engine.getSystemModule("chunks:///_virtual/SeedChooser.ts");
        const proto = seedChooser.SeedChooser.prototype;

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "layCards",
            handler: async ({callOriginal, thisArg, args}) => {
                callOriginal(...args);

                let scaleX, scaleY
                if (await ctx.settings.get("isAdvanced")) {
                    scaleX = await ctx.settings.get("seedPacketScaleX")
                    scaleY = await ctx.settings.get("seedPacketScaleY")
                } else {
                    const scale = await ctx.settings.get("seedPacketScale")
                    scaleX = scale
                    scaleY = scale
                }
                thisArg.CFs.forEach((cf, i) => {
                    if (cf.node.parent === thisArg.imitatorSlot) return;
                    cf.node.setScale(scaleX, scaleY, 1);
                });

                const content = thisArg.ca0.node.parent

                // content.setPosition(
                //     content.position.x + 10,
                //     content.position.y,
                //     content.position.z
                // );

                const layout = content.components[1]

                layout._affectedByScale = true
                layout._layoutDirty = true
                layout._childrenDirty = true
                layout._spacingX = 3
                layout._spacingY = 4
            }
        });

    })
}