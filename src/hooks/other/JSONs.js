import JSON5 from "json5"

export let libProperties
export let libWorldmapProperties
export let customLevels = {}

export function findCustomLevel(levelID) {
    return customLevels[levelID]
}

export function init(ctx) {
    ctx.events.on("engine:ready", async () => {
        const JSONs = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/JSONs.ts")

        const luxisLibAlias = "LuxisLibProps"
        const luxisLibWorldmapAlias = "LuxisLibWorldmapProps"

        const sheets = JSONs.PvZ2ObjectContainer.PropertySheets
        if (!Array.isArray(sheets) || sheets.length === 0) {
            return
        }

        const matchLibProps = sheets.find(obj =>
            Array.isArray(obj?.aliases) &&
            obj.aliases.includes(luxisLibAlias)
        )
        const matchLibWorldmapProps = sheets.find(obj =>
            Array.isArray(obj?.aliases) &&
            obj.aliases.includes(luxisLibWorldmapAlias)
        )

        libProperties = matchLibProps?.objdata ?? null
        libWorldmapProperties = matchLibWorldmapProps?.objdata ?? null

        if (!libProperties) {
            ctx.log.error("Unable to load libProperties")
            ctx.ui.toast("Unable to load libProperties, add a PropertySheets file or try reloading!", "error")
        } else {
            ctx.log.info("Loaded libProperties")
            ctx.ui.toast("Loaded libProperties", "success")

            try {
                const folder = libProperties.CustomLevelFolder.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "")
                const contributions = ctx.files.contributions()

                customLevels = {}

                for (const pack of contributions) {
                    for (const path of pack.listPaths()) {
                        const normalizedPath = path.replace(/\\/g, "/")

                        if (!normalizedPath.startsWith(`${folder}/`) || !/\.(json|json5)$/i.test(normalizedPath)) {
                            continue
                        }

                        try {
                            const content = await pack.readText(normalizedPath)

                            if (content === null) {
                                continue
                            }

                            const fileName = normalizedPath.slice(normalizedPath.lastIndexOf("/") + 1)
                            const levelID = fileName.replace(/\.(json|json5)$/i, "")
                            const data = JSON5.parse(content)

                            console.log("Level file:", levelID, data)
                            console.log("Level definition:", data.objects?.find(obj => obj.objclass === "LevelDefinition"))

                            customLevels[levelID] = data
                        } catch (error) {
                            ctx.log.error(`Unable to load custom level file ${normalizedPath}: ${error}`)
                        }
                    }
                }

                ctx.log.info(`Loaded ${Object.keys(customLevels).length} custom level(s) from ${contributions.length} contributing pack(s): ${contributions.map((p)=>p.namespace)}`)
            } catch (error) {
                ctx.log.error(`Unable to read custom level directory: ${error}`)
            }

            ctx.events.emit("lib-properties")
        }

        if (libWorldmapProperties) {
            ctx.log.info("Loaded libWorldmapProperties")
            ctx.ui.toast("Loaded libWorldmapProperties", "success")
            ctx.events.emit("worldmap-properties")
        }
    })
}