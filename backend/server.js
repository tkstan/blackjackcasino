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

// Création de la table pour stocker les codes avec nom et timestamp
db.run(`CREATE TABLE IF NOT EXISTS codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    code TEXT UNIQUE,
    used INTEGER DEFAULT 0,
    used_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

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

// Ajouter un code en base avec un nom
app.post('/save-code', (req, res) => {
    const { name, code } = req.body;

    db.run('INSERT INTO codes (name, code) VALUES (?, ?)', [name, code], function (err) {
        if (err) {
            return res.status(400).json({ success: false, message: "Code déjà enregistré." });
        }
        res.json({ success: true, id: this.lastID });
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

// Récupérer tous les codes utilisés avec le nom et l'heure
app.get('/used-codes', (req, res) => {
    db.all('SELECT name, code, used_at FROM codes WHERE used = 1 ORDER BY used_at DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: "Erreur serveur." });
        res.json({ success: true, data: rows });
    });
});

// Démarrer le serveur
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Serveur en ligne sur http://localhost:${PORT}`));
