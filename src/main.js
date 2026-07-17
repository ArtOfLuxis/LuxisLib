
const modules = import.meta.glob('./**/*.js', {eager: true});

export async function setup(ctx) {
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
            key: "overridectx.unsafe.engine",
            label: "Override FastForward Speed",
            type: "toggle",
            default: false
        },
        {
            key: "ctx.unsafe.engine",
            label: "FastForward Speed",
            type: "slider",
            min: 0.5,
            max: 10,
            step: 0.1,
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
                            worldKeyCount.WorldKeyCount.start()
                        }
                    },
                    {
                        type: 'readonly',
                        key: 'apiVersion',
                        label: 'Platform API',
                        value: `v${ctx.compat.getApiVersion()}`
                    }
                ]
            }
        ]
    })
}