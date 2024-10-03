const express = require('express');
const { MongoClient } = require("mongodb");
//const cors = require('cors');
//const dotenv = require('dotenv').config(); // Load environment variables from .env file

const app = express();
const port = process.env.PORT || 8080; // Use dynamic port or default to 8000

const uri = "mongodb+srv://AHWS_admin:dryWeatherRock@weatherapp.yrthi.mongodb.net/?retryWrites=true&w=majority&appName=WeatherApp";
const client = new MongoClient(uri);

// Function to connect to MongoDB
async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1); // Exit the process if unable to connect to MongoDB
    }
}

// Function to fetch weather data from MongoDB 
async function getWeatherData() {
    try {
        const query = {};
        const options = { sort: { time: -1 } }; // Sort by time descending
        const cursor = client.db('weatherDB').collection('weather_data').find(query, options);
        const result = await cursor.toArray();
        cursor.close(); // Close the cursor when done
        return result;
    } catch (error) {
        console.error("Error fetching weather data:", error);
        throw error; // Rethrow the error to be caught by the caller
    }
}

// Function to insert new weather data into MongoDB
async function insertWeatherData(data) {
    try {
        const result = await client.db('weatherDB').collection('weather_data').insertOne(data);
        console.log("Inserted new weather data:", result.insertedId);
        return result.insertedId;
    } catch (error) {
        console.error("Error inserting weather data:", error);
        throw error;
    }
}

// Middleware to parse JSON requests
app.use(express.json());

// app.use(cors({
//     origin: [
//         'https://aggie-home-weather-station.azurewebsites.net',
//         'https://delightful-mud-0e0ccef10.5.azurestaticapps.net',
//         'http://localhost:3000'
//     ],
//     methods: ['GET', 'POST', 'PUT', 'DELETE'],
// }));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Allow all origins
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});
// Middleware to log all incoming requests
app.all('/', function(req, res, next) {
    //console.log({method: req.method, url: req.url});
    next();
});

// Route to get weather data
app.get('/data_get', async (req, res) => {
    try {
        const result = await getWeatherData();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// Route to post new weather data
app.post('/post_data', async (req, res) => {
    try {
        const data = req.body;
        data.time = new Date();
        // Data Bounding
        // Temperature
        
        if (data.temperature > 150 || data.temperature < -50 || typeof data.temperature !== 'number' || isNaN(data.temperature)) {
            return res.status(400).json({ message: "Temperature is out of expected range" });
        }

        // Pressure (e.g., in hPa or mbar)
        if (data.pressure_bar > 1100 || data.pressure_bar < 800 || typeof data.pressure_bar !== 'number' || isNaN(data.pressure_bar)) {
            return res.status(400).json({ message: "Pressure is out of expected range " + data.pressure_bar });
        }

        // Wind Speed (e.g., in meters per second)
        if (data.wind_speed_mph > 150 || data.wind_speed_mph < 0 || typeof data.wind_speed_mph !== 'number' || isNaN(data.wind_speed_mph)) {
            return res.status(400).json({ message: "Wind Speed is out of expected range " + data.wind_speed_mph});
        }

        // Light (e.g., in lux)
        if (data.light > 100000 || data.light < 0 || typeof data.light !== 'number' || isNaN(data.light)) {
            return res.status(400).json({ message: "Light level is out of expected range" });
        }

        // Soil Moisture (percentage)
        if (data.soil_moisture > 100 || data.soil_moisture < 0 || typeof data.soil_moisture !== 'number' || isNaN(data.soil_moisture)) {
            return res.status(400).json({ message: "Soil Moisture is out of expected range" });
        }

        // Humidity (percentage)
        if (data.humidity > 100 || data.humidity < 0 || typeof data.humidity !== 'number' || isNaN(data.humidity)) {
            return res.status(400).json({ message: "Humidity is out of expected range" });
        }

        // Wind Direction (degrees)
        if (data.wind_direction > 360 || data.wind_direction < 0 || typeof data.wind_direction !== 'number' || isNaN(data.wind_direction)) {
            return res.status(400).json({ message: "Wind Direction is out of expected range" });
        }

        // Precipitation (e.g., in millimeters)
        if (data.precipitation < 0 || typeof data.precipitation !== 'number' || isNaN(data.precipitation)) {
            return res.status(400).json({ message: "Precipitation is out of expected range" });
        }

        
        const result = await insertWeatherData(data);
        res.status(201).json({ message: "Weather data inserted", id: result });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// Function to start the server
async function startServer() {
    await connectToMongoDB();
    app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
}

// Function to close MongoDB connection
async function closeMongoDB() {
    await client.close();
    console.log("MongoDB connection closed");
}

// Start the server and handle errors
startServer().catch(error => {
    console.error("Error starting server:", error);
    process.exit(1); // Exit the process if unable to start the server
});

// Handle SIGINT signal to gracefully close MongoDB connection
process.on('SIGINT', async () => {
    console.log("\nClosing MongoDB connection...");
    await closeMongoDB();
    process.exit();
});

