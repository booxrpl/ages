// Financial logic: Memecoin swaps and NFT renting marketplace

export class MarketplaceManager {
    constructor(leaderboardManager) {
        this.leaderboardManager = leaderboardManager;
        this.activeRentals = [];
        this.playerListings = [];
        this.loadMarketplace();
    }

    loadMarketplace() {
        const storedRentals = localStorage.getItem("ages_active_rentals");
        const storedListings = localStorage.getItem("ages_player_listings");
        if (storedRentals) this.activeRentals = JSON.parse(storedRentals);
        if (storedListings) this.playerListings = JSON.parse(storedListings);
    }

    saveMarketplace() {
        localStorage.setItem("ages_active_rentals", JSON.stringify(this.activeRentals));
        localStorage.setItem("ages_player_listings", JSON.stringify(this.playerListings));
    }

    // Dynamic rate based on remaining mining pool (10% of 1,000,000 supply = 100,000 AGES)
    // Swap rate decreases as pool drains (scarcity factor)
    getSwapRate(ecosystem) {
        if (!ecosystem) return 0.1000;
        const poolRatio = ecosystem.remainingPool / ecosystem.totalPool;
        // Base rate is 0.1 tokens per gold (10 gold = 1 token). As pool drains, rate goes down.
        // Also apply a small price noise factor
        const noise = (Math.random() - 0.5) * 0.002;
        const rate = (0.1 * poolRatio) + noise;
        return Number(Math.max(0.001, rate).toFixed(6));
    }

    swapGoldForAges(player, amountGold) {
        if (player.resources.gold < amountGold) {
            return { success: false, message: "Insufficient Gold for swap." };
        }
        
        const rate = this.getSwapRate(player.ecosystem);
        const tokensReceived = Math.floor(amountGold * rate);
        
        if (tokensReceived <= 0) {
            return { success: false, message: "Gold amount too small to swap for even 1 $AGES token." };
        }

        if (player.ecosystem.remainingPool < tokensReceived) {
            return { success: false, message: `Mining pool depletion: Only ${player.ecosystem.remainingPool} $AGES tokens left in the in-game extraction pool.` };
        }

        player.resources.gold -= amountGold;
        player.agesToken = (player.agesToken || 0) + tokensReceived;
        
        // Drain from mining pool
        player.ecosystem.remainingPool -= tokensReceived;

        return {
            success: true,
            amountGold: amountGold,
            agesToken: tokensReceived,
            rate: rate,
            message: `Swapped ${amountGold} Gold for ${tokensReceived} $AGES! Extracted from 10% Game Mining Allocation.`
        };
    }

    swapAgesForGold(player, amountAges) {
        if (player.agesToken < amountAges) {
            return { success: false, message: "Insufficient $AGES tokens for swap." };
        }
        const rate = this.getSwapRate(player.ecosystem);
        const goldReceived = Math.floor(amountAges / rate);

        player.agesToken -= amountAges;
        player.resources.gold += goldReceived;
        
        // Add back to mining pool
        player.ecosystem.remainingPool = Math.min(player.ecosystem.totalPool, player.ecosystem.remainingPool + amountAges);

        return {
            success: true,
            amountGold: goldReceived,
            agesToken: amountAges,
            rate: rate,
            message: `Swapped ${amountAges} $AGES for ${goldReceived} Gold! Tokens returned to Game Allocation.`
        };
    }

    async rentNFT(player, ownerId, rentalId) {
        const result = await this.leaderboardManager.rentAssetFromOnlinePlayer(ownerId, rentalId, player.resources);
        if (result.success) {
            player.resources.gold -= result.rental.cost;
            const rentalRecord = {
                ...result.rental,
                npcId: ownerId,
                timeLeft: result.rental.duration,
                active: true
            };
            this.activeRentals.push(rentalRecord);
            this.saveMarketplace();
            return { success: true, message: result.message };
        }
        return { success: false, message: result.message };
    }

    listPlayerAsset(assetName, assetType, costGold, durationTicks) {
        const newListing = {
            id: "list_" + Date.now(),
            name: assetName,
            type: assetType,
            cost: costGold,
            duration: durationTicks,
            status: "available",
            timeLeft: 0
        };
        this.playerListings.push(newListing);
        this.saveMarketplace();
        return { success: true, message: `Successfully listed your ${assetName} for rent at ${costGold} Gold!` };
    }

    updateMarketplaceTick(player) {
        let changed = false;
        
        this.activeRentals = this.activeRentals.filter(r => {
            r.timeLeft--;
            if (r.timeLeft <= 0) {
                this.leaderboardManager.returnAssetToNPC(r.npcId, r.id);
                changed = true;
                return false;
            }
            return true;
        });

        this.playerListings.forEach(listing => {
            if (listing.status === "available" && Math.random() < 0.05) {
                listing.status = "rented";
                listing.timeLeft = listing.duration;
                player.resources.gold += listing.cost;
                changed = true;
            } else if (listing.status === "rented") {
                listing.timeLeft--;
                if (listing.timeLeft <= 0) {
                    listing.status = "available";
                    changed = true;
                }
            }
        });

        if (changed) {
            this.saveMarketplace();
        }
    }

    getRentBenefits() {
        let benefits = {
            woodBonus: 1,
            goldBonus: 1,
            foodBonus: 1,
            defenseBonus: 1,
            stableUnlocked: false,
            archeryRangeUnlocked: false,
            castleUnlocked: false
        };

        this.activeRentals.forEach(r => {
            if (r.id === "rent_viper_archery") {
                benefits.archeryRangeUnlocked = true;
                benefits.woodBonus += 0.05;
            }
            if (r.id === "rent_hera_mongol") {
                benefits.foodBonus += 0.10;
            }
            if (r.id === "rent_daut_castle") {
                benefits.castleUnlocked = true;
                benefits.defenseBonus += 0.20;
            }
            if (r.id === "rent_yo_byz") {
                benefits.defenseBonus += 0.15;
            }
            if (r.id === "rent_tatoh_stable") {
                benefits.stableUnlocked = true;
                benefits.goldBonus += 0.05;
            }
        });

        return benefits;
    }
}
