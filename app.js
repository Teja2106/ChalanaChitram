import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import session from 'express-session';
import pkg from 'pg';

const app = express();
const PORT = 3000;

const  { Pool } = pkg;
const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "cc_ticketing",
    password: "Shoyo@UwU",
    port: 5432,
});

global.__dirname = path.resolve();
app.use(express.static(path.join(__dirname, "public")));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// Configure the session middleware
app.use(session({
    secret: 'gstudiochalanachitram',
    resave: false,
    saveUninitialized: true
}));

function getCurrentDay() {
    const now = new Date();
    const eventStartDate = new Date('2024-02-23');
    const eventEndDate = new Date('2024-02-25');

    if (now >= eventStartDate && now <= eventEndDate) {
        const diffTime = Math.abs(now - eventStartDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays + 1;
    } else {
        return -1;
    }
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/ccqr2024', (req, res) => {
    res.render('qrScanner.ejs', { error: "" });
});

app.post('/ccqr2024', async (req, res) => {
    try {
        let hashText = req.body.hashText;
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM cc_reg WHERE hash_mail = $1', [hashText]);
        client.release();

        if (result.rows.length > 0) {
            const user = result.rows[0];
            req.session.user = user; // Store user data in the session
            res.redirect('/profile')
        } else {
            res.render('qrScanner.ejs', { error: "Hash text not found in database." });
        }
    } catch (err) {
        console.error('Error executing query', err);
        res.render('qrScanner.ejs', { user: null, error: "An error occurred. Please try again later." });
    }
});


app.get('/profile', (req, res) => {
    const user = req.session.user || null;
    res.render('profile.ejs', { user });
});

app.post('/check-in', async (req, res) => {
    const currentDay = getCurrentDay();
    const { hashText } = req.body;

    try {
        const client = await pool.connect();
        const result = await client.query(`UPDATE cc_reg SET day${currentDay}_checkin = NOW() WHERE hash_mail = $1`, [hashText]);
        client.release();

        res.redirect('/ccqr2024');
    } catch (err) {
        console.error('Error checking in:', err);
        res.status(500).send('Failed to check in. Please try again later.');
    }
});

app.get('/admin-panel_cc', async (req, res) => {
    try {
        const currentDay = getCurrentDay();

        const day1Result = await pool.query(`SELECT COUNT(*) FROM cc_reg WHERE day1_checkin IS NOT NULL`);
        const day1Count = parseInt(day1Result.rows[0].count);

        const day2Result = await pool.query(`SELECT COUNT(*) FROM cc_reg WHERE day2_checkin IS NOT NULL`);
        const day2Count = parseInt(day2Result.rows[0].count);

        const day3Result = await pool.query(`SELECT COUNT(*) FROM cc_reg WHERE day3_checkin IS NOT NULL`);
        const day3Count = parseInt(day3Result.rows[0].count);

        const recipientsResult = await pool.query('SELECT * FROM cc_reg');
        const recipients = recipientsResult.rows;

        res.render('admin-panel.ejs', { currentDay, day1Count, day2Count, day3Count, recipients, error: null });
    } catch (err) {
        console.error('Error executing query', err);
        res.render('admin-panel.ejs', { currentDay: null, day1Count: null, day2Count: null, day3Count: null, recipients: null, error: 'An error occurred. Please try again later.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});