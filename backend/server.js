const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Connexion à la base de données
const db = new sqlite3.Database('./blackjack.db', (err) => {
    if (err) console.error(err.message);
    console.log('✅ Connecté à la base de données.');
});

// Création de la table pour stocker les parties jouées
db.run(`CREATE TABLE IF NOT EXISTS game_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT,
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// 🔥 Middleware pour limiter à 5 parties par IP
app.use('/play', (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    db.get('SELECT COUNT(*) AS count FROM game_sessions WHERE ip_address = ?', [ip], (err, row) => {
        if (err) {
            console.error("Erreur lors de la vérification du nombre de parties :", err);
            return next(); // NE BLOQUE PAS LES AUTRES ROUTES EN CAS D'ERREUR
        }

        if (row.count >= 5) {
            return res.status(403).json({ success: false, message: "Limite de 5 parties atteinte pour cette adresse IP." });
        }

        // Ajouter une nouvelle entrée pour suivre la session
        db.run('INSERT INTO game_sessions (ip_address) VALUES (?)', [ip], (err) => {
            if (err) {
                console.error("Erreur lors de l'insertion de la session :", err);
                return next(); // NE BLOQUE PAS TOUT LE SERVEUR
            }
            next();
        });
    });
});

// Routes existantes (ajoutées en dessous de la limite de parties par IP)

// Générer un code aléatoire
function generateCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}

// Ajouter un code généré automatiquement avec un nom
app.post('/generate-code', (req, res) => {
    const { name } = req.body;
    const code = generateCode();

    db.run('INSERT INTO codes (name, code) VALUES (?, ?)', [name, code], function (err) {
        if (err) {
            return res.status(400).json({ success: false, message: "Erreur lors de l'enregistrement du code." });
        }
        res.json({ success: true, code });
    });
});

// Vérifier un code et stocker l'utilisation
app.post('/check-code', (req, res) => {
    const { name, code } = req.body;

    db.get('SELECT * FROM codes WHERE code = ? AND used = 0', [code], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: "Erreur serveur." });

        if (row) {
            db.run('UPDATE codes SET used = 1, name = ?, used_at = CURRENT_TIMESTAMP WHERE code = ?', [name, code]);
            res.json({ success: true, message: "Code valide." });
        } else {
            res.json({ success: false, message: "Code invalide ou déjà utilisé." });
        }
    });
});

// Supprimer un code de la base de données
app.post('/delete-code', (req, res) => {
    const { code } = req.body;

    db.run('DELETE FROM codes WHERE code = ?', [code], function (err) {
        if (err) {
            return res.status(500).json({ success: false, message: "Erreur lors de la suppression du code." });
        }
        res.json({ success: true, message: "Code supprimé avec succès." });
    });
});

// Récupérer tous les codes utilisés avec le nom et l'heure
app.get('/used-codes', (req, res) => {
    db.all('SELECT name, code, used_at FROM codes WHERE used = 1 ORDER BY used_at DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: "Erreur serveur." });
        res.json({ success: true, data: rows });
    });
});

// Route pour tester la limitation
app.get('/play', (req, res) => {
    res.json({ success: true, message: "Partie autorisée !" });
});

// Démarrer le serveur
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Serveur en ligne sur http://localhost:${PORT}`));
