
export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const cc = ctx.unsafe.engine.getCc()

        const JSONs = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/JSONs.ts")
        const sheets = JSONs.PvZ2ObjectContainer.PropertySheets

        ctx.unsafe.hooks.wrapMethod({
            target: cc.resources,
            methodName: "load",
            handler: async ({args, callNext}) => {
                const [path, callback] = args;

                if (path.startsWith("levels/")) {
                    const levelID = path.replace("levels/", "");
                    const customLevel = sheets.find(level =>
                        level.aliases?.includes(levelID) &&
                        level.objclass === "CustomLevelDefinition"
                    )
                    if (customLevel) {
                        ctx.log.info(`Loaded custom level: ${levelID}`);
                        callback(
                            null,
                            {json: {objects: customLevel.objdata.LevelModules}}
                        )

                        return;
                    }
                }

                return callNext(...args)
            }
        })
    })
}