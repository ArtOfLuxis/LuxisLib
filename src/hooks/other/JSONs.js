import {evaluate, executeActions} from "../../modules/JSONActionsSystem";

export let libProperties = undefined

export function init(ctx) {
    ctx.events.on("engine:ready", async () => {
        const JSONs = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/JSONs.ts")

        const luxisLibAlias =
            (await ctx.settings.get("luxisLibAlias")) ?? "LuxisLibProps"

        const sheets = JSONs.PvZ2ObjectContainer.PropertySheets
        if (!Array.isArray(sheets) || sheets.length === 0) {
            return
        }

        const match = sheets.find(obj =>
            Array.isArray(obj?.aliases) &&
            obj.aliases.includes(luxisLibAlias)
        );

        libProperties = match?.objdata ?? null

        if (!libProperties) {
            ctx.log.error(`Unable to load libProperties (${luxisLibAlias})`)
            ctx.ui.toast("Unable to load libProperties, add a PropertySheets file or try reloading!", "error")
        } else {
            ctx.ui.toast("Loaded libProperties", "success")
            ctx.events.emit("luxislib:properties")
        }
    })
}