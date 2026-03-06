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

// Allowed origins for CORS (both development and production)
const devAddress = 'http://localhost:4200';
const prodAddress = 'https://miketam76.github.io';

// CORS configuration to allow requests only from the Angular app's origin
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

// Apply CORS middleware
app.use(cors(corsOptions)); // Allows your Angular app on :4200 to talk to this API
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} request to ${req.url} from ${req.ip}`);
    next();
});
app.use(express.json());

let db;

// 1. Connect to MongoDB once
const client = new MongoClient(process.env.MONGODB_URI);

// Function to connect to MongoDB and start the server
async function connectDB() {
    try {
        await client.connect();
        db = client.db(process.env.DB_NAME);
        console.log(`🌲 Connected to database ${db.databaseName}`);
        
        // Start the server only after the DB is connected
        app.listen(port, () => {  
            console.log(`🚀 API is running!`);
        });
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1);
    }
}

// --- TEST ROUTE ---
app.get('/api/test', (req, res) => {
    console.log('Received request to /api/test');
    res.json({ message: 'The forest is alive! API is connected.' });
});

// --- ROOT ROUTE --- Will show a simple welcome message and guide users to the API endpoints. This is helpful for anyone who might accidentally navigate to the root URL in a browser.
app.get('/', (req, res) => {
    console.log('Received request to /');
    res.send('<h1>🌲 Welcome to the Forest Blog API</h1><p>Navigate to <code>/api/projects</code> or <code>/api/blogs</code> to see content.</p>');
});

// --- PROJECTS ROUTE (Read-Only) ---
app.get('/api/projects', async (req, res) => {
    console.log('Received request to /api/projects');
    try {
        // Use MongoDB's built‑in _id for ordering rather than a separate `id` field.
        // ObjectIds are roughly increasing over time, so sorting descending gives
        // newest documents first.
        const projects = await db.collection('projects').find({}).sort({ _id: -1 }).toArray();
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
        // Use MongoDB's built‑in _id for ordering rather than a separate `id` field.
        // ObjectIds are roughly increasing over time, so sorting descending gives
        // newest documents first.
        const blogs = await db.collection('blogs').find({}).sort({ _id: -1 }).toArray();
        return res.status(200).json(blogs);
    } catch (err) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Start the server and connect to MongoDB
connectDB();

// Close the MongoDB connection if the Node process is terminated
process.on('SIGINT', async () => {
    await client.close();
    console.log('🛑 MongoDB connection closed. Server shutting down.');
    process.exit(0);
});