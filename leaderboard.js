// Leaderboard and NPC Simulation logic

export class LeaderboardManager {
    constructor() {
        this.npcs = [
            {
                id: "npc_viper",
                name: "TheViper (Britons)",
                civ: "Britons",
                civPerk: "Briton Longbowmen: Archers attack +15%, Wood gather +10%",
                villagers: 25,
                military: { spearmen: 20, archers: 45, knights: 15, champions: 10 },
                resources: { food: 5000, wood: 8000, gold: 6000, stone: 4000 },
                agesToken: 1200,
                power: 8500,
                rentals: [
                    { id: "rent_viper_archery", name: "Archery Range NFT", type: "building", cost: 150, duration: 60, status: "available", benefit: "Enables Archery Range training & increases wood gather by 5%" }
                ]
            },
            {
                id: "npc_hera",
                name: "Hera (Mongols)",
                civ: "Mongols",
                civPerk: "Mongol Mangudai: Cavalry attack +15%, Hunt (Food) gather +15%",
                villagers: 22,
                military: { spearmen: 15, archers: 20, knights: 40, champions: 15 },
                resources: { food: 9000, wood: 6000, gold: 8000, stone: 3000 },
                agesToken: 1500,
                power: 9200,
                rentals: [
                    { id: "rent_hera_mongol", name: "Mongol Civ Perk NFT", type: "civ", cost: 300, duration: 90, status: "available", benefit: "Cavalry speed/attack +10% & Food gathering +10%" }
                ]
            },
            {
                id: "npc_daut",
                name: "Daut (Teutons)",
                civ: "Teutons",
                civPerk: "Teutonic Knights: Castle attack +15%, Infantry armor +10%",
                villagers: 30,
                military: { spearmen: 40, archers: 10, knights: 20, champions: 35 },
                resources: { food: 7000, wood: 7000, gold: 5000, stone: 8000 },
                agesToken: 950,
                power: 7900,
                rentals: [
                    { id: "rent_daut_castle", name: "Castle NFT", type: "building", cost: 250, duration: 120, status: "available", benefit: "Enables unique units training & increases defense by 20%" }
                ]
            },
            {
                id: "npc_yo",
                name: "Mr_Yo (Byzantines)",
                civ: "Byzantines",
                civPerk: "Byzantine Cataphracts: Buildings +20% HP, Counter-units cost -15%",
                villagers: 28,
                military: { spearmen: 50, archers: 30, knights: 10, champions: 20 },
                resources: { food: 6500, wood: 6500, gold: 7500, stone: 6000 },
                agesToken: 1100,
                power: 8100,
                rentals: [
                    { id: "rent_yo_byz", name: "Byzantine Civ NFT", type: "civ", cost: 200, duration: 80, status: "available", benefit: "Provides 15% discount on defensive building units" }
                ]
            },
            {
                id: "npc_tatoh",
                name: "Tatoh (Franks)",
                civ: "Franks",
                civPerk: "Frankish Paladin: Cavalry HP +20%, Farm (Food) gather +10%",
                villagers: 20,
                military: { spearmen: 10, archers: 15, knights: 35, champions: 25 },
                resources: { food: 8000, wood: 5000, gold: 6000, stone: 2000 },
                agesToken: 850,
                power: 7400,
                rentals: [
                    { id: "rent_tatoh_stable", name: "Stable NFT", type: "building", cost: 120, duration: 60, status: "available", benefit: "Enables Cavalry recruitment & increases gold gather by 5%" }
                ]
            }
        ];
        this.loadPlayers();
    }

    loadPlayers() {
        const stored = localStorage.getItem("ages_idle_leaderboard");
        if (stored) {
            this.npcs = JSON.parse(stored);
        } else {
            this.saveLeaderboard();
        }
    }

    saveLeaderboard() {
        localStorage.setItem("ages_idle_leaderboard", JSON.stringify(this.npcs));
    }

