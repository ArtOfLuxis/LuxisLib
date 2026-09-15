
export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const worldMapModule = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/WorldMap.ts")
        const plantsModule = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Plants.ts")
        const trophiesModule = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Trophies.ts")
        const playerPropertiesModule = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/PlayerProperties.ts")

        const islandDisplayNames = ["level", "plant", "giftBox", "upgrade", "epicPortal"]
        const appearanceNames = ["normal", "minigame", "gargantuar", "zomboss"]

        function makeId(island, i) {
            return island.islandNode.name
        }

        function toEntry(island, idByNode, prevPos, prevSiblingIndex, hasParent) {
            const entry = {
                id: idByNode.get(island.islandNode),
                type: islandDisplayNames[island.islandDisplay],
            }
            const isDecoration = island.islandDisplay !== 0
            const useAbsolutePosition = isDecoration || !hasParent

            if (island.islandDisplay === 0) {
                entry.appearance = appearanceNames[island.levelNodeAppearance]
                entry.levels = island.levelJsonsID.slice()
                if (island.levelNodeName) entry.title = island.levelNodeName
                entry.template = island.levelJsonsID.length > 1
                    ? { levelIds: island.levelJsonsID.slice() }
                    : { levelId: island.levelJsonsID[0] }
            } else if (island.islandDisplay === 1) {
                entry.template = { type: "plant", plantDisplayed: island.plantDisplayed }
                entry.plantReward = plantsModule.plants.getPlantFeature(island.plantDisplayed)?.CODENAME
            } else if (island.islandDisplay === 3) {
                entry.template = { type: "upgrade", upgradeDisplayed: island.upgradeDisplayed }
                entry.upgradeReward = trophiesModule.UpgradeEnum
                    ? trophiesModule.UpgradeEnum[island.upgradeDisplayed]
                    : island.upgradeDisplayed
            } else if (island.islandDisplay === 4) {
                entry.template = { type: "epicPortal" }
                entry.portalLevels = island.epicLevelJsonsID.slice()
            } else if (island.islandDisplay === 2) {
                entry.template = { type: "giftBox" }
            }

            const pos = island.islandNode.position
            const siblingIndex = island.islandNode.getSiblingIndex()

            if (useAbsolutePosition) {
                entry.position = {
                    x: Math.round(pos.x * 100) / 100,
                    y: Math.round(pos.y * 100) / 100,
                    z: siblingIndex,
                }
            } else {
                const basePos = prevPos ?? pos
                const baseSiblingIndex = prevSiblingIndex ?? siblingIndex
                entry.relativePosition = {
                    x: Math.round((pos.x - basePos.x) * 100) / 100,
                    y: Math.round((pos.y - basePos.y) * 100) / 100,
                    z: siblingIndex - baseSiblingIndex,
                }
            }

            return entry
        }

        function dumpWorldMap(worldMap) {
            const islands = worldMap.levelIslands
            const idByNode = new Map()
            islands.forEach((island, i) => idByNode.set(island.islandNode, makeId(island, i)))
            const findByNode = (node) => islands.find((isl) => isl.islandNode === node)

            const parentOf = new Map()
            islands.forEach((island) => {
                const nextMain = findByNode(island.nextIsland)
                if (nextMain && !parentOf.has(nextMain)) parentOf.set(nextMain, island)
                ;(island.otherNextIslands ?? []).forEach((node) => {
                    const branchTarget = findByNode(node)
                    if (branchTarget && !parentOf.has(branchTarget)) parentOf.set(branchTarget, island)
                })
            })

            const startSet = new Set(worldMap.startingLevels ?? [])
            const rootIslands = islands.filter((isl) => isl.levelJsonsID?.some((lvl) => startSet.has(lvl)))

            const mainlineIslands = []
            const mainlineSet = new Set()
            let current = rootIslands[0]
            while (current && !mainlineSet.has(current)) {
                mainlineSet.add(current)
                mainlineIslands.push(current)
                current = findByNode(current.nextIsland)
            }

            const remaining = new Set(islands.filter((isl) => !mainlineSet.has(isl)))
            const outputSet = new Set(mainlineSet)
            const branchIslands = []
            let progressed = true
            while (remaining.size && progressed) {
                progressed = false
                for (const isl of Array.from(remaining)) {
                    const parent = parentOf.get(isl)
                    if (!parent || outputSet.has(parent)) {
                        branchIslands.push(isl)
                        outputSet.add(isl)
                        remaining.delete(isl)
                        progressed = true
                    }
                }
            }
            remaining.forEach((isl) => {
                ctx.log.warn(`Island ${idByNode.get(isl.islandNode)} has no resolvable parent chain — check its position manually`)
                branchIslands.push(isl)
            })

            const explicitChildren = new Map()
            function addChild(source, targetId) {
                if (!explicitChildren.has(source)) explicitChildren.set(source, [])
                explicitChildren.get(source).push(targetId)
            }
            islands.forEach((island) => {
                const mainIdx = mainlineIslands.indexOf(island)
                const nextMain = findByNode(island.nextIsland)
                if (nextMain) {
                    const isImplicitMainlineLink = mainIdx !== -1 && mainlineIslands[mainIdx + 1] === nextMain
                    if (!isImplicitMainlineLink) addChild(island, idByNode.get(nextMain.islandNode))
                }
                ;(island.otherNextIslands ?? []).forEach((node) => {
                    const target = findByNode(node)
                    if (target) addChild(island, idByNode.get(target.islandNode))
                })
            })

            function toEntryWithParent(island) {
                const parent = parentOf.get(island)
                const entry = toEntry(
                    island,
                    idByNode,
                    parent ? parent.islandNode.position : null,
                    parent ? parent.islandNode.getSiblingIndex() : null,
                    !!parent
                )
                const kids = explicitChildren.get(island)
                if (kids?.length) entry.children = kids
                return entry
            }

            const mainline = mainlineIslands.map(toEntryWithParent)
            const branches = branchIslands.map(toEntryWithParent)

            const worldKey = playerPropertiesModule.WorldMapSceneDisplayEnum
                ? playerPropertiesModule.WorldMapSceneDisplayEnum[worldMap.displayEnum]
                : worldMap.displayEnum

            return {
                [worldKey]: {
                    data: { epicTarget: worldMap.MapProps.EPIC_TARGET },
                    map: {
                        mode: "replace",
                        reuseOriginalPositions: true,
                        mainline,
                        branches
                    }
                }
            }
        }

        const cc = ctx.unsafe.engine.getCc()
        const instantiate = cc.instantiate

        const posKey = (pos) => `${Math.round(pos.x)},${Math.round(pos.y)}`

        const islandArtSnapshots = new WeakMap()
        let currentWorldMap = null

        ctx.unsafe.hooks.wrapMethod({
            target: worldMapModule.WorldMap.prototype,
            methodName: "init",
            handler: ({ args, thisArg, callNext }) => {
                const resultPromise = callNext(...args)
                Promise.resolve(resultPromise).then(() => {
                    currentWorldMap = thisArg

                    try {
                        restoreIslandArt(thisArg)
                    } catch (e) {
                        console.error("Failed to restore island art: " + e)
                    }

                    try {
                        fixNodeLayering(thisArg)
                    } catch (e) {
                        console.error("Failed to fix node layering: " + e)
                    }
                })
                return resultPromise
            }
        })

        globalThis.luxisLib = globalThis.luxisLib ?? {}
        globalThis.luxisLib.dumpWorldMap = () => {
            if (!currentWorldMap) {
                console.warn("No WorldMap is currently loaded")
                return null
            }
            try {
                const schema = dumpWorldMap(currentWorldMap)
                console.log(
                    "WorldMap dump:\n",
                    JSON.stringify(schema, null, 2)
                        .slice(1, -1)
                )
                return schema
            } catch (e) {
                console.error("Failed to dump worldmap: " + e)
                return null
            }
        }

        function fixNodeLayering(worldMap) {
            const nodes = worldMap.levelIslands.map(isl => isl.islandNode).filter(Boolean)
            if (!nodes.length) return

            const byParent = new Map()
            nodes.forEach((node) => {
                const p = node.parent
                if (!p) return
                if (!byParent.has(p)) byParent.set(p, [])
                byParent.get(p).push(node)
            })

            byParent.forEach((groupNodes, parent) => {
                const allZero = groupNodes.every((n) => n.position.z === 0)
                if (allZero) {
                    return
                }

                const sorted = groupNodes.slice().sort((a, b) => a.position.z - b.position.z)
                sorted.forEach((node, i) => node.setSiblingIndex(i))
            })
        }

        ctx.unsafe.hooks.wrapMethod({
            target: worldMapModule.WorldMap.prototype,
            methodName: "onLoad",
            handler: ({ args, thisArg, callNext }) => {
                const result = callNext(...args)

                try {
                    snapshotIslandArt(thisArg)
                } catch (e) {
                    console.error("Failed to snapshot island art: " + e)
                }

                return result
            }
        })

        function snapshotIslandArt(worldMap) {
            const snapshot = new Map()
            worldMap.levelIslands.forEach((island) => {
                const artNode = island.islandNode.children.find(c => c.name === "island")

                if (artNode) {
                    const clone = instantiate(artNode)
                    clone.removeFromParent()
                    snapshot.set(posKey(island.islandNode.position), {
                        node: clone,
                        localPosition: artNode.position.clone(),
                        localScale: artNode.scale.clone(),
                        localRotation: artNode.rotation.clone(),
                    })
                }

            })
            islandArtSnapshots.set(worldMap, snapshot)
        }

        function restoreIslandArt(worldMap) {
            const snapshot = islandArtSnapshots.get(worldMap)

            if (!snapshot || snapshot.size === 0) return
            worldMap.levelIslands.forEach((island) => {
                const hasArt = island.islandNode.children.some(c => c.name === "island")
                if (hasArt) return
                const saved = snapshot.get(posKey(island.islandNode.position))
                if (!saved) return
                const clone = instantiate(saved.node)
                clone.name = "island"
                clone.parent = island.islandNode
                clone.position = saved.localPosition
                clone.scale = saved.localScale
                clone.rotation = saved.localRotation
            })
        }

    })
}