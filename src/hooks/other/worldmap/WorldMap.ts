import {GPNContext} from "../../../tsclasses/api.ts"

type WorldmapEntry = Record<string, any>
type TemplateDump = Record<string, any>

function roundPosition(value: number): number {
    return Math.round(value * 100) / 100
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
    ctx.events.on("engine:ready", () => {
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

        const cc = ctx.unsafe.engine.getCc()

        const worldMapDisplayEnum = PlayerProperties.WorldMapSceneDisplayEnum
        const islandDisplayNames = ["level", "plant", "giftBox", "upgrade", "epicPortal"]
        const appearanceNames = ["normal", "minigame", "gargantuar", "zomboss"]

        const templateDumpPrefabs = new Map<number, any>()

        function makeId(island: any, index: number): string {
            return island.islandNode?.name || `island-${index + 1}`
        }

        function getPlantCodename(island: any): string | undefined {
            return Plants.plants.getPlantFeature(island.plantDisplayed)?.CODENAME
        }

        function getUpgradeCodename(island: any): string | undefined {
            return Trophies.UpgradeEnum[island.upgradeDisplayed]
        }

        function findEndlessEntrances(worldMap: any): any[] {
            return worldMap.node.getComponentsInChildren(EndlessZoneEntrance)
        }

        function toEndlessEntry(entrance: any, index: number): WorldmapEntry {
            const position = entrance.node.position
            const id = entrance.node.name || `endless-${index + 1}`
            const endlessData = worldMapDisplayEnum[entrance.endlessData]

            return {
                id,
                template: entrance.node.name
                    ? {id: entrance.node.name}
                    : {
                        levelIds: entrance.levelsID.slice(),
                        endlessData,
                        isMiniGame: entrance.isMiniGame
                    },
                levels: entrance.levelsID.slice(),
                endlessData,
                isMiniGame: entrance.isMiniGame,
                position: {
                    x: roundPosition(position.x),
                    y: roundPosition(position.y),
                    z: roundPosition(position.z)
                },
                siblingIndex: entrance.node.getSiblingIndex()
            }
        }

        function toEntry(
            island: any,
            idByNode: Map<any, string>,
            previousPosition: any,
            hasParent: boolean
        ): WorldmapEntry {
            const entry: WorldmapEntry = {
                id: idByNode.get(island.islandNode),
                type: islandDisplayNames[island.islandDisplay],
                template: island.islandNode.name
            }

            const isDecoration = island.islandDisplay !== 0
            const useAbsolutePosition = isDecoration || !hasParent

            if (island.islandDisplay === 0) {
                entry.appearance = appearanceNames[island.levelNodeAppearance]
                entry.levels = island.levelJsonsID.slice()

                if (island.levelNodeName) {
                    entry.title = island.levelNodeName
                }
            } else if (island.islandDisplay === 1) {
                entry.plantReward = getPlantCodename(island)
            } else if (island.islandDisplay === 3) {
                entry.upgradeReward = getUpgradeCodename(island) ?? island.upgradeDisplayed
            } else if (island.islandDisplay === 4) {
                entry.portalLevels = island.epicLevelJsonsID.slice()
            }

            const position = island.islandNode.position

            entry.siblingIndex = island.islandNode.getSiblingIndex()

            if (useAbsolutePosition) {
                entry.position = {
                    x: roundPosition(position.x),
                    y: roundPosition(position.y),
                    z: roundPosition(position.z)
                }
            } else {
                const basePosition = previousPosition ?? position

                entry.relativePosition = {
                    x: roundPosition(position.x - basePosition.x),
                    y: roundPosition(position.y - basePosition.y),
                    z: roundPosition(position.z - basePosition.z)
                }
            }

            return entry
        }

        function dumpWorldMap(worldMap: any): TemplateDump {
            const islands = worldMap.levelIslands
            const idByNode = new Map<any, string>()

            islands.forEach((island: any, index: number) => {
                idByNode.set(island.islandNode, makeId(island, index))
            })

            const findByNode = (node: any) => islands.find(
                (island: any) => island.islandNode === node
            )

            const parentOf = new Map<any, any>()

            islands.forEach((island: any) => {
                const nextMain = findByNode(island.nextIsland)

                if (nextMain && !parentOf.has(nextMain)) {
                    parentOf.set(nextMain, island)
                }

                ;(island.otherNextIslands ?? []).forEach((node: any) => {
                    const branchTarget = findByNode(node)

                    if (branchTarget && !parentOf.has(branchTarget)) {
                        parentOf.set(branchTarget, island)
                    }
                })
            })

            const startSet = new Set(worldMap.startingLevels ?? [])
            const rootIslands = islands.filter((island: any) =>
                island.levelJsonsID?.some((level: string) => startSet.has(level))
            )

            const mainlineIslands: any[] = []
            const mainlineSet = new Set<any>()

            let current = rootIslands[0]

            while (current && !mainlineSet.has(current)) {
                mainlineSet.add(current)
                mainlineIslands.push(current)
                current = findByNode(current.nextIsland)
            }

            const remaining = new Set(
                islands.filter((island: any) => !mainlineSet.has(island))
            )

            const outputSet = new Set(mainlineSet)
            const branchIslands: any[] = []

            let progressed = true

            while (remaining.size && progressed) {
                progressed = false

                for (const island of Array.from(remaining)) {
                    const parent = parentOf.get(island)

                    if (!parent || outputSet.has(parent)) {
                        branchIslands.push(island)
                        outputSet.add(island)
                        remaining.delete(island)
                        progressed = true
                    }
                }
            }

            remaining.forEach((island: any) => {
                ctx.log.warn(
                    `Island ${idByNode.get(island.islandNode)} has no resolvable parent chain - check its position manually`
                )

                branchIslands.push(island)
            })

            const explicitChildren = new Map<any, string[]>()

            function addChild(source: any, targetId: string): void {
                if (!explicitChildren.has(source)) {
                    explicitChildren.set(source, [])
                }

                explicitChildren.get(source)!.push(targetId)
            }

            islands.forEach((island: any) => {
                const mainIndex = mainlineIslands.indexOf(island)
                const nextMain = findByNode(island.nextIsland)

                if (nextMain) {
                    const isImplicitMainlineLink =
                        mainIndex !== -1 &&
                        mainlineIslands[mainIndex + 1] === nextMain

                    if (!isImplicitMainlineLink) {
                        addChild(island, idByNode.get(nextMain.islandNode)!)
                    }
                }

                ;(island.otherNextIslands ?? []).forEach((node: any) => {
                    const target = findByNode(node)

                    if (target) {
                        addChild(island, idByNode.get(target.islandNode)!)
                    }
                })
            })

            function toEntryWithParent(island: any): WorldmapEntry {
                const parent = parentOf.get(island)

                const entry = toEntry(
                    island,
                    idByNode,
                    parent?.islandNode.position,
                    !!parent
                )

                const children = explicitChildren.get(island)

                if (children?.length) {
                    entry.children = children
                }

                return entry
            }

            const mainline = mainlineIslands.map(toEntryWithParent)
            const branches = branchIslands.map(toEntryWithParent)
            const endless = findEndlessEntrances(worldMap).map(toEndlessEntry)

            const worldKey = worldMapDisplayEnum[worldMap.displayEnum]
                ?? String(worldMap.displayEnum)

            return {
                apiVersion: 1,
                worlds: {
                    [worldKey]: {
                        data: {
                            epicTarget: worldMap.MapProps.EPIC_TARGET
                        },
                        map: {
                            mode: "replace",
                            reuseOriginalPositions: true,
                            mainline,
                            branches
                        },
                        endless: {
                            keepOriginal: false,
                            nodes: endless
                        }
                    }
                }
            }
        }

        async function dumpWorldMapTemplates(): Promise<Record<string, string[]>> {
            const result: Record<string, string[]> = {}
            const worldMaps = WorldMapScene.component.wmfs

            const namespaces = Object.entries(worldMapDisplayEnum)
                .filter(([key, value]) =>
                    Number.isNaN(Number(key)) &&
                    key !== "amount" &&
                    key !== "chooser" &&
                    typeof value === "number"
                )
                .sort(([a], [b]) => a.localeCompare(b))

            for (const [namespace, displayEnum] of namespaces) {
                try {
                    let prefab = templateDumpPrefabs.get(displayEnum as number)

                    if (!prefab) {
                        const worldMapProps = worldMaps[displayEnum as number]

                        prefab = await loadWorldMapPrefab(
                            cc,
                            `worldmaps/${worldMapProps.RESNAME}WORLDMAP`
                        )

                        prefab.addRef()
                        templateDumpPrefabs.set(displayEnum as number, prefab)
                    }

                    const worldMap = prefab.data.getComponent(WorldMap.WorldMap)

                    if (!worldMap) {
                        throw new Error("WorldMap component not found")
                    }

                    result[namespace] = worldMap.levelIslands.map(
                        (island: any) => String(island.islandNode.name).toLowerCase()
                    )
                } catch (error) {
                    console.error(`[LuxisLib] Failed to dump "${namespace}":`, error)
                    result[namespace] = []
                }
            }

            console.log(JSON.stringify(result, null, 2))
            return result
        }

        let currentWorldMap: any = null

        const luxisLib = (globalThis as any).luxisLib ??= {}

        luxisLib.dumpWorldMap = (): TemplateDump | null => {
            if (!currentWorldMap?.isValid) {
                console.warn("No WorldMap is currently loaded")
                return null
            }

            try {
                const schema = dumpWorldMap(currentWorldMap)

                console.log(
                    "WorldMap dump:\n",
                    JSON.stringify(schema, null, 2)
                )

                return schema
            } catch (error) {
                console.error("Failed to dump worldmap:", error)
                return null
            }
        }

        luxisLib.dumpWorldMapTemplates = dumpWorldMapTemplates

        ctx.unsafe.hooks.wrapMethod({
            target: WorldMap.WorldMap.prototype,
            methodName: "onLoad",
            handler: ({thisArg, callNext, args}: any) => {
                currentWorldMap = thisArg
                return callNext(...args)
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: WorldMap.WorldMap.prototype,
            methodName: "onDestroy",
            handler: ({thisArg, callNext, args}: any) => {
                if (currentWorldMap === thisArg) {
                    currentWorldMap = null
                }

                return callNext(...args)
            }
        })
    })
}