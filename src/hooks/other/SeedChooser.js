import {libProperties} from "./JSONs";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const seedChooser = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/SeedChooser.ts")
        const playerProperties = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/PlayerProperties.ts")
        const plants = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Plants.ts")
        const soundResources = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/SoundRescourses.ts")
        const cardFeature = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/CardFeature.ts")
        const nodePools = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/NodePools.ts")
        const cards = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Cards.ts")
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

                const disabled = thisArg.___LuxisLibDisabledBoostIndexes
                thisArg.CFs.forEach((cf, index) => {
                    if (playerProperties.AllPlayerProperties.getPlantProgressByID(cf.ID).boost > 0) {
                        cf._PP_BOOSTED = !disabled?.has(index)
                        if (cf._PP_BOOSTED) cf.PP_BOOSTED = true
                    }

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


                const disabled = thisArg.___LuxisLibDisabledBoostIndexes
                if (playerProperties.AllPlayerProperties.getPlantProgressByID(cf.ID).boost > 0) {
                    cf._PP_BOOSTED = !disabled?.has(index)
                    if (cf._PP_BOOSTED) cf.PP_BOOSTED = true
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
            methodName: "readPlantBoost",
            handler: ({ args, thisArg, callNext }) => {
                const [plantID, plantProgress] = args

                callNext(...args)

                thisArg.___LuxisLibDisabledBoostIndexes ??= new Set()
                const disabled = thisArg.___LuxisLibDisabledBoostIndexes

                if (disabled.has(thisArg.current_card_index)) {
                    thisArg.displayBG.spriteFrame = plants.plants.getPlantBGSprite(plantID)
                }

                const plantFeatures = plants.plants.getPlantFeature(plantID)

                if (!thisArg.___LuxisLibLevelingButton) {
                    const buttonNode = nodePools.instantiatePooly(thisArg.boostButton.node)
                    buttonNode.parent = thisArg.boostButton.node.parent

                    const widget = buttonNode.getComponent(cc.Widget)
                    widget.isAlignRight = false
                    widget.isAlignLeft = true
                    widget.left = (libProperties?.SeedChooserLevelingSwitchButtonOffset ?? 0) + 515
                    widget.updateAlignment()

                    const button = buttonNode.getComponent(thisArg.boostButton.constructor)
                    button.node.getChildByName("icon_gem").active = false
                    button.node.getChildByName("boost_gem").active = false

                    button.dealClickEvents = function () {
                        const codename = button.___LuxisLibCodename
                        const plantID = button.___LuxisLibPlantID
                        const levelingState = gpNext.plantLevels.get(codename)
                        if (!levelingState) return

                        const level = (levelingState.selectedLevel % levelingState.unlockedLevel) + 1

                        gpNext.plantLevels.setSelected(codename, level, true)

                        thisArg.CFs.forEach(cf => {
                            if (cf.ID === plantID) {
                                cf.cardGrouperByType(codename, true)
                                thisArg.judgeAllowed(cf, cf.ca)
                            }
                        })

                        cards.Cards.component.CFs.forEach(cf => {
                            if (cf.ID === plantID) {
                                cf.cardGrouperByType(codename, true)
                                thisArg.judgeAllowed(cf, cf.ca)
                            }
                        })

                        const index = thisArg.current_card_index
                        thisArg.current_card_index = -1

                        thisArg.switchPlant(
                            index,
                            thisArg.CFs[index].ca.disallowed
                        )
                    }

                    thisArg.___LuxisLibLevelingButton = button
                }

                const codename = plantFeatures.CODENAME

                const baseCodename = gpNext.plantLevels.getBaseCodename(codename)
                const levelingState = gpNext.plantLevels.get(baseCodename)

                const button = thisArg.___LuxisLibLevelingButton
                button.___LuxisLibCodename = baseCodename
                button.___LuxisLibPlantID = plantID
                button.node.active = (levelingState !== null)

                const buttonNode = button.node

                if (levelingState) {
                    button.node.getChildByName("boost").components[1].string = (
                        libProperties?.SeedChooserLevelingSwitchButtonText ?? "LVL current/max")
                            .replace("current", levelingState.selectedLevel.toString())
                            .replace("max", levelingState.unlockedLevel.toString())
                }


                if (!thisArg.___LuxisLibUnboostButton) {
                    const buttonNode = nodePools.instantiatePooly(thisArg.boostButton.node)
                    buttonNode.parent = thisArg.boostButton.node.parent

                    const widget = buttonNode.getComponent(cc.Widget)
                    widget.isAlignRight = false
                    widget.isAlignLeft = true
                    widget.left = 800
                    widget.updateAlignment()

                    const button = buttonNode.getComponent(thisArg.boostButton.constructor)

                    button.node.getChildByName("icon_gem").active = false
                    button.node.getChildByName("boost_gem").active = false

                    button.dealClickEvents = function () {
                        const disabled = thisArg.___LuxisLibDisabledBoostIndexes
                        const plantID = button.___LuxisLibPlantID
                        const codename = button.___LuxisLibCodename
                        const index = thisArg.current_card_index

                        if (disabled.has(index)) {
                            disabled.delete(index)
                        } else {
                            disabled.add(index)
                        }

                        thisArg.CFs.forEach(cf => {
                            if (cf.ID === plantID) {
                                cf._PP_BOOSTED = !disabled.has(index)
                                if (cf._PP_BOOSTED) cf.PP_BOOSTED = true
                                cf.cardGrouperByType(codename, true)
                                thisArg.judgeAllowed(cf, cf.ca)
                            }
                        })

                        cards.Cards.component.CFs.forEach(cf => {
                            if (cf.ID === plantID) {
                                cf._PP_BOOSTED = !disabled.has(index)
                                if (cf._PP_BOOSTED) cf.PP_BOOSTED = true
                                cf.cardGrouperByType(codename, true)
                                thisArg.judgeAllowed(cf, cf.ca)
                            }
                        })

                        thisArg.current_card_index = -1
                        thisArg.switchPlant(index, thisArg.CFs[index].ca.disallowed)
                    }

                    thisArg.___LuxisLibUnboostButton = button
                }
                const unboostButton = thisArg.___LuxisLibUnboostButton

                unboostButton.node.getChildByName("boost").components[1].string =
                    thisArg.___LuxisLibDisabledBoostIndexes.has(thisArg.current_card_index) ?
                        "✔" :
                        "✗"

                unboostButton.___LuxisLibPlantProgress = plantProgress
                unboostButton.___LuxisLibPlantID = plantID
                unboostButton.___LuxisLibCodename = codename
                unboostButton.node.active = plantProgress.boost > 0
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