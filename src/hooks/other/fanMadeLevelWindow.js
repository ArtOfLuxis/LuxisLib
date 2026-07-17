import {libProperties} from "./JSONs";

export function init(ctx) {
    ctx.events.on("luxislib:properties", () => {
        const fanMadeLevelWindow = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/fanMadeLevelWindow.ts")
        const JSONs = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/JSONs.ts")
        const levelController = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/levelController.ts")
        const keyListener = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/KeyListener.ts")
        const proto = fanMadeLevelWindow.fanmadeLevelsWindow.prototype

        const sheets = JSONs.PvZ2ObjectContainer.PropertySheets

        const cc = ctx.unsafe.engine.getCc()

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "onEnable",
            handler: ({ args, thisArg, callNext }) => {
                if (!thisArg.__LuxisLibLevelsAdded && libProperties?.ArcadeCustomLevels) {
                    const firstCategory = thisArg.fanMadeLevelName0.node.parent.parent
                    const categories = firstCategory.parent.children

                    if (sheets.find(level =>
                        level.objclass === "CustomLevelDefinition"
                    ) === null) {
                        ctx.log.error("Unable to load levels for Arcade: no custom levels loaded (CustomLevelDefinition in PropertySheets)")
                        ctx.ui.toast("Unable to load levels for Arcade", "error")

                        return callNext(...args)
                    }

                    for (const [categoryName, customLevelObject] of Object.entries(libProperties.ArcadeCustomLevels)) {

                        const category = categories.find(category =>
                            category.getChildByName("Title")
                                ?.getComponent(cc.Label)
                                ?.string === categoryName
                        )

                        Object.entries(customLevelObject).forEach(([customLevelID, customLevelName]) => {

                            const customLevel = sheets.find(level =>
                                level.aliases?.includes(customLevelID) &&
                                level.objclass === "CustomLevelDefinition"
                            )

                            const levelData = customLevel?.objdata?.LevelModules
                            if (!levelData) {
                                ctx.log.error("Unable to load level for Arcade: " + customLevelID + " (only custom levels supported)")
                                ctx.ui.toast("Unable to load level for Arcade", "error")
                                return
                            }

                            const definitionData = levelData.find((module) => module.objclass === "LevelDefinition")?.objdata
                            if (!definitionData) {
                                ctx.log.error("No LevelDefinition in a level for Arcade: " + customLevelID)
                                ctx.ui.toast("No LevelDefinition in a level for Arcade", "error")
                                return
                            }

                            const levelTemplate = category.getChildByName("Level")

                            const level = cc.instantiate(levelTemplate)
                            level.parent = levelTemplate.parent

                            const levelName = level.getChildByName("LevelName")
                            levelName.getComponent(cc.Label).string = customLevelName

                            const info = levelName.parent
                            info.getChildByName("WrittenBy")
                                .getComponent(cc.Label)
                                .string = definitionData.WrittenBy ?? ""

                            info.getChildByName("LevelInGameName")
                                .getComponent(cc.Label)
                                .string = definitionData.Name

                            level.on(cc.Node.EventType.TOUCH_END, async () => {
                                levelController.LevelPlay.levelData = levelData;
                                levelController.LevelPlay.thisLevelsID = [];
                                levelController.LevelPlay.nextLevelsID = [];

                                await keyListener.KeyListener.darken();

                                levelController.LevelPlay.thisLevelsID = [];
                                await keyListener.KeyListener.GoToGame([levelData])
                            })

                            thisArg.__LuxisLibLevelsAdded = true
                        })
                    }
                }

                return callNext(...args)
            }
        })

    })
}