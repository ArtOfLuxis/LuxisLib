
const modules = import.meta.glob('./**/*.js', {eager: true});

export async function setup(ctx) {
    ctx.ui.toast("initialized >w<", "info");
    for (const initModule of Object.values(modules)) {
        try {
            initModule.init(ctx);
        } catch (err) {
            ctx.ui.toast("error encountered :c", "info");
            ctx.log.error(err.message);
        }
    }

    ctx.events.on("engine:ready", async () => {
        const isAdvanced = await ctx.settings.get("isAdvanced")
        const fields = isAdvanced ?
            [
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
            ] :
            [
                {
                    key: "seedPacketScale",
                    label: "SeedPacket Scale",
                    type: "slider",
                    min: 0.25,
                    max: 2.5,
                    step: 0.01,
                    default: 0.75
                },
            ]

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
    })
}