import {libProperties} from "./JSONs";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const seedChooser = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/SeedChooser.ts")
        const playerProperties = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/PlayerProperties.ts")
        const plants = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Plants.ts")
        const soundResources = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/SoundRescourses.ts")
        const cardFeature = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/CardFeature.ts")
        const proto = seedChooser.SeedChooser.prototype

        const cc = ctx.unsafe.engine.getCc()

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "layCards",
            handler: async ({callNext, thisArg, args}) => {
                callNext(...args)

                const content = thisArg.ca0.node.parent

                const isAdvanced = await ctx.settings.get("isAdvanced")

                let scaleX, scaleY
                if (isAdvanced) {
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
                    const fontScale = libProperties?.PlantSunCostFontScale ?? 1
                    const fontSize = 66.1 * fontScale
                    const heightScale = libProperties?.PlantSunCostHeightScale ?? 1
                    const heightSize = 70 * heightScale

                    cf.ca._priceDB.fontSize = fontSize
                    cf.ca._priceDB.node.height = heightSize

                    if (cf.node.parent === thisArg.imitatorSlot) return
                    cf.node.setScale(scaleX, scaleY, 1)
                })

                const layout = content.components[1]

                layout._affectedByScale = true
                layout._layoutDirty = true
                layout._childrenDirty = true
                layout._spacingX = isAdvanced ? await ctx.settings.get("seedPacketSpacingX") : 3
                layout._spacingY = isAdvanced ? await ctx.settings.get("seedPacketSpacingY") : 3
            }
        })

        ctx.unsafe.hooks.wrapMethod({
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
                    true
                )

                const ca = cf.ca

                if (playerProperties.AllPlayerProperties.getPlantProgressByID(cf.ID).boost > 0) {
                    cf.PP_BOOSTED = true
                }

                if (isImitater) {
                    thisArg.imitatorSlot.parent.active = true
                    node.parent = thisArg.imitatorSlot
                    node.position = new cc.Vec3(0, 0, 0)

                    ca.suncostShown = true
                    ca.defaultSunCostShown = true
                }

                ca.seedChooserModeOn = true

                thisArg.judgeAllowed(cf, ca)
                thisArg.CFs.push(cf)

                node.on(cc.Node.EventType.TOUCH_END, () => {
                    thisArg.switchPlant(index, ca.disallowed)
                    soundResources.sounds.playCardChosen()
                })

                return cf
            }
        })


        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "judgeAllowed",
            handler: ({ args, callNext }) => {
                callNext(...args)

                const [cf, ca] = args

                const isImitater =
                    cf.PF?.RES?.Plant === "Imitater"

                if (!isImitater)
                    return

                if (ca.disallowed >= 1 && ca.disallowed <= 3)
                    return

                ca.disallowed = cf.Prop?.DoesntImitate ? 0 : 4
            }
        })

    })
}