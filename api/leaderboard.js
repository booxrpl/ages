module.exports = async (req, res) => {
    const bucketUrl = "https://kvdb.io/ages_of_memes_prod_v5/leaderboard";
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        try {
            const response = await fetch(bucketUrl);
            if (response.ok) {
                const data = await response.json();
                return res.status(200).json(data);
            } else if (response.status === 404) {
                return res.status(200).json([]);
            }
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
        return res.status(200).json([]);
    }

    if (req.method === 'POST') {
        try {
            let list = req.body;
            if (typeof list === 'string') {
                try {
                    list = JSON.parse(list);
                } catch(e) {}
            }
            await fetch(bucketUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(list)
            });
            return res.status(200).json({ success: true });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    res.status(405).json({ error: "Method not allowed" });
};
