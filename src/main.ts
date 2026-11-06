
import {loadCustomLevelApi} from "./hooks/other/JSONs.js";
import {GPNContext} from "./tsclasses/api";
import {wrapProperty, WrapPropertyArgs} from "./HookApi";

interface ModExport {
    init?: (ctx: GPNContext) => void
}

interface ModEntry extends Array<string | ModExport> {
    0: string
    1: ModExport
}

const javascriptModules =
    import.meta.glob<ModExport>("./**/*.js", {eager: true})
const typescriptModules =
    import.meta.glob<ModExport>("./**/*.ts", {eager: true})

declare global {
    interface Window {
        __luxisReloadScheduled?: boolean
        __luxisLoadedThisDocument?: boolean
    }
}

async function shouldForcePageReload(ctx: GPNContext): Promise<boolean> {
    if (!(await ctx.settings.get("allowForceReload"))) {
        return false
    }

    const firstLoadThisDocument =
        window.__luxisLoadedThisDocument !== true

    window.__luxisLoadedThisDocument = true

    const navigation =
        performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined

    const pageWasReloaded =
        navigation?.type === "reload"

    return !pageWasReloaded || !firstLoadThisDocument
}

export function requestPageReload(ctx: GPNContext, message: string) {
    if (window.__luxisReloadScheduled) {
        return
    }

    window.__luxisReloadScheduled = true

    ctx.log.info(message)
    ctx.ui.toast(message, "info")

    setTimeout(() => location.reload(), 500)
}

export async function setup(ctx: GPNContext): Promise<void> {
    const oldWarn = console.warn as typeof console.warn & {
        ___LuxisLibEdited?: boolean
    }

    if (!oldWarn.___LuxisLibEdited) {
        oldWarn.___LuxisLibEdited = true

        console.warn = (...messages: any[]) => {
            if (!messages?.[0]?.includes("Can't find the plant with type name: \"\"")) {
                oldWarn(...messages)
            }
        }
    }

    ctx.ui.toast("Initialized >w<", "success")

    const modules: [string, ModExport][] = [
        ...Object.entries(javascriptModules),
        ...Object.entries(typescriptModules)
    ]

    const orderedModules = [
        ...modules.filter(([path]) =>
            !path.endsWith("JSONs.js") &&
            !path.endsWith("JSONs.ts")
        ),
        ...modules.filter(([path]) =>
            path.endsWith("JSONs.js") ||
            path.endsWith("JSONs.ts")
        )
    ]

    for (const [path, initModule] of orderedModules) {
        try {
            initModule.init?.(ctx)
        } catch (err) {
            ctx.ui.toast(`error encountered in ${path} :c`, "error")
            ctx.log.error(
                `error encountered in ${path}` + (err instanceof Error ? err.message : String(err))
            )
        }
    }

    const isAdvanced = await ctx.settings.get("isAdvanced")

    const advancedFields = [
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
        }
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
        }
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
            default: false
        },
        {
            key: "replayDialogue",
            label: "Replay Level Dialogue",
            type: "toggle",
            default: true
        },
        {
            key: "disableDialogue",
            label: "Disable Level Dialogue",
            type: "toggle",
            default: false
        },
        {
            key: "hideMintIcons",
            label: "Hide SeedPacket Mint Icons",
            type: "toggle",
            default: false
        },
        {
            key: "deterministicPinatas",
            label: "Deterministic Pinata Parties",
            type: "toggle",
            default: true
        },
        {
            key: "deltaTimeThreshold",
            label: "Low FPS Slowdown",
            type: "slider",
            min: 0,
            max: 165,
            step: 1,
            default: 20
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
        }
    ]

    await ctx.settings.defineSchema({
        title: "Luxis Lib",
        fields: [
            ...defaultFields,
            ...fields
        ]
    })

    const worldKeyCount = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/WorldKeyCount.ts")
    const playerProperties = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/PlayerProperties.ts")
    const allPlayerProperties = playerProperties.AllPlayerProperties

    ctx.controls.definePanel({
        title: "Luxis Lib",
        groups: [
            {
                title: "Quick Actions",
                items: [
                    {
                        type: "action",
                        key: "worldKey",
                        label: "+1 World Key",
                        async onClick() {
                            allPlayerProperties.currentPlayer.worldkey += 1
                            allPlayerProperties.savePP()
                            worldKeyCount.WorldKeyCount.component?.start()
                        }
                    },
                    {
                        type: "action",
                        key: "restart",
                        label: "Quick Game Restart",
                        async onClick() {
                            location.reload()
                        }
                    }
                ]
            }
        ]
    })

    ctx.services.provide({
        id: "artofluxis.luxislib.api",
        version: "1.0.0",
        capabilities: ["register-level", "wrap-property"],
        api: {
            registerLevel: (levelID: string, data: any) => {
                loadCustomLevelApi(levelID, data)
            },
            wrapProperty(args: WrapPropertyArgs) {
                return wrapProperty(args)
            }
        }
    })

    if (await shouldForcePageReload(ctx)) {
        requestPageReload(ctx, "Mod runtime reload detected; reloading page")
        return
    }

    ctx.log.info("Full initialization done")
}
