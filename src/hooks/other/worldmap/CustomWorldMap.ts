import {libWorldmapProperties} from "../JSONs.js"
import {GPNContext} from "../../../tsclasses/api.ts";

type WorldmapPosition = {
    x: number
    y: number
    z: number
}

type IslandState = {
    x: number
    y: number
    positionZ: number
    siblingIndex: number
}

type WorldmapEntry = {
    id: string
    type: string
    [key: string]: any
}

type IslandPlan = {
    island: any
    source: any
    entry: WorldmapEntry
    siblingIndex?: number
}

type EndlessPlan = {
    entrance: any
    source: any
    entry: any
}

function parseTemplateReference(reference: string, currentWorld: string) {
    const separatorIndex = reference.indexOf(":")

    return separatorIndex === -1
        ? {worldKey: currentWorld, templateId: reference}
        : {
            worldKey: reference.slice(0, separatorIndex).toLowerCase(),
            templateId: reference.slice(separatorIndex + 1)
        }
}

function loadWorldMapPrefab(cc: any, path: string): Promise<any> {
    return new Promise((resolve, reject) => {
        cc.resources.load(path, cc.Prefab, (error: any, prefab: any) => {
            if (error) {
                reject(error)
            } else {
                resolve(prefab)
            }
        })
    })
}

