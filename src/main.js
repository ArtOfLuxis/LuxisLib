
const modules = import.meta.glob('./**/*.js', {eager: true});

async function shouldForcePageReload(ctx) {
    if (!(await ctx.settings.get("allowForceReload"))) {
        return false
    }

    const firstLoadThisDocument =
        window.__luxisLoadedThisDocument !== true

    window.__luxisLoadedThisDocument = true

    const navigation = performance.getEntriesByType("navigation")[0]

    const pageWasReloaded =
        navigation?.type === "reload"

    return !pageWasReloaded || !firstLoadThisDocument
}

export async function setup(ctx) {
    const oldWarn = console.warn
    if (!oldWarn.___LuxisLibEdited) {
        oldWarn.___LuxisLibEdited = true

        console.warn = (...messages) => {
            if (!messages?.[0]?.includes("Can't find the plant with type name: \"\""))
                oldWarn(...messages)
        }
    }

    ctx.ui.toast("Initialized >w<", "success")
    for (const initModule of Object.values(modules)) {
        try {
            initModule.init(ctx)
        } catch (err) {
            ctx.ui.toast("error encountered :c", "error")
            ctx.log.error(err.message)
        }
    }

    const isAdvanced = await ctx.settings.get("isAdvanced")
    const advancedFields = [
        {
            key: "luxisLibAlias",
            label: "Lib Props Alias",
            type: "text",
            default: "LuxisLibProps"
        },
        {
            key: "seedPacketSettings",
            label: "SeedPacket Settings",
            type: "readonly"
        },
        {
            key: "seedPacketScaleX",
            label: "Scale X",
            type: "number",
            default: 0.75
        },
        {
            key: "seedPacketScaleY",
            label: "Scale Y",
            type: "number",
            default: 0.75
        },
        {
            key: "seedPacketSpacingX",
            label: "Spacing X",
            type: "number",
            default: 3
        },
        {
            key: "seedPacketSpacingY",
            label: "Spacing Y",
            type: "number",
            default: 3
        },
    ]
    const normalFields = [
        {
            key: "seedPacketSettings",
            label: "SeedPacket Settings",
            type: "readonly"
        },
        {
            key: "seedPacketCount",
            label: "Count",
            type: "slider",
            min: 2,
            max: 16,
            step: 1,
            default: 7
        },
    ]
    const fields = isAdvanced ? advancedFields : normalFields


    const defaultFields = [
        {
            key: "isAdvanced",
            label: "Advanced Settings (requires reload)",
            type: "toggle",
            default: false
        },
        {
            key: "allowForceReload",
            label: "Force Reload on Mod Reload",
            type: "toggle",
            default: true
        },
        {
            key: "hideMintIcons",
            label: "Hide SeedPacket Mint Icons",
            type: "toggle",
            default: false
        },
        {
            key: "deltaTimeThreshold",
            label: "Low FPS Slowdown",
            type: "slider",
            min: 0,
            max: 144,
            step: 1,
            default: 15
        },
        {
            key: "overrideFastForwardSpeed",
            label: "Override FastForward Speed",
            type: "toggle",
            default: false
        },
        {
            key: "fastForwardSpeed",
            label: "FastForward Speed",
            type: "slider",
            min: 0.1,
            max: 8,
            step: 0.05,
            default: 1.5
        },
    ]

    await ctx.settings.defineSchema({
        title: "Luxis Lib",
        fields: [
            ...defaultFields,
            ...fields,
        ]
    })

    const worldKeyCount = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/WorldKeyCount.ts")
    const playerProperties = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/PlayerProperties.ts")
    const allPlayerProperties = playerProperties.AllPlayerProperties

    ctx.controls.definePanel({
        title: 'Luxis Lib',
        groups: [
            {
                title: 'Quick Actions',
                items: [
                    {
                        type: 'action',
                        key: 'worldKey',
                        label: '+1 World Key',
                        async onClick() {
                            allPlayerProperties.currentPlayer.worldkey += 1
                            allPlayerProperties.savePP()
                            worldKeyCount.WorldKeyCount.component?.start()
                        }
                    },
                    {
                        type: 'action',
                        key: 'restart',
                        label: 'Quick Game Restart',
                        async onClick() {
                            location.reload()
                        }
                    }
                ]
            }
        ]
    })


    if (await shouldForcePageReload(ctx)) {
        ctx.log.info("Mod runtime reload detected; reloading page")
        ctx.ui.toast("Mod runtime reload detected; reloading page", "info")

        location.reload()
        return
    }

    ctx.log.info("Full initialization done")
}