// Leaderboard, NPC Active Simulation, and Multiplayer Lobby Logs
import { CombatEngine } from './combat.js';

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
        this.chatLogs = [];
        this.loadPlayers();
        this.loadChatLogs();
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

    loadChatLogs() {
        const stored = localStorage.getItem("ages_idle_server_chats");
        if (stored) {
            this.chatLogs = JSON.parse(stored);
        } else {
            this.chatLogs = [
                { time: Date.now() - 300000, sender: "SYSTEM", msg: "Lobby server initialized on ages-tau.vercel.app." },
                { time: Date.now() - 200000, sender: "TheViper", msg: "GL HF everyone! Time to farm." },
                { time: Date.now() - 100000, sender: "Hera", msg: "PepeKing just registered a Mongols faction!" }
            ];
            this.saveChatLogs();
        }
    }

    saveChatLogs() {
        localStorage.setItem("ages_idle_server_chats", JSON.stringify(this.chatLogs.slice(-100))); // Keep last 100 logs
    }

    addChat(sender, msg) {
        this.chatLogs.push({ time: Date.now(), sender, msg });
        this.saveChatLogs();
        
        // Dynamic console log rendering if element is visible
        const chatLogsDiv = document.getElementById("admin-server-chat-logs");
        if (chatLogsDiv) {
            const div = document.createElement("div");
            div.innerHTML = `[${new Date().toLocaleTimeString()}]: <strong>${sender}</strong>: ${msg}`;
            chatLogsDiv.appendChild(div);
            chatLogsDiv.scrollTop = chatLogsDiv.scrollHeight;
        }
    }

    getLeaderboard(playerState = null) {
        let allPlayers = [...this.npcs];
        if (playerState && playerState.registered) {
            const playerIndex = allPlayers.findIndex(p => p.id === "player");
            const playerPower = this.calculatePower(playerState);
            const playerData = {
                id: "player",
                name: `${playerState.username} (You)`,
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
                       (player.military.champions || 0) * 80 +
                       (player.military.catapults || 0) * 150;
        const bPower = (player.nfts.barracks ? 300 : 0) +
                       (player.nfts.stable ? 400 : 0) +
                       (player.nfts.archeryRange ? 400 : 0) +
                       (player.nfts.castle ? 1000 : 0);
        return vPower + mPower + bPower;
    }

    updateNPCTick(playerState = null) {
        const events = [];
        
        // 1. NPC Resource gather and unit generation
        this.npcs.forEach(npc => {
            const gatherRate = npc.villagers * 0.7;
            npc.resources.food += Math.floor(gatherRate * (1 + Math.random() * 0.5));
            npc.resources.wood += Math.floor(gatherRate * (1 + Math.random() * 0.5));
            npc.resources.gold += Math.floor(gatherRate * (0.8 + Math.random() * 0.4));
            npc.resources.stone += Math.floor(gatherRate * (0.5 + Math.random() * 0.3));

            // Generate villagers
            if (npc.resources.food > 300 && npc.villagers < 40 && Math.random() < 0.15) {
                npc.villagers += 1;
                npc.resources.food -= 50;
                if (Math.random() < 0.2) {
                    this.addChat(npc.id === "npc_viper" ? "TheViper" : npc.name.split(" ")[0], `Minted worker NFT #${1000 + npc.villagers}`);
                }
            }

            // Train military units
            if (npc.resources.food > 800 && npc.resources.wood > 800) {
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

            npc.power = (npc.villagers * 100) +
                        (npc.military.spearmen * 50) +
                        (npc.military.archers * 60) +
                        (npc.military.knights * 120) +
                        (npc.military.champions * 80) +
                        2000;
        });

        // 2. Simulated Player Sign-ups
        if (Math.random() < 0.12 && this.npcs.length < 15) {
            const mockNames = [
                { name: "PepeKing", civ: "Franks" },
                { name: "VitalikWarrior", civ: "Mongols" },
                { name: "XRP_Maximalist", civ: "Byzantines" },
                { name: "WojakFarmer", civ: "Britons" },
                { name: "ChadGiga", civ: "Teutons" },
                { name: "AoeMemeArchon", civ: "Huns" }
            ];
            
            // Pick a name that isn't registered yet
            const unused = mockNames.filter(m => !this.npcs.some(n => n.name.includes(m.name)));
            if (unused.length > 0) {
                const pick = unused[Math.floor(Math.random() * unused.length)];
                const newPlayer = {
                    id: "sim_" + Math.random().toString(36).substring(2, 9),
                    name: `${pick.name} (${pick.civ})`,
                    civ: pick.civ,
                    civPerk: `Simulated Faction Perk: +10% extra capability`,
                    villagers: 5,
                    military: { spearmen: 2, archers: 1, knights: 0, champions: 0 },
                    resources: { food: 500, wood: 500, gold: 300, stone: 100 },
                    agesToken: 10,
                    power: 1200,
                    rentals: []
                };
                this.npcs.push(newPlayer);
                this.addChat("SERVER", `📡 Player '${pick.name}' has signed up on the blockchain using Civilization: ${pick.civ}!`);
                events.push({
                    type: "signup",
                    title: "New Player Connection",
                    msg: `${pick.name} has joined the game lobby.`,
                    alertType: "info"
                });
            }
        }

        // 3. Simulated Chats & Raid actions
        if (Math.random() < 0.35) {
            const activeNPCs = this.npcs.filter(n => n.id.startsWith("npc_") || n.id.startsWith("sim_"));
            const chatter = activeNPCs[Math.floor(Math.random() * activeNPCs.length)];
            const chatterName = chatter.name.split(" ")[0];

            const comments = [
                "Anyone selling Gold? Need to buy Castle upgrade.",
                "Hiring wood gather structures at Marketplace, check rentals!",
                "Mining gold camp speed is incredible in Castle Age.",
                "Raid map is very profitable today.",
                "My villagers are farming food like crazy.",
                "GG, my spearman army is ready to block any knights.",
                "Just claimed an achievement, got free $AGES memecoin!"
            ];
            this.addChat(chatterName, comments[Math.floor(Math.random() * comments.length)]);
        }

        // 4. Automated Raids
        if (Math.random() < 0.15 && playerState && playerState.registered) {
            // NPC Raids Player
            const activeNPCs = this.npcs.filter(n => n.id.startsWith("npc_") || n.id.startsWith("sim_"));
            const raider = activeNPCs[Math.floor(Math.random() * activeNPCs.length)];
            const raiderName = raider.name.split(" ")[0];

            const stealFood = Math.floor(playerState.resources.food * 0.08);
            const stealGold = Math.floor(playerState.resources.gold * 0.08);

            playerState.resources.food = Math.max(0, playerState.resources.food - stealFood);
            playerState.resources.gold = Math.max(0, playerState.resources.gold - stealGold);

            // Damage a random building
            const buildings = [];
            if (playerState.nfts.mill > 0) buildings.push("mill");
            if (playerState.nfts.lumberCamp > 0) buildings.push("lumberCamp");
            if (playerState.nfts.miningCamp > 0) buildings.push("miningCamp");
            if (playerState.nfts.barracks) buildings.push("barracks");
            if (playerState.nfts.stable) buildings.push("stable");
            if (playerState.nfts.archeryRange) buildings.push("archeryRange");
            if (playerState.nfts.university) buildings.push("university");
            if (playerState.nfts.market) buildings.push("market");
            if (playerState.nfts.castle) buildings.push("castle");

            let damagedStr = "no structures damaged";
            if (buildings.length > 0) {
                const targetB = buildings[Math.floor(Math.random() * buildings.length)];
                const dmg = Math.floor(100 + Math.random() * 150);
                
                playerState.buildingHP[targetB] = Math.max(0, (playerState.buildingHP[targetB] || 600) - dmg);
                damagedStr = `your ${targetB.toUpperCase()} sustained ${dmg} damage`;

                if (playerState.buildingHP[targetB] === 0) {
                    // Destroy building NFT
                    if (targetB === "mill" || targetB === "lumberCamp" || targetB === "miningCamp") {
                        playerState.nfts[targetB] = Math.max(0, playerState.nfts[targetB] - 1);
                    } else {
                        playerState.nfts[targetB] = false;
                    }
                    damagedStr += ` and was COMPLETELY DESTROYED!`;
                }
            }

            // Wound a random villager
            let villagerStr = "no workers injured";
            if (playerState.villagerList && playerState.villagerList.length > 0) {
                const activeWorkers = playerState.villagerList.filter(v => v.role !== "idle");
                if (activeWorkers.length > 0) {
                    const victim = activeWorkers[Math.floor(Math.random() * activeWorkers.length)];
                    victim.hp = Math.max(0, victim.hp - 35);
                    villagerStr = `${victim.name} suffered 35 damage`;
                    
                    if (victim.hp === 0) {
                        victim.role = "idle"; // Reset job to idle
                        villagerStr += ` and is now incapacitated! Treat them in the Worker Guild!`;
                    }
                }
            }

            this.addChat("SERVER", `💥 WAR ALERT: '${raiderName}' launched a raid against '${playerState.username}'! Plundered assets: 🍖 ${stealFood} food, 🪙 ${stealGold} gold.`);

            events.push({
                type: "attack",
                title: `💥 Under Raid Attack: ${raiderName}`,
                msg: `Plundered: 🍖 ${stealFood} Food, 🪙 ${stealGold} Gold. Damage: ${damagedStr}. Workers: ${villagerStr}.`,
                alertType: "danger"
            });
        }

        // 5. NPC Raids NPC
        if (Math.random() < 0.12) {
            const activeNPCs = this.npcs.filter(n => n.id.startsWith("npc_") || n.id.startsWith("sim_"));
            if (activeNPCs.length >= 2) {
                const raiderIdx = Math.floor(Math.random() * activeNPCs.length);
                let defenderIdx = Math.floor(Math.random() * activeNPCs.length);
                while (defenderIdx === raiderIdx) {
                    defenderIdx = Math.floor(Math.random() * activeNPCs.length);
                }

                const raider = activeNPCs[raiderIdx];
                const defender = activeNPCs[defenderIdx];
                const rName = raider.name.split(" ")[0];
                const dName = defender.name.split(" ")[0];

                const plFood = Math.floor(defender.resources.food * 0.1);
                const plWood = Math.floor(defender.resources.wood * 0.1);

                defender.resources.food -= plFood;
                defender.resources.wood -= plWood;
                raider.resources.food += plFood;
                raider.resources.wood += plWood;

                this.addChat("SERVER", `⚔️ COMBAT MAP: '${rName}' successfully raided '${dName}' and plundered: 🍖 ${plFood} food, 🪵 ${plWood} wood.`);
                events.push({
                    type: "npc_raid",
                    title: "NPC Combat Resolution",
                    msg: `${rName} raided ${dName} and plundered 🍖 ${plFood} food, 🪵 ${plWood} wood.`,
                    alertType: "info"
                });
            }
        }

        this.saveLeaderboard();
        return events;
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

        if (playerResources.gold < rental.cost) {
            return { success: false, message: "Not enough gold to rent this NFT asset." };
        }

        rental.status = "rented";
        npc.resources.gold += rental.cost;
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
