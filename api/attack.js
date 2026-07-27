export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { playerId } = req.query;

    if (req.method === 'GET') {
        if (!playerId) return res.status(400).json({ error: "playerId required" });
        const keyUrl = `https://kvdb.io/ages_of_memes_prod_v5/attack_${playerId}`;

        try {
            const response = await fetch(keyUrl);
            let alerts = [];
            if (response.ok) {
                const text = await response.text();
                if (text && text.trim().length > 0) {
                    alerts = JSON.parse(text);
                }
            }

            // Clear alert list
            await fetch(keyUrl, {
                method: "POST",
                body: JSON.stringify([])
            });

            return res.status(200).json(alerts);
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    if (req.method === 'POST') {
        let body = req.body;
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            } catch(e) {}
        }
        const { targetId, alert } = body || {};
        if (!targetId || !alert) return res.status(400).json({ error: "targetId and alert required" });
        const keyUrl = `https://kvdb.io/ages_of_memes_prod_v5/attack_${targetId}`;

        try {
            const response = await fetch(keyUrl);
            let alerts = [];
            if (response.ok) {
                const text = await response.text();
                if (text && text.trim().length > 0) {
                    alerts = JSON.parse(text);
                }
            }

            alerts.push({
                time: Date.now(),
                ...alert
            });

            await fetch(keyUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(alerts)
            });

            return res.status(200).json({ success: true });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    res.status(405).json({ error: "Method not allowed" });
}