export function init(ctx: GPNContext): void {
    ctx.events.on("worldmap-properties", () => {
        const WorldMap = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/WorldMap.ts")
        const Plants = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Plants.ts")
        const Trophies = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Trophies.ts")
        const PlayerProperties = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/PlayerProperties.ts")
        const EndlessZoneEntrance = ctx.unsafe.engine.getSystemModule(
            "chunks:///_virtual/EndlessZoneEntrance.ts"
        ).EndlessZoneEntrance
        const WorldMapScene = ctx.unsafe.engine.getSystemModule(
            "chunks:///_virtual/worldMapScene.ts"
        ).worldMapScene

        const worldMapDisplayEnum = PlayerProperties.WorldMapSceneDisplayEnum
        const MultiLanguage = ctx.unsafe.engine.getSystemModule(
            "chunks:///_virtual/MultiLanguage.ts"
        ).MultiLanguage

        const cc = ctx.unsafe.engine.getCc()

        const islandDisplayNames = ["level", "plant", "giftBox", "upgrade", "epicPortal"]
        const appearanceNames = ["normal", "minigame", "gargantuar", "zomboss"]
        const appearanceValues = Object.fromEntries(
            appearanceNames.map((name: string, index: number) => [name, index])
        )

        function reportWorldmapError(
            worldKey: string,
            operation: string,
            error: unknown
        ): void {
            const details = error instanceof Error
                ? error.stack ?? error.message
                : String(error)

            console.error(`[LuxisLib] Worldmap "${worldKey}": ${operation} - ${details}`)
        }

        function getPosition(
            value: any,
            fallback: WorldmapPosition,
            worldKey: string,
            operation: string
        ): WorldmapPosition {
            if (
                !value ||
                typeof value !== "object" ||
                !Number.isFinite(value.x) ||
                !Number.isFinite(value.y)
            ) {
                reportWorldmapError(
                    worldKey,
                    `${operation}; using fallback coordinates`,
                    new Error("Position must contain finite numeric x and y values")
                )

                return fallback
            }

            return {
                x: value.x,
                y: value.y,
                z: Number.isFinite(value.z) ? value.z : fallback.z
            }
        }

        function getLayoutNumber(
            value: any,
            fallback: number,
            worldKey: string,
            operation: string
        ): number {
            if (value === undefined) return fallback

            if (!Number.isFinite(value)) {
                reportWorldmapError(
                    worldKey,
                    `${operation}; using ${fallback}`,
                    new Error("Expected a finite number")
                )

                return fallback
            }

            return value
        }

        function findEndlessEntrances(worldMap: any): any[] {
            return worldMap.node.getComponentsInChildren(EndlessZoneEntrance)
        }

        function matchesEndlessTemplate(entrance: any, selector: any): boolean {
            const levels = entrance.levelsID ?? []

            if (typeof selector === "string") {
                return entrance.node.name === selector || levels.includes(selector)
            }

            if (selector.id !== undefined && entrance.node.name !== selector.id) return false
            if (selector.levelId !== undefined && !levels.includes(selector.levelId)) return false

            if (selector.levelIds !== undefined) {
                const ids = Array.isArray(selector.levelIds)
                    ? selector.levelIds
                    : [selector.levelIds]

                if (!ids.every((id: string) => levels.includes(id))) return false
            }

            if (selector.endlessData !== undefined) {
                const data = typeof selector.endlessData === "string"
                    ? worldMapDisplayEnum[selector.endlessData]
                    : selector.endlessData

                if (entrance.endlessData !== data) return false
            }

            if (
                selector.isMiniGame !== undefined &&
                entrance.isMiniGame !== selector.isMiniGame
            ) {
                return false
            }

            return selector.id !== undefined ||
                selector.levelId !== undefined ||
                selector.levelIds !== undefined ||
                selector.endlessData !== undefined ||
                selector.isMiniGame !== undefined
        }

        const guardedIslandPrototypes = new WeakSet<object>()

        function installIslandBehaviorGuard(island: any): void {
            const prototype = Object.getPrototypeOf(island)

            if (guardedIslandPrototypes.has(prototype)) return

            for (const methodName of [
                "start",
                "laterStart",
                "unlock",
                "pushPath",
                "showPlant"
            ]) {
                ctx.unsafe.hooks.wrapMethod({
                    target: prototype,
                    methodName,
                    handler: ({args, thisArg, callNext}: any) => {
                        if (thisArg.___luxisLibWorldmapLocked) return
                        return callNext(...args)
                    }
                })
            }

            guardedIslandPrototypes.add(prototype)
        }

        function getType(island: any): string {
            return islandDisplayNames[island.islandDisplay]
        }

        function getIslandComponentNode(island: any, root?: any): any {
            const componentNode = island?.node ??
                island?._node ??
                island?.___luxisLibComponentNode

            if (componentNode) return componentNode
            if (!root) return undefined

            const nodes = [root]

            while (nodes.length) {
                const node = nodes.pop()

                if (node._components?.includes(island)) {
                    island.___luxisLibComponentNode = node
                    return node
                }

                nodes.push(...node.children)
            }
        }

        function getIslandTemplateName(island: any): string {
            return getIslandComponentNode(island)?.name ??
                island?.islandNode?.name ??
                "<unknown>"
        }

        function setIslandActive(island: any, active: boolean): void {
            const componentNode = getIslandComponentNode(island)

            if (componentNode) componentNode.active = active
            if (island?.islandNode) island.islandNode.active = active
        }

        function getPlantCodename(island: any): string | undefined {
            return Plants.plants.getPlantFeature(island.plantDisplayed)?.CODENAME
        }

        function getUpgradeCodename(island: any): string | undefined {
            return Trophies.UpgradeEnum[island.upgradeDisplayed]
        }

        function getTemplateId(island: any): string | undefined {
            return island.islandNode?.name
        }

        function matchesTemplate(island: any, selector: any): boolean {
            if (typeof selector === "string") {
                return getTemplateId(island) === selector ||
                    island.customId === selector ||
                    (island.levelJsonsID ?? island.levelsID ?? []).includes(selector) ||
                    (island.epicLevelJsonsID ?? []).includes(selector) ||
                    getPlantCodename(island) === selector ||
                    getUpgradeCodename(island) === selector
            }

            if (
                selector.id !== undefined &&
                getTemplateId(island) !== selector.id &&
                island.id !== selector.id
            ) {
                return false
            }

            if (
                selector.customId !== undefined &&
                island.customId !== selector.customId &&
                getTemplateId(island) !== selector.customId
            ) {
                return false
            }

            if (selector.type !== undefined && getType(island) !== selector.type) {
                return false
            }

            if (
                selector.appearance !== undefined &&
                (
                    getType(island) !== "level" ||
                    appearanceNames[island.levelNodeAppearance] !== selector.appearance
                )
            ) {
                return false
            }

            const levels = island.levelJsonsID ?? island.levelsID ?? []
            const portalLevels = island.epicLevelJsonsID ?? []

            if (
                selector.levelId !== undefined &&
                !levels.includes(selector.levelId)
            ) {
                return false
            }

            if (selector.levelIds !== undefined) {
                const ids = Array.isArray(selector.levelIds)
                    ? selector.levelIds
                    : [selector.levelIds]

                if (!ids.every((id: string) => levels.includes(id))) return false
            }

            if (
                selector.portalLevelId !== undefined &&
                !portalLevels.includes(selector.portalLevelId)
            ) {
                return false
            }

            if (selector.portalLevelIds !== undefined) {
                const ids = Array.isArray(selector.portalLevelIds)
                    ? selector.portalLevelIds
                    : [selector.portalLevelIds]

                if (!ids.every((id: string) => portalLevels.includes(id))) return false
            }

            if (selector.plantDisplayed !== undefined) {
                const plantId = typeof selector.plantDisplayed === "string"
                    ? Plants.plants.getPlantEnumByCodename(selector.plantDisplayed)
                    : selector.plantDisplayed

                if (
                    island.plantDisplayed !== plantId &&
                    getPlantCodename(island) !== selector.plantDisplayed
                ) {
                    return false
                }
            }

            if (selector.upgradeDisplayed !== undefined) {
                const upgradeId = typeof selector.upgradeDisplayed === "string"
                    ? Trophies.UpgradeEnum?.[selector.upgradeDisplayed]
                    : selector.upgradeDisplayed

                if (
                    island.upgradeDisplayed !== upgradeId &&
                    getUpgradeCodename(island) !== selector.upgradeDisplayed
                ) {
                    return false
                }
            }

            if (
                selector.type === undefined &&
                selector.appearance === undefined &&
                selector.levelId === undefined &&
                selector.levelIds === undefined &&
                selector.portalLevelId === undefined &&
                selector.portalLevelIds === undefined &&
                selector.plantDisplayed === undefined &&
                selector.upgradeDisplayed === undefined &&
                selector.id === undefined &&
                selector.customId === undefined
            ) {
                return false
            }

            return true
        }

        function containsNode(root: any, target: any): boolean {
            let current = target

            while (current) {
                if (current === root) return true
                current = current.parent
            }

            return false
        }

        function cloneIsland(
            template: any,
            worldKey: string,
            parent: any = template.islandNode.parent
        ): any | null {
            if (!template?.islandNode) {
                reportWorldmapError(
                    worldKey,
                    `cannot clone island template "${getIslandTemplateName(template)}"`,
                    new Error("Template is missing its islandNode")
                )

                return null
            }

            let islandNode: any

            try {
                islandNode = cc.instantiate(template.islandNode)
                islandNode.active = false
                islandNode.parent = parent

                const island = new template.constructor()

                for (const key of [
                    "islandDisplay",
                    "upgradeDisplayed",
                    "plantDisplayed",
                    "levelNodeAppearance",
                    "zombossHeadPFB",
                    "levelDifficulty",
                    "levelNodeName",
                    "levelJsonsID",
                    "epicLevelJsonsID",
                    "affectsMaxX",
                    "_islandRank"
                ]) {
                    const value = template[key]
                    island[key] = Array.isArray(value) ? value.slice() : value
                }

                island.islandNode = islandNode
                island.nextIsland = null
                island.otherNextIslands = []
                island.displayedIslandDBs = []
                island._inWorldMap = undefined
                island._levelNode = undefined
                island._levelNodeDB = undefined
                island._epicPortalDB = undefined
                island._giftbox = undefined
                island._plantOnDisplay = undefined
                island._upgradeOnDisplay = undefined
                island._plantIcon = undefined
                island._pathDBs = []
                island._unlocked = false
                island._finished = false
                island._willPush = false

                installIslandBehaviorGuard(island)

                island.___luxisLibWorldmapLocked = true
                island.___luxisLibClonedIslandNode = islandNode

                return island
            } catch (error) {
                if (islandNode?.isValid) islandNode.destroy()

                reportWorldmapError(
                    worldKey,
                    `cloning island template "${getIslandTemplateName(template)}"`,
                    error
                )

                return null
            }
        }

        function findOriginalMainline(
            islands: any[],
            startingLevels: string[]
        ): any[] {
            const findByNode = (node: any) => islands.find(
                (island: any) => island.islandNode === node
            )

            const starts = new Set(startingLevels ?? [])
            const roots = islands.filter((island: any) =>
                island.levelJsonsID?.some((id: string) => starts.has(id))
            )

            const result: any[] = []
            const visited = new Set<any>()

            let current = roots[0] ?? islands[0]

            while (current && !visited.has(current)) {
                visited.add(current)
                result.push(current)
                current = findByNode(current.nextIsland)
            }

            return result
        }

        function resolvePlant(value: any): any {
            return typeof value === "string"
                ? Plants.plants.getPlantEnumByCodename(value)
                : value
        }

        function resolveUpgrade(value: any): any {
            return typeof value === "string"
                ? Trophies.UpgradeEnum[value]
                : value
        }

        function hideIslandArt(root: any): void {
            const nodes = [root]

            while (nodes.length) {
                const node = nodes.pop()

                node.getComponents(cc.internal.ArmatureDisplay).forEach((component: any) => {
                    component.enabled = false
                })

                nodes.push(...node.children)
            }
        }

        ctx.unsafe.hooks.wrapMethod({
            target: WorldMap.WorldMap.prototype,
            methodName: "onDestroy",
            handler: ({args, thisArg, callNext}: any) => {
                try {
                    return callNext(...args)
                } finally {
                    thisArg.___luxisLibWorldmapTemplatePrefabs?.forEach((prefab: any) => {
                        prefab.decRef()
                    })

                    thisArg.___luxisLibWorldmapTemplatePrefabs = []
                }
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: WorldMap.WorldMap.prototype,
            methodName: "init",
            handler: async ({args, thisArg, callNext}: any) => {
                let worldKey = String(thisArg.displayEnum ?? "unknown")
                let replacementStarted = false
                let initializationStarted = false

                let originalIslands: any[] = []
                let originalEndless: any[] = []
                let plans: IslandPlan[] = []
                let endlessPlans: EndlessPlan[] = []
                let finalEndless: any[] = []

                let blockedIslands = new Set<any>()
                let releaseIslandBehavior = (): void => {}

                const externalTemplatePrefabs: any[] = []
                const externalTemplateNodes: any[] = []

                try {
                    if (thisArg.___luxisLibWorldmapReplacementApplied) {
                        initializationStarted = true
                        return await callNext(...args)
                    }

                    worldKey = String(
                        PlayerProperties.WorldMapSceneDisplayEnum[thisArg.displayEnum] ?? "unknown"
                    )

                    const worldPatch = libWorldmapProperties.worlds?.[worldKey]
                    const map = worldPatch?.map

                    if (map?.mode !== "replace") {
                        initializationStarted = true
                        return await callNext(...args)
                    }

                    replacementStarted = true

                    let zoom = getLayoutNumber(map.zoom, 1, worldKey, "map.zoom")

                    if (zoom <= 0) {
                        reportWorldmapError(
                            worldKey,
                            "map.zoom must be greater than zero; using 1",
                            new Error(`Received ${zoom}`)
                        )

                        zoom = 1
                    }

                    thisArg.islandParent.setScale(
                        thisArg.islandParent.scale.x * zoom,
                        thisArg.islandParent.scale.y * zoom,
                        thisArg.islandParent.scale.z
                    )

                    thisArg.levelParent.setScale(
                        thisArg.levelParent.scale.x * zoom,
                        thisArg.levelParent.scale.y * zoom,
                        thisArg.levelParent.scale.z
                    )

                    originalIslands = thisArg.levelIslands.slice()

                    try {
                        originalEndless = findEndlessEntrances(thisArg)
                    } catch (error) {
                        reportWorldmapError(
                            worldKey,
                            "finding endless-zone templates; continuing without them",
                            error
                        )

                        originalEndless = []
                    }

                    if (!originalIslands.length) {
                        reportWorldmapError(
                            worldKey,
                            "replacement has no original island templates; continuing with an empty replacement",
                            new Error("WorldMap.levelIslands is empty")
                        )

                        for (const entrance of originalEndless) {
                            try {
                                entrance.node.active = false
                            } catch (error) {
                                reportWorldmapError(
                                    worldKey,
                                    `hiding original endless zone "${entrance?.node?.name ?? "<unknown>"}"`,
                                    error
                                )
                            }
                        }

                        thisArg.levelIslands = []
                        thisArg.___luxisLibWorldmapReplacementApplied = true
                        initializationStarted = true

                        return await callNext(...args)
                    }

                    const endlessSpec = worldPatch.endless

                    const endlessConfig = {
                        keepOriginal: endlessSpec?.keepOriginal ?? true,
                        nodes: endlessSpec?.nodes ?? []
                    }

                    const usedEndlessTemplates = new Set<any>()

                    endlessPlans = []
                    finalEndless = []
                    blockedIslands = new Set(originalIslands)

                    for (const island of originalIslands) {
                        try {
                            installIslandBehaviorGuard(island)
                            island.___luxisLibWorldmapLocked = true
                        } catch (error) {
                            reportWorldmapError(
                                worldKey,
                                `locking original island "${island?.node?.name ?? "<unknown>"}"`,
                                error
                            )
                        }
                    }

                    releaseIslandBehavior = (): void => {
                        blockedIslands.forEach((island: any) => {
                            delete island.___luxisLibWorldmapLocked
                        })
                    }

                    const originalStates = new Map<any, IslandState>()

                    for (const island of originalIslands) {
                        try {
                            originalStates.set(island, {
                                x: island.islandNode.position.x,
                                y: island.islandNode.position.y,
                                positionZ: island.islandNode.position.z,
                                siblingIndex: island.islandNode.getSiblingIndex()
                            })
                        } catch (error) {
                            reportWorldmapError(
                                worldKey,
                                `reading position of island template "${getIslandTemplateName(island)}"; skipping this template`,
                                error
                            )
                        }
                    }

                    originalIslands = originalIslands.filter(
                        (island: any) => originalStates.has(island)
                    )

                    if (!originalIslands.length) {
                        reportWorldmapError(
                            worldKey,
                            "no usable island templates remain; loading an empty replacement map",
                            new Error("Every original island template was invalid")
                        )

                        for (const entrance of originalEndless) {
                            try {
                                entrance.node.active = false
                            } catch (error) {
                                reportWorldmapError(
                                    worldKey,
                                    `hiding original endless zone "${entrance?.node?.name ?? "<unknown>"}"`,
                                    error
                                )
                            }
                        }

                        thisArg.___luxisLibWorldmapReplacementApplied = true
                        initializationStarted = true

                        return await callNext(...args)
                    }

                    const originalMainline = (() => {
                        try {
                            return findOriginalMainline(
                                originalIslands,
                                thisArg.startingLevels
                            )
                        } catch (error) {
                            reportWorldmapError(
                                worldKey,
                                "reading original mainline; automatic position reuse is disabled",
                                error
                            )

                            return []
                        }
                    })()

                    const templateStates = new Map<any, IslandState>(originalStates)
                    const externalTemplateIslands = new Set<any>()

                    const worldMaps = WorldMapScene.component.wmfs
                    const currentWorldType = worldKey.toLowerCase()
                    const externalTemplatesByWorld = new Map<number, any[]>()

                    async function getTemplatesForWorld(templateWorld: string): Promise<any[]> {
                        const normalizedWorld = templateWorld.toLowerCase()

                        if (normalizedWorld === currentWorldType) {
                            return originalIslands
                        }

                        const sourceWorldEnum = worldMapDisplayEnum[normalizedWorld]

                        if (sourceWorldEnum === undefined) {
                            throw new Error(`Unknown template world "${templateWorld}"`)
                        }

                        if (sourceWorldEnum === thisArg.displayEnum) {
                            return originalIslands
                        }

                        const cachedTemplates = externalTemplatesByWorld.get(sourceWorldEnum)

                        if (cachedTemplates) {
                            return cachedTemplates.filter(
                                (island: any) => templateStates.has(island)
                            )
                        }

                        const worldMapProps = worldMaps[sourceWorldEnum]

                        if (!worldMapProps) {
                            throw new Error(
                                `Cannot find world map properties for "${templateWorld}"`
                            )
                        }

                        const prefab = await loadWorldMapPrefab(
                            cc,
                            `worldmaps/${worldMapProps.RESNAME}WORLDMAP`
                        )

                        prefab.addRef()
                        externalTemplatePrefabs.push(prefab)

                        const node = cc.instantiate(prefab)
                        externalTemplateNodes.push(node)

                        const sourceWorldMap = node.getComponent(WorldMap.WorldMap)

                        if (!sourceWorldMap) {
                            throw new Error(
                                `Cannot find WorldMap component in "${templateWorld}"`
                            )
                        }

                        const templates = sourceWorldMap.levelIslands.slice()

                        externalTemplatesByWorld.set(sourceWorldEnum, templates)

                        for (const island of templates) {
                            externalTemplateIslands.add(island)

                            try {
                                templateStates.set(island, {
                                    x: island.islandNode.position.x,
                                    y: island.islandNode.position.y,
                                    positionZ: island.islandNode.position.z,
                                    siblingIndex: island.islandNode.getSiblingIndex()
                                })
                            } catch (error) {
                                reportWorldmapError(
                                    worldKey,
                                    `reading external template "${getIslandTemplateName(island)}" from "${templateWorld}"; skipping this template`,
                                    error
                                )
                            }
                        }

                        return templates.filter(
                            (island: any) => templateStates.has(island)
                        )
                    }

                    let mainline = validateEntries(map.mainline, "mainline")
                    let branches = validateEntries(map.branches, "branches")

                    function validateEntries(value: any, name: string): WorldmapEntry[] {
                        if (value === undefined) return []

                        if (!Array.isArray(value)) {
                            reportWorldmapError(
                                worldKey,
                                `reading map.${name}; ignoring invalid entries`,
                                new Error(`map.${name} must be an array`)
                            )

                            return []
                        }

                        const entries: WorldmapEntry[] = []

                        for (let index = 0; index < value.length; index++) {
                            const entry = value[index]

                            try {
                                if (!entry || typeof entry !== "object") {
                                    throw new Error(`Entry at index ${index} must be an object`)
                                }

                                if (typeof entry.id !== "string" || !entry.id.trim()) {
                                    throw new Error(
                                        `Entry at index ${index} must have a non-empty string id`
                                    )
                                }

                                if (!islandDisplayNames.includes(entry.type)) {
                                    throw new Error(
                                        `Entry "${entry.id}" has invalid type "${entry.type}"`
                                    )
                                }

                                const normalized: WorldmapEntry = {...entry}

                                for (const field of ["levels", "portalLevels", "children"]) {
                                    if (
                                        normalized[field] !== undefined &&
                                        !Array.isArray(normalized[field])
                                    ) {
                                        reportWorldmapError(
                                            worldKey,
                                            `island "${entry.id}" has invalid ${field}; treating it as empty`,
                                            new Error(`${field} must be an array`)
                                        )

                                        normalized[field] = []
                                    } else if (
                                        normalized[field] !== undefined &&
                                        normalized[field].some(
                                            (value: any) => typeof value !== "string"
                                        )
                                    ) {
                                        reportWorldmapError(
                                            worldKey,
                                            `island "${entry.id}" has invalid values in ${field}; ignoring non-string values`,
                                            new Error(`${field} must contain strings`)
                                        )

                                        normalized[field] = normalized[field].filter(
                                            (value: any) => typeof value === "string"
                                        )
                                    }

                                    if (
                                        normalized[field] === undefined &&
                                        field === "children"
                                    ) {
                                        normalized[field] = []
                                    }
                                }

                                for (const field of ["position", "relativePosition"]) {
                                    if (normalized[field] !== undefined) {
                                        const position = normalized[field]

                                        if (
                                            !position ||
                                            typeof position !== "object" ||
                                            !Number.isFinite(position.x) ||
                                            !Number.isFinite(position.y)
                                        ) {
                                            reportWorldmapError(
                                                worldKey,
                                                `island "${entry.id}" has invalid ${field}; using automatic layout`,
                                                new Error(
                                                    `${field} must contain finite numeric x and y values`
                                                )
                                            )

                                            normalized[field] = undefined
                                        } else {
                                            normalized[field] = {
                                                x: position.x,
                                                y: position.y,
                                                z: Number.isFinite(position.z)
                                                    ? position.z
                                                    : undefined
                                            }
                                        }
                                    }
                                }

                                if (
                                    normalized.siblingIndex !== undefined &&
                                    !Number.isFinite(normalized.siblingIndex)
                                ) {
                                    reportWorldmapError(
                                        worldKey,
                                        `island "${entry.id}" has an invalid siblingIndex; using automatic ordering`,
                                        new Error("siblingIndex must be a finite number")
                                    )

                                    normalized.siblingIndex = undefined
                                }

                                entries.push(normalized)
                            } catch (error) {
                                reportWorldmapError(
                                    worldKey,
                                    `validating map.${name}[${index}]`,
                                    error
                                )
                            }
                        }

                        return entries
                    }

                    const seenEntryIds = new Set<string>()

                    mainline = mainline.filter((entry: WorldmapEntry) => {
                        if (seenEntryIds.has(entry.id)) {
                            reportWorldmapError(
                                worldKey,
                                `ignoring duplicate island id "${entry.id}"`,
                                new Error("Island ids must be unique")
                            )

                            return false
                        }

                        seenEntryIds.add(entry.id)
                        return true
                    })

                    branches = branches.filter((entry: WorldmapEntry) => {
                        if (seenEntryIds.has(entry.id)) {
                            reportWorldmapError(
                                worldKey,
                                `ignoring duplicate island id "${entry.id}"`,
                                new Error("Island ids must be unique")
                            )

                            return false
                        }

                        seenEntryIds.add(entry.id)
                        return true
                    })

                    let entries = [...mainline, ...branches]

                    const usedTemplates = new Set<any>()

                    async function pickTemplate(
                        entry: WorldmapEntry
                    ): Promise<{island: any, source: any} | null> {
                        let templates = originalIslands
                        let selector = entry.template
                        let matches: any[] = []

                        if (typeof selector === "string") {
                            const reference = parseTemplateReference(selector, currentWorldType)

                            selector = reference.templateId
                            templates = await getTemplatesForWorld(reference.worldKey)
                        }

                        if (entry.template !== undefined) {
                            matches = templates.filter((island: any) => {
                                try {
                                    return matchesTemplate(island, selector)
                                } catch (error) {
                                    reportWorldmapError(
                                        worldKey,
                                        `matching island "${entry.id}" against template "${getIslandTemplateName(island)}"; skipping that template`,
                                        error
                                    )

                                    return false
                                }
                            })

                            if (!matches.length) {
                                reportWorldmapError(
                                    worldKey,
                                    `cannot find template for island "${entry.id}"`,
                                    new Error(`No island matched template "${entry.template}"`)
                                )

                                return null
                            }
                        } else {
                            matches = originalIslands.filter((island: any) => {
                                try {
                                    return getType(island) === entry.type &&
                                        (
                                            entry.type !== "level" ||
                                            entry.appearance === undefined ||
                                            appearanceNames[island.levelNodeAppearance] === entry.appearance
                                        )
                                } catch (error) {
                                    reportWorldmapError(
                                        worldKey,
                                        `matching island type for "${entry.id}" against "${getIslandTemplateName(island)}"; skipping that template`,
                                        error
                                    )

                                    return false
                                }
                            })

                            if (!matches.length && entry.type !== "plant") {
                                matches = originalIslands.filter(
                                    (island: any) => getType(island) === entry.type
                                )
                            }

                            if (!matches.length && entry.type !== "plant") {
                                matches = originalIslands
                            }
                        }

                        if (!matches.length) {
                            reportWorldmapError(
                                worldKey,
                                `skipping island "${entry.id}"`,
                                new Error(`No ${entry.type} template is available`)
                            )

                            return null
                        }

                        const unused = matches.find((island: any) =>
                            !usedTemplates.has(island) &&
                            !externalTemplateIslands.has(island)
                        )

                        const source = unused ?? matches[0]

                        if (unused) {
                            usedTemplates.add(source)
                            return {island: source, source}
                        }

                        const clone = cloneIsland(source, worldKey, thisArg.islandParent)

                        if (!clone) {
                            reportWorldmapError(
                                worldKey,
                                `skipping island "${entry.id}"`,
                                new Error(`Failed to create island from template "${getIslandTemplateName(source)}"`)
                            )

                            return null
                        }

                        return {island: clone, source}
                    }

                    for (const entry of entries) {
                        try {
                            const plan = await pickTemplate(entry)

                            if (!plan) {
                                reportWorldmapError(
                                    worldKey,
                                    `skipping island "${entry.id}" because no template could be created`,
                                    new Error("No usable island template was found")
                                )

                                continue
                            }

                            blockedIslands.add(plan.island)
                            plan.island.___luxisLibWorldmapLocked = true

                            plans.push({...plan, entry})
                        } catch (error) {
                            reportWorldmapError(
                                worldKey,
                                `creating island "${entry.id}"; keeping other islands`,
                                error
                            )
                        }
                    }

                    const plannedIds = new Set(
                        plans.map((plan: IslandPlan) => plan.entry.id)
                    )

                    mainline = mainline.filter(
                        (entry: WorldmapEntry) => plannedIds.has(entry.id)
                    )

                    branches = branches.filter(
                        (entry: WorldmapEntry) => plannedIds.has(entry.id)
                    )

                    entries = [...mainline, ...branches]

                    if (!plans.length) {
                        reportWorldmapError(
                            worldKey,
                            "no configured islands could be created; continuing with an empty replacement map",
                            new Error("Every map entry failed validation or template selection")
                        )
                    }

                    if (
                        endlessConfig.nodes !== undefined &&
                        !Array.isArray(endlessConfig.nodes)
                    ) {
                        reportWorldmapError(
                            worldKey,
                            "reading endless nodes; ignoring invalid entries",
                            new Error("worldmap.endless.nodes must be an array")
                        )
                    }

                    for (const entry of Array.isArray(endlessConfig.nodes)
                        ? endlessConfig.nodes
                        : []) {
                        let node: any

                        try {
                            if (
                                !entry ||
                                typeof entry !== "object" ||
                                typeof entry.id !== "string" ||
                                !entry.id.trim()
                            ) {
                                throw new Error(
                                    "Endless-zone entry must be an object with a non-empty string id"
                                )
                            }

                            const matches = entry.template !== undefined
                                ? originalEndless.filter((entrance: any) =>
                                    matchesEndlessTemplate(entrance, entry.template)
                                )
                                : originalEndless

                            if (!matches.length) {
                                reportWorldmapError(
                                    worldKey,
                                    `skipping endless zone "${entry.id}" because no template matched`,
                                    new Error("No usable endless-zone template was found")
                                )

                                continue
                            }

                            const source = matches.find(
                                (entrance: any) => !usedEndlessTemplates.has(entrance)
                            ) ?? matches[0]

                            usedEndlessTemplates.add(source)

                            node = cc.instantiate(source.node)
                            node.active = false
                            node.parent = source.node.parent

                            const entrance = node.getComponent(EndlessZoneEntrance)

                            if (!entrance) {
                                throw new Error(
                                    "Cloned node has no EndlessZoneEntrance component"
                                )
                            }

                            const position = getPosition(
                                entry.position ?? source.node.position,
                                source.node.position,
                                worldKey,
                                `endless zone "${entry.id}" position`
                            )

                            if (!Array.isArray(entry.levels)) {
                                throw new Error(
                                    `Endless zone "${entry.id}" must have a levels array`
                                )
                            }

                            entrance.levelsID = entry.levels.slice()
                            entrance.endlessData = entry.endlessData === undefined
                                ? source.endlessData
                                : typeof entry.endlessData === "string"
                                    ? worldMapDisplayEnum[entry.endlessData]
                                    : entry.endlessData

                            entrance.isMiniGame = entry.isMiniGame ?? source.isMiniGame
                            entrance.___luxisLibWorldmapLabel = entry.label

                            node.name = entry.id

                            node.setPosition(new cc.Vec3(
                                position.x,
                                position.y,
                                position.z ?? source.node.position.z
                            ))

                            node.setSiblingIndex(
                                entry.siblingIndex ??
                                source?.node?.getSiblingIndex() ??
                                Math.round(position.y * 100)
                            )

                            node.active = true

                            endlessPlans.push({entrance, source, entry})
                        } catch (error) {
                            if (node) node.destroy()

                            reportWorldmapError(
                                worldKey,
                                `creating endless zone "${entry?.id ?? "<unknown>"}"; keeping other zones`,
                                error
                            )
                        }
                    }

                    const retainedLabelNodes = new Set(
                        endlessPlans.flatMap(({entrance}: EndlessPlan) => [
                            entrance.LevelNameLabel?.node,
                            entrance.LevelNumberLabel?.node
                        ].filter(Boolean))
                    )

                    for (const entrance of originalEndless) {
                        try {
                            if (
                                !endlessConfig.keepOriginal ||
                                usedEndlessTemplates.has(entrance)
                            ) {
                                entrance.node.active = false

                                for (const labelNode of [
                                    entrance.LevelNameLabel?.node,
                                    entrance.LevelNumberLabel?.node
                                ]) {
                                    if (
                                        labelNode &&
                                        !retainedLabelNodes.has(labelNode)
                                    ) {
                                        labelNode.active = false
                                    }
                                }
                            }
                        } catch (error) {
                            reportWorldmapError(
                                worldKey,
                                `processing original endless zone "${entrance?.node?.name ?? "<unknown>"}"`,
                                error
                            )
                        }
                    }

                    finalEndless = endlessPlans.map(
                        (plan: EndlessPlan) => plan.entrance
                    )

                    if (endlessConfig.keepOriginal) {
                        finalEndless.push(
                            ...originalEndless.filter(
                                (entrance: any) => !usedEndlessTemplates.has(entrance)
                            )
                        )
                    }

                    const planById = new Map<string, IslandPlan>()

                    for (const plan of plans) {
                        planById.set(plan.entry.id, plan)
                    }

                    const parentById = new Map<string, WorldmapEntry>()
                    const mainlineIndex = new Map<string, number>()

                    mainline.forEach((entry: WorldmapEntry, index: number) => {
                        mainlineIndex.set(entry.id, index)
                    })

                    for (let index = 1; index < mainline.length; index++) {
                        if (!parentById.has(mainline[index].id)) {
                            parentById.set(mainline[index].id, mainline[index - 1])
                        }
                    }

                    for (const entry of entries) {
                        for (const childId of Array.isArray(entry.children)
                            ? entry.children
                            : []) {
                            if (
                                planById.has(childId) &&
                                !parentById.has(childId)
                            ) {
                                parentById.set(childId, entry)
                            }
                        }
                    }

                    const layout = map.autoLayout && typeof map.autoLayout === "object"
                        ? map.autoLayout
                        : {}

                    const baseX = getLayoutNumber(
                        layout.baseX,
                        0,
                        worldKey,
                        "map.autoLayout.baseX"
                    )

                    const baseY = getLayoutNumber(
                        layout.baseY,
                        0,
                        worldKey,
                        "map.autoLayout.baseY"
                    )

                    const xStep = getLayoutNumber(
                        layout.xStep,
                        250,
                        worldKey,
                        "map.autoLayout.xStep"
                    )

                    const yStep = getLayoutNumber(
                        layout.yStep,
                        180,
                        worldKey,
                        "map.autoLayout.yStep"
                    )

                    const branchXStep = getLayoutNumber(
                        layout.branchXStep,
                        200,
                        worldKey,
                        "map.autoLayout.branchXStep"
                    )

                    const branchYStep = getLayoutNumber(
                        layout.branchYStep,
                        140,
                        worldKey,
                        "map.autoLayout.branchYStep"
                    )

                    let ySmoothness = getLayoutNumber(
                        layout.ySmoothness,
                        4,
                        worldKey,
                        "map.autoLayout.ySmoothness"
                    )

                    if (ySmoothness <= 0) {
                        reportWorldmapError(
                            worldKey,
                            "map.autoLayout.ySmoothness must be greater than zero; using 4",
                            new Error(`Received ${ySmoothness}`)
                        )

                        ySmoothness = 4
                    }

                    const resolvedPositions = new Map<
                        string,
                        WorldmapPosition & {siblingIndex: number}
                    >()

                    const resolving = new Set<string>()

                    function resolvePosition(
                        entry: WorldmapEntry
                    ): WorldmapPosition & {siblingIndex: number} {
                        if (resolvedPositions.has(entry.id)) {
                            return resolvedPositions.get(entry.id)!
                        }

                        const source = planById.get(entry.id)!.source
                        const sourceState = templateStates.get(source)!
                        const originalSiblingIndex = sourceState.siblingIndex

                        if (resolving.has(entry.id)) {
                            return {
                                x: baseX,
                                y: baseY,
                                z: sourceState.positionZ,
                                siblingIndex: Math.round(
                                    entry.siblingIndex ?? originalSiblingIndex
                                )
                            }
                        }

                        resolving.add(entry.id)

                        let result: WorldmapPosition & {siblingIndex: number}

                        if (entry.position) {
                            const position = getPosition(
                                entry.position,
                                {
                                    x: baseX + entries.indexOf(entry) * xStep,
                                    y: baseY,
                                    z: sourceState.positionZ
                                },
                                worldKey,
                                `island "${entry.id}" position`
                            )

                            result = {
                                x: position.x,
                                y: position.y,
                                z: position.z,
                                siblingIndex: Math.round(
                                    entry.siblingIndex ?? originalSiblingIndex
                                )
                            }
                        } else if (entry.relativePosition) {
                            const parent = parentById.get(entry.id)

                            const parentPosition = parent
                                ? resolvePosition(parent)
                                : {x: 0, y: 0, z: 0, siblingIndex: 0}

                            const relativePosition = getPosition(
                                entry.relativePosition,
                                {x: 0, y: 0, z: 0},
                                worldKey,
                                `island "${entry.id}" relativePosition`
                            )

                            result = {
                                x: parentPosition.x + relativePosition.x,
                                y: parentPosition.y + relativePosition.y,
                                z: parentPosition.z + (relativePosition.z ?? 0),
                                siblingIndex: Math.round(
                                    entry.siblingIndex ??
                                    parentPosition.siblingIndex + 1
                                )
                            }
                        } else {
                            const index = mainlineIndex.get(entry.id)

                            if (
                                map.reuseOriginalPositions &&
                                index !== undefined &&
                                originalMainline[index]
                            ) {
                                const original = originalStates.get(
                                    originalMainline[index]
                                )!

                                result = {
                                    x: original.x,
                                    y: original.y,
                                    z: original.positionZ,
                                    siblingIndex: Math.round(
                                        entry.siblingIndex ?? original.siblingIndex
                                    )
                                }
                            } else if (index !== undefined) {
                                result = {
                                    x: baseX + index * xStep,
                                    y: Math.round(
                                        (
                                            baseY +
                                            Math.sin(index * Math.PI * 2 / ySmoothness) * yStep
                                        ) * 100
                                    ) / 100,
                                    z: sourceState.positionZ,
                                    siblingIndex: Math.round(
                                        entry.siblingIndex ?? index
                                    )
                                }
                            } else {
                                const parent = parentById.get(entry.id)
                                const parentPosition = parent
                                    ? resolvePosition(parent)
                                    : null

                                const siblings = Array.isArray(parent?.children)
                                    ? parent.children
                                    : []

                                const childIndex = siblings.indexOf(entry.id) + 1

                                result = parentPosition
                                    ? {
                                        x: parentPosition.x + branchXStep,
                                        y: parentPosition.y - branchYStep * childIndex,
                                        z: parentPosition.z,
                                        siblingIndex: Math.round(
                                            entry.siblingIndex ??
                                            parentPosition.siblingIndex + childIndex
                                        )
                                    }
                                    : {
                                        x: baseX + entries.indexOf(entry) * xStep,
                                        y: baseY,
                                        z: sourceState.positionZ,
                                        siblingIndex: Math.round(
                                            entry.siblingIndex ?? entries.indexOf(entry)
                                        )
                                    }
                            }
                        }

                        resolving.delete(entry.id)
                        resolvedPositions.set(entry.id, result)

                        return result
                    }

                    for (const entry of entries) {
                        try {
                            resolvePosition(entry)
                        } catch (error) {
                            reportWorldmapError(
                                worldKey,
                                `calculating position for island "${entry.id}"; using a fallback position`,
                                error
                            )

                            resolving.clear()

                            const plan = planById.get(entry.id)
                            const sourceState = plan
                                ? templateStates.get(plan.source)
                                : null

                            resolvedPositions.set(entry.id, {
                                x: baseX + entries.indexOf(entry) * xStep,
                                y: baseY,
                                z: sourceState?.positionZ ?? 0,
                                siblingIndex: Math.round(
                                    entry.siblingIndex ?? entries.indexOf(entry)
                                )
                            })
                        }
                    }

                    const failedPlanIds = new Set<string>()

                    for (const plan of plans) {
                        const {island, source, entry} = plan

                        try {
                            setIslandActive(island, true)

                            island.islandNode.name = entry.id
                            island.islandDisplay = WorldMap.islandDisplayEnum[entry.type]

                            if (entry.type === "level") {
                                const appearance = entry.appearance ?? "normal"

                                if (appearanceValues[appearance] === undefined) {
                                    reportWorldmapError(
                                        worldKey,
                                        `island "${entry.id}" has unknown appearance "${appearance}"; using normal`,
                                        new Error(
                                            `Supported appearances: ${appearanceNames.join(", ")}`
                                        )
                                    )
                                }

                                island.levelNodeAppearance =
                                    appearanceValues[appearance] ?? appearanceValues.normal

                                island.levelJsonsID = (entry.levels ?? []).slice()
                                island.levelNodeName = entry.title ?? ""

                                island.zombossHeadPFB = entry.appearance === "zomboss"
                                    ? source.zombossHeadPFB
                                    : null
                            } else {
                                island.levelJsonsID = []
                                island.levelNodeName = ""
                                island.zombossHeadPFB = null
                            }

                            island.epicLevelJsonsID = (entry.portalLevels ?? []).slice()

                            if (entry.type === "plant") {
                                const plant = entry.plantReward === undefined
                                    ? island.plantDisplayed
                                    : resolvePlant(entry.plantReward)

                                if (plant === undefined || plant === -1) {
                                    throw new Error(
                                        `Unknown plant reward "${entry.plantReward}"`
                                    )
                                }

                                island.plantDisplayed = plant
                            }

                            if (entry.type === "upgrade") {
                                const upgrade = entry.upgradeReward === undefined
                                    ? island.upgradeDisplayed
                                    : resolveUpgrade(entry.upgradeReward)

                                if (upgrade === undefined) {
                                    throw new Error(
                                        `Unknown upgrade reward "${entry.upgradeReward}"`
                                    )
                                }

                                island.upgradeDisplayed = upgrade
                            }

                            island.affectsMaxX = true
                            island.displayedIslandDBs = []
                            island._inWorldMap = undefined
                            island._levelNode = undefined
                            island._levelNodeDB = undefined
                            island._epicPortalDB = undefined
                            island._giftbox = undefined
                            island._plantOnDisplay = undefined
                            island._upgradeOnDisplay = undefined
                            island._plantIcon = undefined
                            island._pathDBs = []
                            island._unlocked = false
                            island._finished = false
                            island._willPush = false

                            const position = resolvePosition(entry)

                            island.islandNode.setPosition(
                                new cc.Vec3(
                                    position.x,
                                    position.y,
                                    position.z
                                )
                            )

                            plan.siblingIndex = position.siblingIndex
                        } catch (error) {
                            failedPlanIds.add(entry.id)
                            setIslandActive(island, false)

                            reportWorldmapError(
                                worldKey,
                                `configuring island "${entry.id}"; keeping other islands`,
                                error
                            )
                        }
                    }

                    if (failedPlanIds.size) {
                        plans = plans.filter(
                            (plan: IslandPlan) => !failedPlanIds.has(plan.entry.id)
                        )

                        mainline = mainline.filter(
                            (entry: WorldmapEntry) => !failedPlanIds.has(entry.id)
                        )

                        branches = branches.filter(
                            (entry: WorldmapEntry) => !failedPlanIds.has(entry.id)
                        )

                        entries = [...mainline, ...branches]

                        planById.clear()

                        for (const plan of plans) {
                            planById.set(plan.entry.id, plan)
                        }

                        parentById.clear()
                        mainlineIndex.clear()

                        mainline.forEach((entry: WorldmapEntry, index: number) => {
                            mainlineIndex.set(entry.id, index)
                        })

                        for (let index = 1; index < mainline.length; index++) {
                            if (!parentById.has(mainline[index].id)) {
                                parentById.set(mainline[index].id, mainline[index - 1])
                            }
                        }

                        for (const entry of entries) {
                            for (const childId of Array.isArray(entry.children)
                                ? entry.children
                                : []) {
                                if (
                                    planById.has(childId) &&
                                    !parentById.has(childId)
                                ) {
                                    parentById.set(childId, entry)
                                }
                            }
                        }
                    }

                    for (const plan of plans) {
                        const {island, entry} = plan

                        const nextIndex = mainlineIndex.get(entry.id)
                        const nextEntry = nextIndex === undefined
                            ? null
                            : mainline[nextIndex + 1]

                        island.nextIsland = nextEntry && planById.has(nextEntry.id)
                            ? planById.get(nextEntry.id)!.island.islandNode
                            : null

                        island.otherNextIslands = (
                            Array.isArray(entry.children) ? entry.children : []
                        )
                            .filter(
                                (id: string) =>
                                    id !== nextEntry?.id && planById.has(id)
                            )
                            .map(
                                (id: string) => planById.get(id)!.island.islandNode
                            )
                    }

                    for (const island of originalIslands) {
                        if (!usedTemplates.has(island)) {
                            island.islandNode.active = false
                        }
                    }

                    thisArg.levelIslands = plans.map(
                        (plan: IslandPlan) => plan.island
                    )

                    plans
                        .sort(
                            (a: IslandPlan, b: IslandPlan) =>
                                (a.siblingIndex ?? 0) - (b.siblingIndex ?? 0)
                        )
                        .forEach((plan: IslandPlan) => {
                            try {
                                plan.island.islandNode.setSiblingIndex(
                                    plan.siblingIndex!
                                )
                            } catch (error) {
                                reportWorldmapError(
                                    worldKey,
                                    `ordering island "${plan.entry.id}"; keeping its current order`,
                                    error
                                )
                            }
                        })

                    for (const plan of plans) {
                        const island = plan.island

                        try {
                            if (island.___luxisLibClonedComponentNode) {
                                island.___luxisLibClonedComponentNode.active = true
                            }

                            if (island.___luxisLibClonedIslandNode) {
                                island.___luxisLibClonedIslandNode.active = true
                            }

                            delete island.___luxisLibClonedComponentNode
                            delete island.___luxisLibClonedIslandNode
                        } catch (error) {
                            reportWorldmapError(
                                worldKey,
                                `activating clone for island "${plan.entry.id}"; keeping other islands`,
                                error
                            )
                        }
                    }

                    if (worldPatch.data) {
                        const data = worldPatch.data

                        const dataUpdates: [string, () => void][] = [
                            ["epicTarget", () => thisArg.MapProps.EPIC_TARGET = data.epicTarget],
                            ["intro", () => thisArg.MapProps.INTRO = data.intro],
                            ["levels", () => thisArg.MapProps.LEVELS = data.levels.slice()],
                            ["plants", () => thisArg.MapProps.PLANTS = data.plants.slice()],
                            ["startingLevels", () => thisArg.startingLevels = data.startingLevels.slice()]
                        ]

                        for (const [key, apply] of dataUpdates) {
                            if (data[key] === undefined) continue

                            try {
                                apply()
                            } catch (error) {
                                reportWorldmapError(
                                    worldKey,
                                    `applying worldmap data field "${key}"; keeping other data`,
                                    error
                                )
                            }
                        }
                    }

                    const replacementNodes = [
                        ...plans.flatMap(({island}: IslandPlan) => [
                            getIslandComponentNode(island),
                            island.islandNode
                        ].filter(Boolean)),
                        ...finalEndless.map((entrance: any) => entrance.node)
                    ]

                    thisArg.islandParent.children.forEach((node: any) => {
                        try {
                            if (
                                !replacementNodes.some(
                                    (target: any) => containsNode(node, target)
                                )
                            ) {
                                hideIslandArt(node)
                            }
                        } catch (error) {
                            reportWorldmapError(
                                worldKey,
                                `hiding unused island art under "${node.name}"; keeping other nodes`,
                                error
                            )
                        }
                    })

                    thisArg.___luxisLibWorldmapTemplatePrefabs = (
                        thisArg.___luxisLibWorldmapTemplatePrefabs ?? []
                    ).concat(externalTemplatePrefabs)

                    externalTemplatePrefabs.length = 0

                    thisArg.___luxisLibWorldmapReplacementApplied = true

                    releaseIslandBehavior()

                    initializationStarted = true

                    const result = await callNext(...args)

                    for (const entrance of finalEndless) {
                        try {
                            const x =
                                entrance.node.worldPosition.x -
                                thisArg.islandParent.worldPosition.x

                            thisArg.maxMapX = Math.max(thisArg.maxMapX, x)
                            thisArg.minMapX = Math.min(thisArg.minMapX, x)
                        } catch (error) {
                            reportWorldmapError(
                                worldKey,
                                `updating bounds for endless zone "${entrance?.node?.name ?? "<unknown>"}"`,
                                error
                            )
                        }
                    }

                    try {
                        thisArg.setIslandActive()
                    } catch (error) {
                        reportWorldmapError(
                            worldKey,
                            "activating configured islands; retaining the partially loaded map",
                            error
                        )
                    }

                    return result
                } catch (error) {
                    reportWorldmapError(
                        worldKey,
                        "building replacement map; retaining the partial replacement instead of restoring the original map",
                        error
                    )

                    if (!replacementStarted && !initializationStarted) {
                        try {
                            const fallbackIslands = Array.isArray(thisArg.levelIslands)
                                ? thisArg.levelIslands.slice()
                                : []

                            thisArg.levelIslands = []

                            for (const island of fallbackIslands) {
                                try {
                                    setIslandActive(island, false)
                                } catch (islandError) {
                                    reportWorldmapError(
                                        worldKey,
                                        `hiding island after setup failure "${island?.node?.name ?? "<unknown>"}"`,
                                        islandError
                                    )
                                }
                            }

                            for (const entrance of findEndlessEntrances(thisArg)) {
                                try {
                                    entrance.node.active = false
                                } catch (endlessError) {
                                    reportWorldmapError(
                                        worldKey,
                                        `hiding endless zone after setup failure "${entrance?.node?.name ?? "<unknown>"}"`,
                                        endlessError
                                    )
                                }
                            }

                            thisArg.___luxisLibWorldmapReplacementApplied = true
                        } catch (recoveryError) {
                            reportWorldmapError(
                                worldKey,
                                "preventing original worldmap fallback after setup failure",
                                recoveryError
                            )

                            thisArg.levelIslands = []
                            thisArg.___luxisLibWorldmapReplacementApplied = true
                        }
                    }

                    if (replacementStarted) {
                        try {
                            const currentIslands = Array.isArray(thisArg.levelIslands)
                                ? thisArg.levelIslands.slice()
                                : []

                            const availablePlans = plans.filter(
                                (plan: IslandPlan) => plan?.island
                            )

                            const selectedIslands = new Set(
                                availablePlans.map((plan: IslandPlan) => plan.island)
                            )

                            thisArg.levelIslands = availablePlans.map(
                                (plan: IslandPlan) => plan.island
                            )

                            for (const island of new Set([
                                ...originalIslands,
                                ...currentIslands
                            ])) {
                                try {
                                    if (selectedIslands.has(island)) {
                                        setIslandActive(island, true)
                                    } else {
                                        setIslandActive(island, false)
                                    }
                                } catch (islandError) {
                                    reportWorldmapError(
                                        worldKey,
                                        `recovering island template "${island?.node?.name ?? "<unknown>"}"`,
                                        islandError
                                    )
                                }
                            }

                            for (const plan of availablePlans) {
                                try {
                                    setIslandActive(plan.island, true)

                                    if (plan.island.___luxisLibClonedComponentNode) {
                                        plan.island.___luxisLibClonedComponentNode.active = true
                                    }

                                    if (plan.island.___luxisLibClonedIslandNode) {
                                        plan.island.___luxisLibClonedIslandNode.active = true
                                    }

                                    delete plan.island.___luxisLibClonedComponentNode
                                    delete plan.island.___luxisLibClonedIslandNode
                                } catch (islandError) {
                                    reportWorldmapError(
                                        worldKey,
                                        `activating partial island "${plan.entry?.id ?? "<unknown>"}"`,
                                        islandError
                                    )
                                }
                            }

                            for (const plan of endlessPlans) {
                                try {
                                    plan.entrance.node.active = true
                                } catch (endlessError) {
                                    reportWorldmapError(
                                        worldKey,
                                        `activating partial endless zone "${plan.entry?.id ?? "<unknown>"}"`,
                                        endlessError
                                    )
                                }
                            }

                            thisArg.___luxisLibWorldmapTemplatePrefabs = (
                                thisArg.___luxisLibWorldmapTemplatePrefabs ?? []
                            ).concat(externalTemplatePrefabs)

                            externalTemplatePrefabs.length = 0

                            thisArg.___luxisLibWorldmapReplacementApplied = true
                            releaseIslandBehavior()
                        } catch (recoveryError) {
                            reportWorldmapError(
                                worldKey,
                                "recovering partial worldmap; keeping original islands hidden",
                                recoveryError
                            )

                            thisArg.levelIslands = []
                            thisArg.___luxisLibWorldmapReplacementApplied = true
                        }
                    }

                    if (!initializationStarted) {
                        initializationStarted = true

                        try {
                            return await callNext(...args)
                        } catch (initializationError) {
                            reportWorldmapError(
                                worldKey,
                                "initializing the partial replacement map",
                                initializationError
                            )
                        }
                    }

                    return undefined
                } finally {
                    externalTemplateNodes.forEach((node: any) => node.destroy())

                    externalTemplatePrefabs.forEach((prefab: any) => {
                        prefab.decRef()
                    })
                }
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: EndlessZoneEntrance.prototype,
            methodName: "start",
            handler: ({args, thisArg, callNext}: any) => {
                let result: any

                try {
                    result = callNext(...args)
                } catch (error) {
                    reportWorldmapError(
                        thisArg.node?.name ?? "unknown",
                        "starting endless-zone entrance",
                        error
                    )

                    return undefined
                }

                try {
                    const label = thisArg.___luxisLibWorldmapLabel

                    if (label && thisArg.enterable && thisArg.unlocked) {
                        if (label.name !== undefined) {
                            thisArg.LevelNameLabel.string = String(
                                MultiLanguage.getString(label.name)
                            )
                        }

                        if (label.levelNumber !== undefined) {
                            thisArg.LevelNumberLabel.string = String(
                                MultiLanguage.getString(label.levelNumber)
                            ).replaceAll("{level}", thisArg.data.level)
                        }
                    }
                } catch (error) {
                    reportWorldmapError(
                        thisArg.node?.name ?? "unknown",
                        "applying endless-zone labels; keeping default labels",
                        error
                    )
                }

                return result
            }
        })
    })
}