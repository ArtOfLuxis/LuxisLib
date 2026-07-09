
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
            key: "seedPacketScaleX",
            label: "SeedPacket ScaleX",
            type: "number",
            default: 0.75
        },
        {
            key: "seedPacketScaleY",
            label: "SeedPacket ScaleY",
            type: "number",
            default: 0.75
        },
    ]
    const normalFields = [
        {
            key: "seedPacketCount",
            label: "SeedPacket Count",
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
        }
    ]

    await ctx.settings.defineSchema({
        title: "Luxis Lib",
        fields: [
            ...defaultFields,
            ...fields,
        ]
    })

    ctx.ui.toast("Settings initialized!", "success")

    ctx.controls.definePanel({
        title: 'Luxis Lib',
        groups: [
            {
                title: 'Quick Actions',
                items: [
                    {
                        type: 'action',
                        key: 'nothing',
                        label: 'Nothing here yet',
                        async onClick() {
                            ctx.ui.toast(ctx.scenes.getName(), "info")
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

    ctx.ui.toast("Runtime controls initialized!", "success")

}