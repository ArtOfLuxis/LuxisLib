import {libProperties} from "./JSONs";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const seedChooser = ctx.engine.getSystemModule("chunks:///_virtual/SeedChooser.ts")
        const playerProperties = ctx.engine.getSystemModule("chunks:///_virtual/PlayerProperties.ts")
        const plants = ctx.engine.getSystemModule("chunks:///_virtual/Plants.ts")
        const soundResources = ctx.engine.getSystemModule("chunks:///_virtual/SoundRescourses.ts")
        const cardFeature = ctx.engine.getSystemModule("chunks:///_virtual/CardFeature.ts")
        const proto = seedChooser.SeedChooser.prototype

        const cc = ctx.engine.getCc()

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "layCards",
            handler: async ({callOriginal, thisArg, args}) => {
                callOriginal(...args)

                const content = thisArg.ca0.node.parent

                let scaleX, scaleY
                if (await ctx.settings.get("isAdvanced")) {
                    scaleX = await ctx.settings.get("seedPacketScaleX")
                    scaleY = await ctx.settings.get("seedPacketScaleY")
                } else {
                    const seedPacketCount = await ctx.settings.get("seedPacketCount")
                    const scale = 5.14 / seedPacketCount
                    scaleX = scale
                    scaleY = scale

                    content.setPosition(
                        content.position.x + (30 / (seedPacketCount - 1)),
                        content.position.y,
                        content.position.z
                    )
                }
                thisArg.CFs.forEach((cf, i) => {
                    if (cf.node.parent === thisArg.imitatorSlot) return
                    cf.node.setScale(scaleX, scaleY, 1);
                });

                const layout = content.components[1]

                layout._affectedByScale = true
                layout._layoutDirty = true
                layout._childrenDirty = true
                layout._spacingX = 3
                layout._spacingY = 4
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "addOneCard",
            handler: ({ args, thisArg }) => {
                let [type, index] = args

                const imitaterType = libProperties?.ImitaterSlotPlant ?? "imitater"

                const node = cc.instantiate(thisArg.ca0.node)
                node.parent = thisArg.ca0.node.parent

                const cf = node.getComponent(cardFeature.CardFeature)

                const isImitater =
                    type === imitaterType

                cf.cardGrouperByType(
                    isImitater ? imitaterType : type,
                    !isImitater
                )

                const ca = cf.ca

                if (playerProperties.AllPlayerProperties.getPlantProgressByID(cf.ID).boost > 0) {
                    cf.PP_BOOSTED = true
                }

                if (isImitater) {
                    thisArg.imitatorSlot.parent.active = true
                    node.parent = thisArg.imitatorSlot
                    node.position = new cc.Vec3(0, 0, 0)

                    ca.suncostShown = false
                    ca.defaultSunCostShown = false
                }

                ca.seedChooserModeOn = true

                thisArg.judgeAllowed(cf, ca)
                thisArg.CFs.push(cf)

                node.on(cc.Node.EventType.TOUCH_END, () => {
                    thisArg.switchPlant(index, ca.disallowed)
                    soundResources.sounds.playCardChosen()
                })
            }
        })

    })
}