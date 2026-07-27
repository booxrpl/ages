// Real-time Online Leaderboard, Combat Notifications, and Global Chat via direct KVdb.io access
import { CombatEngine } from './combat.js';

export class LeaderboardManager {
    constructor() {
        this.npcs = []; // NPCs completely removed! Only real online players.
        this.chatLogs = [];
        this.onlinePlayers = [];
        this.bucketBase = "https://kvdb.io/MwaQM3fZ1UWw1ae78w3NbM";
    }

    async fetchOnlineLeaderboard() {
        try {
            const response = await fetch(`${this.bucketBase}/leaderboard`);
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    this.onlinePlayers = data;
                    return data;
                }
            } else if (response.status === 404) {
                this.onlinePlayers = [];
                return [];
            }
        } catch (e) {
            console.error("Failed to fetch online leaderboard", e);
        }
        return this.onlinePlayers;
    }

    async saveOnlineLeaderboard(list) {
        this.onlinePlayers = list;
        try {
            await fetch(`${this.bucketBase}/leaderboard`, {
                method: "POST",
                body: JSON.stringify(list)
            });
        } catch (e) {
            console.error("Failed to post online leaderboard", e);
        }
    }

    async syncPlayerProfile(playerState) {
        if (!playerState || !playerState.registered) return;
        
        // Generate unique player ID if missing
        if (!playerState.playerId) {
            playerState.playerId = "play_" + Math.random().toString(36).substring(2, 9);
            localStorage.setItem("ages_idle_player_state", JSON.stringify(playerState));
        }

        const list = await this.fetchOnlineLeaderboard();
        const playerPower = this.calculatePower(playerState);

        // Gather listings that player lists for rent
        const listings = JSON.parse(localStorage.getItem("ages_player_listings") || "[]");

        const profile = {
            id: playerState.playerId,
            name: playerState.username,
            civ: playerState.civ,
            civPerk: playerState.civPerk || "",
            villagers: playerState.nfts.villagers || 1,
            military: {
                spearmen: playerState.military.spearmen || 0,
                archers: playerState.military.archers || 0,
                knights: playerState.military.knights || 0,
                champions: playerState.military.champions || 0,
                catapults: playerState.military.catapults || 0
            },
            resources: {
                food: playerState.resources.food || 0,
                wood: playerState.resources.wood || 0,
                gold: playerState.resources.gold || 0,
                stone: playerState.resources.stone || 0
            },
            agesToken: playerState.agesToken || 0,
            power: playerPower,
            rentals: listings, // Inject active listings into profile
            lastActive: Date.now()
        };

        const idx = list.findIndex(p => p.id === playerState.playerId);
        if (idx !== -1) {
            list[idx] = profile;
        } else {
            list.push(profile);
        }

        // Clean up inactive players (older than 72 hours) to keep DB clean
        const activeList = list.filter(p => Date.now() - p.lastActive < 259200000);

        await this.saveOnlineLeaderboard(activeList);
    }

    async queueAttackNotification(targetId, attackDetails) {
        try {
            const keyUrl = `${this.bucketBase}/attack_${targetId}`;
            const response = await fetch(keyUrl);
            let alerts = [];
            if (response.ok) {
                const text = await response.text();
                if (text && text.trim().length > 0) {
                    try {
                        alerts = JSON.parse(text);
                    } catch(e) {}
                }
            }
            if (!Array.isArray(alerts)) {
                alerts = [];
            }
            alerts.push({
                time: Date.now(),
                ...attackDetails
            });
            await fetch(keyUrl, {
                method: "POST",
                body: JSON.stringify(alerts)
            });
        } catch (e) {
            console.error("Failed to queue attack alert", e);
        }
    }

    async checkAttackNotifications(playerId) {
        try {
            const keyUrl = `${this.bucketBase}/attack_${playerId}`;
            const response = await fetch(keyUrl);
            let alerts = [];
            if (response.ok) {
                const text = await response.text();
                if (text && text.trim().length > 0) {
                    try {
                        alerts = JSON.parse(text);
                    } catch(e) {}
                }
            }
            if (!Array.isArray(alerts)) {
                alerts = [];
            }
            // Clear alert list
            if (alerts.length > 0) {
                await fetch(keyUrl, {
                    method: "POST",
                    body: JSON.stringify([])
                });
            }
            return alerts;
        } catch (e) {
            console.error("Failed to check attack notifications", e);
        }
        return [];
    }

    // Chat Logs online sync
    async fetchChatLogs() {
        try {
            const response = await fetch(`${this.bucketBase}/chat`);
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    this.chatLogs = data;
                    return data;
                }
            } else if (response.status === 404) {
                this.chatLogs = [];
                return [];
            }
        } catch (e) {
            console.error("Failed to load chat logs", e);
        }
        return this.chatLogs;
    }

    async postChatMessage(sender, msg) {
        try {
            const keyUrl = `${this.bucketBase}/chat`;
            let chat = [];
            const response = await fetch(keyUrl);
            if (response.ok) {
                try {
                    chat = await response.json();
                } catch(e) {}
            }
            if (!Array.isArray(chat)) {
                chat = [];
            }

            chat.push({ time: Date.now(), sender, msg });
            const trimmed = chat.slice(-40);

            await fetch(keyUrl, {
                method: "POST",
                body: JSON.stringify(trimmed)
            });
            this.chatLogs = trimmed;
        } catch (e) {
            console.error("Failed to post chat message", e);
        }
        
        this.renderChatConsole();
    }

    renderChatConsole() {
        // Render in manager portal logs
        const chatLogsDiv = document.getElementById("admin-server-chat-logs");
        if (chatLogsDiv) {
            chatLogsDiv.innerHTML = "";
            this.chatLogs.forEach(c => {
                const div = document.createElement("div");
                div.innerHTML = `[${new Date(c.time).toLocaleTimeString()}]: <strong>${c.sender}</strong>: ${c.msg}`;
                chatLogsDiv.appendChild(div);
            });
            chatLogsDiv.scrollTop = chatLogsDiv.scrollHeight;
        }

        // Render in player public lobby chat box
        const globalChatDiv = document.getElementById("global-chat-box");
        if (globalChatDiv) {
            globalChatDiv.innerHTML = "";
            if (this.chatLogs.length === 0) {
                globalChatDiv.innerHTML = `<div class="text-muted text-center py-4">No messages in global chat yet. Be the first to shout out to the realm!</div>`;
            } else {
                this.chatLogs.forEach(c => {
                    const div = document.createElement("div");
                    div.style.marginBottom = "8px";
                    div.innerHTML = `<span class="text-muted" style="font-size:0.75rem;">[${new Date(c.time).toLocaleTimeString()}]</span> <strong class="text-warning">${c.sender}</strong>: <span style="color:#e0e0e0;">${c.msg}</span>`;
                    globalChatDiv.appendChild(div);
                });
            }
            globalChatDiv.scrollTop = globalChatDiv.scrollHeight;
        }
    }

    calculatePower(player) {
        if (!player) return 0;
        const vPower = (player.nfts ? (player.nfts.villagers || 0) : 0) * 100;
        const mPower = (player.military.spearmen || 0) * 50 +
                       (player.military.archers || 0) * 60 +
                       (player.military.knights || 0) * 120 +
                       (player.military.champions || 0) * 80 +
                       (player.military.catapults || 0) * 150;
        const bPower = (player.nfts ? (
            (player.nfts.barracks ? 300 : 0) +
            (player.nfts.stable ? 400 : 0) +
            (player.nfts.archeryRange ? 400 : 0) +
            (player.nfts.castle ? 1000 : 0)
        ) : 0);
        return vPower + mPower + bPower;
    }

    async getLeaderboard(playerState = null) {
        const list = await this.fetchOnlineLeaderboard();
        return list.sort((a, b) => b.power - a.power);
    }

    getRentedAssets() {
        let assets = [];
        this.onlinePlayers.forEach(p => {
            if (p.rentals && Array.isArray(p.rentals)) {
                p.rentals.forEach(r => {
                    assets.push({
                        ...r,
                        ownerName: p.name,
                        ownerId: p.id
                    });
                });
            }
        });
        return assets;
    }

    async rentAssetFromOnlinePlayer(ownerId, rentalId, playerResources) {
        const list = await this.fetchOnlineLeaderboard();
        const owner = list.find(p => p.id === ownerId);
        if (!owner) return { success: false, message: "Owner profile not found online." };
        
        const rental = owner.rentals.find(r => r.id === rentalId);
        if (!rental) return { success: false, message: "Rental listing not found on player profile." };
        if (rental.status !== "available") return { success: false, message: "Listing is already hired." };

        if (playerResources.gold < rental.cost) {
            return { success: false, message: "Not enough gold to hire this NFT." };
        }

        // Lock listing
        rental.status = "rented";
        owner.resources.gold += rental.cost; // Reward the owner

        // Save target profile back to DB
        await this.saveOnlineLeaderboard(list);

        // Queue alert notification for the owner
        await this.queueAttackNotification(ownerId, {
            type: "rented_alert",
            title: "🪙 NFT Hire Alert",
            msg: `Another player hired your '${rental.name}' listing! You received 🪙 ${rental.cost} Gold.`,
            alertType: "success"
        });

        return {
            success: true,
            rental: rental,
            message: `Successfully leased ${rental.name} from player ${owner.name}!`
        };
    }
}