    getLeaderboard(playerState = null) {
        let allPlayers = [...this.npcs];
        if (playerState && playerState.registered) {
            // Find and update or add the current player
            const playerIndex = allPlayers.findIndex(p => p.id === "player");
            const playerPower = this.calculatePower(playerState);
            const playerData = {
                id: "player",
                name: `${playerState.username} (${playerState.civ})`,
                civ: playerState.civ,
                civPerk: playerState.civPerk || "",
                villagers: playerState.nfts.villagers || 1,
                military: { ...playerState.military },
                resources: { ...playerState.resources },
                agesToken: playerState.agesToken || 0,
                power: playerPower,
                isUser: true
            };
            if (playerIndex !== -1) {
                allPlayers[playerIndex] = playerData;
            } else {
                allPlayers.push(playerData);
            }
        }
        return allPlayers.sort((a, b) => b.power - a.power);
    }

    calculatePower(player) {
        if (!player) return 0;
        const vPower = (player.nfts.villagers || 0) * 100;
        const mPower = (player.military.spearmen || 0) * 50 +
                       (player.military.archers || 0) * 60 +
                       (player.military.knights || 0) * 120 +
                       (player.military.champions || 0) * 80;
        const bPower = (player.nfts.barracks ? 300 : 0) +
                       (player.nfts.stable ? 400 : 0) +
                       (player.nfts.archeryRange ? 400 : 0) +
                       (player.nfts.castle ? 1000 : 0);
        return vPower + mPower + bPower;
    }

    updateNPCTick() {
        // Slowly increase NPC resources and power to simulate active gaming
        this.npcs.forEach(npc => {
            const gatherRate = npc.villagers * 0.5; // per resource per tick
            npc.resources.food += Math.floor(gatherRate * (1 + Math.random() * 0.5));
            npc.resources.wood += Math.floor(gatherRate * (1 + Math.random() * 0.5));
            npc.resources.gold += Math.floor(gatherRate * (0.8 + Math.random() * 0.4));
            npc.resources.stone += Math.floor(gatherRate * (0.5 + Math.random() * 0.3));

            // Occasionally train units if resources allow
            if (npc.resources.food > 1000 && npc.resources.wood > 1000) {
                const choice = Math.random();
                if (choice < 0.25) {
                    npc.military.spearmen += 1;
                    npc.resources.food -= 50;
                    npc.resources.wood -= 35;
                } else if (choice < 0.50) {
                    npc.military.archers += 1;
                    npc.resources.wood -= 45;
                    npc.resources.gold -= 35;
                } else if (choice < 0.75 && npc.resources.gold > 500) {
                    npc.military.knights += 1;
                    npc.resources.food -= 60;
                    npc.resources.gold -= 75;
                } else if (npc.resources.food > 500) {
                    npc.military.champions += 1;
                    npc.resources.food -= 60;
                    npc.resources.gold -= 20;
                }
            }
            // Recalculate NPC power
            npc.power = (npc.villagers * 100) +
                        (npc.military.spearmen * 50) +
                        (npc.military.archers * 60) +
                        (npc.military.knights * 120) +
                        (npc.military.champions * 80) +
                        2000; // Base building power
        });
        this.saveLeaderboard();
    }

    getRentedAssets() {
        let assets = [];
        this.npcs.forEach(npc => {
            if (npc.rentals) {
                npc.rentals.forEach(r => {
                    assets.push({
                        ...r,
                        ownerName: npc.name,
                        ownerId: npc.id
                    });
                });
            }
        });
        return assets;
    }

    rentAssetFromNPC(npcId, rentalId, playerResources) {
        const npc = this.npcs.find(n => n.id === npcId);
        if (!npc) return { success: false, message: "NPC owner not found." };
        const rental = npc.rentals.find(r => r.id === rentalId);
        if (!rental) return { success: false, message: "Rental asset not found." };
        if (rental.status !== "available") return { success: false, message: "Asset is already rented." };

        // Deduct Gold from player resources (handled in game state, passed as arg for verification)
        if (playerResources.gold < rental.cost) {
            return { success: false, message: "Not enough gold to rent this NFT asset." };
        }

        rental.status = "rented";
        npc.resources.gold += rental.cost; // NPC gets the gold
        this.saveLeaderboard();

        return {
            success: true,
            rental: rental,
            message: `Successfully rented ${rental.name} from ${npc.name}!`
        };
    }

    returnAssetToNPC(npcId, rentalId) {
        const npc = this.npcs.find(n => n.id === npcId);
        if (!npc) return;
        const rental = npc.rentals.find(r => r.id === rentalId);
        if (rental) {
            rental.status = "available";
            this.saveLeaderboard();
        }
    }
}
