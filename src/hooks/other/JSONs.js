export let libProperties;
export let libCustomLevels = [];

export function init(ctx) {
    ctx.events.on("engine:ready", async () => {
        const JSONs = ctx.engine.getSystemModule("chunks:///_virtual/JSONs.ts")

        const luxisLibAlias =
            (await ctx.settings.get("luxisLibAlias")) ?? "LuxisLibProps"

        const sheets = JSONs.PvZ2ObjectContainer.PropertySheets;
        if (!Array.isArray(sheets) || sheets.length === 0) {
            return;
        }

        const match = sheets.find(obj =>
            Array.isArray(obj?.aliases) &&
            obj.aliases.includes(luxisLibAlias)
        );

        libProperties = match?.objdata ?? null

        if (!libProperties) {
            ctx.log.error(`Unable to load libProperties (${luxisLibAlias})`)
            ctx.ui.toast("Unable to load libProperties, try reloading!", "error")
        } else {
            ctx.ui.toast("Loaded libProperties", "info")
            ctx.events.emit("luxislib:properties")
        }


        libCustomLevels = sheets.filter(obj =>
            Array.isArray(obj?.aliases) &&
            obj.objclass === "CustomLevelDefinition"
        )

        console.log(libCustomLevels)
    })
}