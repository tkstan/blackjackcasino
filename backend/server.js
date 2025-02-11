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

// Création de la table pour stocker les codes
db.run(`CREATE TABLE IF NOT EXISTS codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Ajouter un code en base
app.post('/save-code', (req, res) => {
    const { code } = req.body;

    db.run('INSERT INTO codes (code) VALUES (?)', [code], function (err) {
        if (err) {
            return res.status(400).json({ success: false, message: "Code déjà enregistré." });
        }
        res.json({ success: true, id: this.lastID });
    });
});

// Vérifier si un code existe et n’a pas été utilisé
app.post('/check-code', (req, res) => {
    const { code } = req.body;

    db.get('SELECT * FROM codes WHERE code = ? AND used = 0', [code], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: "Erreur serveur." });

        if (row) {
            // Marquer le code comme utilisé
            db.run('UPDATE codes SET used = 1 WHERE code = ?', [code]);
            res.json({ success: true, message: "Code valide." });
        } else {
            res.json({ success: false, message: "Code invalide ou déjà utilisé." });
        }
    });
});

// Démarrer le serveur
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Serveur en ligne sur http://localhost:${PORT}`));
