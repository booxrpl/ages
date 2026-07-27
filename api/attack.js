const https = require('https');

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                } else if (res.statusCode === 404) {
                    resolve(null);
                } else {
                    reject(new Error(`Status Code: ${res.statusCode}`));
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

function httpsPost(url, payload) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data);
                } else {
                    reject(new Error(`Status Code: ${res.statusCode}`));
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.write(payload);
        req.end();
    });
}

async function getBody(req) {
    if (req.body) {
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (e) {}
        }
        return body;
    }
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                resolve(body);
            }
        });
    });
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { playerId } = req.query;

    if (req.method === 'GET') {
        if (!playerId) return res.status(400).json({ error: "playerId required" });
        const keyUrl = `https://kvdb.io/MwaQM3fZ1UWw1ae78w3NbM/attack_${playerId}`;

        try {
            let alerts = await httpsGet(keyUrl);
            if (!Array.isArray(alerts)) {
                alerts = [];
            }

            // Clear alert list
            await httpsPost(keyUrl, JSON.stringify([]));

            return res.status(200).json(alerts);
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    if (req.method === 'POST') {
        try {
            const body = await getBody(req);
            const { targetId, alert } = body || {};
            if (!targetId || !alert) return res.status(400).json({ error: "targetId and alert required" });
            const keyUrl = `https://kvdb.io/MwaQM3fZ1UWw1ae78w3NbM/attack_${targetId}`;

            let alerts = await httpsGet(keyUrl);
            if (!Array.isArray(alerts)) {
                alerts = [];
            }

            alerts.push({
                time: Date.now(),
                ...alert
            });

            await httpsPost(keyUrl, JSON.stringify(alerts));

            return res.status(200).json({ success: true });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    res.status(405).json({ error: "Method not allowed" });
};
