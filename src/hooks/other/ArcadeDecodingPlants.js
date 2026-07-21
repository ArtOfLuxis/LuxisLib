import {libProperties} from "./JSONs";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const arcadeDecodingPlants = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/ArcadeDecodingPlants.ts")
        const arcadePlantCard = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/ArcadePlantCard.ts")
        const arcadeWindow = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/ArcadeWindow.ts")
        const arrayGet = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/ArrayGet.ts")
        const playerProperties = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/PlayerProperties.ts")
        const allPlayerProperties = playerProperties.AllPlayerProperties
        const proto = arcadeDecodingPlants.ArcadeDecodingPlants.prototype

        const cc = ctx.unsafe.engine.getCc()

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "specialArcadeOnLoad",
            handler: ({ thisArg, callNext }) => {
                const json = thisArg.FeatureJson.json

                json.FIRST_RECORDED_BASES ??= json.BASES
                json.FIRST_RECORDED_MERGES ??= json.MERGES

                if (libProperties?.DecodeBasePlantsReplace === true)
                    json.BASES = []
                else json.BASES = json.FIRST_RECORDED_BASES
                json.BASES = json.BASES.concat(libProperties?.DecodeBasePlants ?? [])

                if (libProperties?.DecodeCodePlantsReplace === true)
                    json.MERGES = []
                else json.MERGES = json.FIRST_RECORDED_MERGES
                json.MERGES = json.MERGES.concat(libProperties?.DecodeCodePlants ?? [])

                return callNext()
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "readBases",
            handler: ({ thisArg, callNext }) => {
                callNext()

                const content = thisArg.baseParent

                const layout = content.getComponent(cc.Layout)
                layout._spacingX = libProperties?.DecodeBasePlantCardsSpacingX ?? 3.8
                layout._spacingY = libProperties?.DecodeBasePlantCardsSpacingY ?? 5.9
                layout._affectedByScale = true
                layout._layoutDirty = true
                layout._childrenDirty = true

                const plantScale = libProperties?.DecodeBasePlantCardsScale
                thisArg.BaseCards.forEach(card => {
                    card.___LuxisLibScale = plantScale
                    card.node.setScale(
                        plantScale?.x ?? 1,
                        plantScale?.y ?? 1,
                        1
                    )
                })

                const mergeLayout = content.getComponent(cc.Layout)
                mergeLayout._affectedByScale = true
                mergeLayout._layoutDirty = true
                mergeLayout._childrenDirty = true

                const mergePlantScale = libProperties?.DecodeMergePlantCardsScale
                thisArg.MergedCards.forEach(card => {
                    const newScale = {
                        "x": (mergePlantScale?.x ?? 1) -
                            (libProperties?.DecodeMergePlantCardsScaleDecrementPerPlant ?? 0) *
                            thisArg.CodePlants.length,
                        "y": (mergePlantScale?.y ?? 1) -
                            (libProperties?.DecodeMergePlantCardsScaleDecrementPerPlant ?? 0) *
                            thisArg.CodePlants.length,
                    }
                    card.___LuxisLibScale = newScale
                    card.node.setScale(
                        newScale.x,
                        newScale.y,
                        1
                    )
                })
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "confirm",
            handler: ({ thisArg, callNext }) => {
                const layout = thisArg.recordParent.getComponent(cc.Layout)
                layout._affectedByScale = true
                layout._spacingX = libProperties?.DecodeRecordSpacingX ?? layout._spacingX
                layout._spacingY = libProperties?.DecodeRecordSpacingY ?? layout._spacingY
                layout._paddingBottom = libProperties?.DecodeRecordPadding ?? layout._paddingBottom
                layout._paddingTop = libProperties?.DecodeRecordPadding ?? layout._paddingTop
                layout._layoutDirty = true
                layout._childrenDirty = true

                console.log(thisArg.recordParent)

                return callNext()
            }
        })


        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "readWidths",
            handler: ({ thisArg }) => {
                const progress = arrayGet.ValueRange.getProgress(
                    new arrayGet.ValueRange(10, 5),
                    thisArg.CodePlants.length * (
                        (libProperties?.DecodeMergePlantCardsScale?.x ?? 1) -
                            (libProperties?.DecodeMergePlantCardsScaleDecrementPerPlant ?? 0) *
                                thisArg.CodePlants.length
                    ),
                    false,
                    false
                )

                thisArg.panel.width =
                    arrayGet.ValueRange.getFromRangeByProgress(thisArg.panel_w_range, progress)

                thisArg.panel_below.width =
                    arrayGet.ValueRange.getFromRangeByProgress(thisArg.panel_below_w_range, progress)

                thisArg.panel_2.width =
                    arrayGet.ValueRange.getFromRangeByProgress(thisArg.panel_2_w_range, progress)

                thisArg.panel_below_2.width =
                    arrayGet.ValueRange.getFromRangeByProgress(thisArg.panel_below_2_w_range, progress)

                thisArg.mergeParent.width =
                    arrayGet.ValueRange.getFromRangeByProgress(thisArg.merge_w_range, progress)

                thisArg.lineDB.node.parent.setScale(
                    arrayGet.ValueRange.getFromRangeByProgress(thisArg.line_sc_w_range, progress),
                    1,
                    1
                )
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "setCodes",
            handler: ({ thisArg, callNext }) => {
                callNext()

                const available = new Set(thisArg.BasePlants)

                let changed
                do {
                    changed = false

                    for (const recipe of thisArg.MergeFeatures) {
                        if (
                            available.has(recipe.PlantA) &&
                            available.has(recipe.PlantB) &&
                            !available.has(recipe.Target)
                        ) {
                            available.add(recipe.Target)
                            changed = true
                        }
                    }
                } while (changed)

                const extraTargets = thisArg.MergeFeatures
                    .filter(recipe =>
                        available.has(recipe.Target) &&
                        !thisArg.CodePlants.includes(recipe.Target)
                    )
                    .map(recipe => recipe.Target)

                thisArg.CodePlants = arrayGet.ArrayGet
                    .shuffle([...thisArg.CodePlants, ...extraTargets])
                    .slice(0, arcadeDecodingPlants.ArcadeDecodingPlants.MaxCodeCount)

                console.log(thisArg.CodePlants)
                console.log(available)

                return thisArg.CodePlants
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "victory",
            handler: async ({ thisArg, callNext }) => {
                const formula = libProperties?.DecodeGemFormula
                if (!thisArg.GivesGems || !formula)
                    return await callNext()

                const original = thisArg.GivesGems
                thisArg.GivesGems = false

                const BASE_PLANTS = thisArg.BasePlants.length
                const CODE_PLANTS = thisArg.CodePlants.length
                const GUESSES = thisArg.step

                await callNext()

                thisArg.GivesGems = original

                const gems = Function(
                    "BASE_PLANTS",
                    "CODE_PLANTS",
                    "GUESSES",
                    "Math",
                    `return ${formula}`
                )(BASE_PLANTS, CODE_PLANTS, GUESSES, Math)

                allPlayerProperties.currentPlayer.arcade_plant_decoding.gem_today = gems
                materials.Materials.component?.addGemCount(gems)
            }
        })

        arcadeWindow.ArcadeWindow.prototype.onEnable = function() {
            // update ge date to check if decoding should be refreshed
            const result = allPlayerProperties.getToday(true)
            if (result?.decodeChanged && (libProperties?.ClearDecodeGemTextOnRefresh ?? true)) {
                this.plant_decoding_gem_count_icon.node.active = false
                this.plant_decoding_gem_count_left_label.string = ""
                this.plant_decoding_gem_count_right_label.string = ""
                this.plant_decoding_gem_count_mid_label.string = ""
            }
        }

        ctx.unsafe.hooks.wrapMethod({
            target: arcadeWindow.ArcadeWindow.prototype,
            methodName: "read_plant_decoding_count",
            handler: ({ thisArg, callNext }) => {
                callNext()

                const baseProgress = thisArg.plant_decoding_base_count_slider.progress
                const codeProgress = thisArg.plant_decoding_code_count_slider.progress

                const baseRange = libProperties?.DecodeBasePlantsAmountRange ?? [3, 10]
                arcadeDecodingPlants.ArcadeDecodingPlants.MaxBaseCount = Math.round(
                    arrayGet.ValueRange.getFromRangeByProgress(
                        new arrayGet.ValueRange(baseRange[1], baseRange[0]),
                        baseProgress
                    )
                )

                const codeRange = libProperties?.DecodeCodePlantsAmountRange ?? [3, 10]
                arcadeDecodingPlants.ArcadeDecodingPlants.MaxCodeCount = Math.round(
                    arrayGet.ValueRange.getFromRangeByProgress(
                        new arrayGet.ValueRange(codeRange[1], codeRange[0]),
                        codeProgress
                    )
                )

                thisArg.plant_decoding_base_count_label.string =
                    arcadeDecodingPlants.ArcadeDecodingPlants.MaxBaseCount.toString()

                thisArg.plant_decoding_code_count_label.string =
                    arcadeDecodingPlants.ArcadeDecodingPlants.MaxCodeCount.toString()
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: arcadePlantCard.ArcadePlantCard.prototype,
            methodName: "shake",
            handler: ({ thisArg, args, callNext }) => {
                const mult = args[0] ?? 1
                const scale = thisArg.___LuxisLibScale

                if (!scale)
                    return callNext(...args)

                cc.Tween.stopAllByTarget(thisArg.node)

                thisArg.node.setScale(
                    scale?.x ?? 1,
                    scale?.y ?? 1,
                    1
                )

                cc.tween(thisArg.node)
                    .to(0.05, {
                        scale: new cc.Vec3(scale.x * mult * 0.8, scale.y * mult * 0.8, 1)
                    })
                    .to(0.1, {
                        scale: new cc.Vec3(scale.x * mult * 1.1, scale.y * mult * 1.1, 1)
                    })
                    .to(0.1, {
                        scale: new cc.Vec3(scale.x * mult, scale.y * mult, 1)
                    }).start()
            }
        })

    })
}