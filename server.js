/*
    Forest Blog API
    Description: A simple Express.js API to serve project and blog data from MongoDB for the Forest Blog Angular app.
*/
const express = require('express');
const { MongoClient, HostAddress } = require('mongodb');
const cors = require('cors');
const os = require('os');
require('dotenv').config();

console.log('DEBUG: URI is', process.env.MONGODB_URI ? 'Defined' : 'UNDEFINED');

const app = express();
const port = process.env.PORT || 5050;

const devAddress = 'http://localhost:4200';
const prodAddress = 'https://miketam76.github.io';

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like direct browser entry or Postman)
        if (!origin) return callback(null, true);
        if ([devAddress, prodAddress].indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Unauthorized Access'));
        }
    },
    optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions)); // Allows your Angular app on :4200 to talk to this API
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} request to ${req.url} from ${req.ip}`);
    next();
});
app.use(express.json());

let db;

// 1. Connect to MongoDB once
const client = new MongoClient(process.env.MONGODB_URI);

function getHostIP() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // skip internal (i.e. 127.0.0.1) and non‑IPv4
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

async function connectDB() {
    try {
        await client.connect();
        db = client.db(process.env.DB_NAME);
        console.log(`🌲 Connected to database ${db.databaseName}`);
        
        // Start the server only after the DB is connected
        app.listen(port, () => {  
            console.log(`🚀 API is running on ${getHostIP()}:${port}`);
        });
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1);
    }
}

// 2. Sample Route to test connection
app.get('/api/test', (req, res) => {
    console.log('Received request to /api/test');
    res.json({ message: 'The forest is alive! API is connected.' });
});

// --- PROJECTS ROUTE (Read-Only) ---
app.get('/api/projects', async (req, res) => {
    console.log('Received request to /api/projects');
    try {
        // .sort({ id: -1 }) sorts the "id" field 5, 4, 3...
        const projects = await db.collection('projects').find({}).sort({ id: -1 }).toArray();
        return res.status(200).json(projects);
    } catch (err) {
        console.error("Fetch Error:", err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- BLOGS ROUTE (Read-Only) ---
app.get('/api/blogs', async (req, res) => {
    console.log('Received request to /api/blogs');
    try {
        const blogs = await db.collection('blogs').find({}).sort({ id: -1 }).toArray();
        return res.status(200).json(blogs);
    } catch (err) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

connectDB();

// Close the MongoDB connection if the Node process is terminated
process.on('SIGINT', async () => {
    await client.close();
    console.log('🛑 MongoDB connection closed. Server shutting down.');
    process.exit(0);
});