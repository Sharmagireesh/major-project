const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Listing = require("../models/listing");

const router = express.Router();

const DESTINATION_PLACES = {
    manali: [
        "Hadimba Devi Temple", "Solang Valley", "Rohtang Pass", "Atal Tunnel",
        "Old Manali", "Mall Road Manali", "Manu Temple", "Vashisht Hot Springs",
        "Jogini Waterfall", "Naggar Castle", "Jana Waterfall", "Hampta Valley",
        "Nehru Kund", "Himalayan Nyingmapa Monastery", "Van Vihar National Park",
    ],
    shimla: [
        "The Ridge", "Mall Road Shimla", "Jakhoo Temple", "Kufri",
        "Christ Church", "Indian Institute of Advanced Study", "Chadwick Falls",
        "Annandale", "Tara Devi Temple", "Summer Hill",
        "Scandal Point", "Lakkar Bazaar", "Himalayan Bird Park",
        "Green Valley", "Naldehra",
    ],
    solan: [
        "Mohan Shakti National Heritage Park", "Shoolini Mata Temple", "Karol Tibba",
        "Kasauli Mall Road", "Sunset Point Kasauli", "Gilbert Trail",
        "Christ Church Kasauli", "Manki Point", "Dagshai Jail Museum",
        "Jatoli Shiv Temple", "Bon Monastery", "Barog Tunnel",
        "Chail Palace", "Sadhupul", "Menri Monastery Dolanji",
    ],
    dharamshala: [
        "McLeod Ganj", "Bhagsu Waterfall", "Namgyal Monastery", "Tsuglagkhang Complex",
        "Dal Lake Dharamshala", "HPCA Stadium", "Naddi View Point", "Triund Trek",
        "St. John in the Wilderness Church", "Norbulingka Institute",
        "Kangra Art Museum", "Tea Gardens Dharamshala", "Gyuto Monastery",
        "Dharamkot", "Aghanjar Mahadev Temple",
    ],
    kullu: [
        "Great Himalayan National Park", "Raghunath Temple", "Bijli Mahadev Temple",
        "Tirthan Valley", "Kasol", "Manikaran Sahib", "Naggar",
        "Jana Village", "Parvati Valley", "Shoja",
        "Jalori Pass", "Kais Wildlife Sanctuary", "Basheshwar Mahadev Temple",
        "Sultanpur Palace", "Friendship Peak Viewpoint",
    ],
    mandi: [
        "Rewalsar Lake", "Prashar Lake", "Bhootnath Temple", "Triloknath Temple Mandi",
        "Pandoh Dam", "Barot Valley", "Kamrunag Lake", "Shikari Devi Temple",
        "Kamlah Fort", "Sundernagar Lake", "Parashar Rishi Temple",
        "Janjheli", "Dehnasar Lake", "Seri Manch", "Bhima Kali Temple Bhiuli",
    ],
    hamirpur: [
        "Tauni Devi Temple", "Awah Devi Temple", "Deotsidh Temple",
        "Sujanpur Tira Fort", "Narvadeshwar Temple", "Nadaun",
        "Gasota Mahadev Temple", "Barsar", "Jahu Temple",
        "Kaleshwar Mahadev Temple", "Gauri Shankar Temple Nadaun",
        "Lambloo", "Pung Khad", "Bamson", "Kanjyan Tourism Park",
    ],
    bilaspur: [
        "Gobind Sagar Lake", "Bhakra Dam Viewpoint", "Naina Devi Temple",
        "Vyas Cave", "Bahadurpur Fort", "Kandrour Bridge", "Rukmani Kund",
        "Swarghat", "Laxmi Narayan Temple Bilaspur", "Bandla Hills",
        "Markandeya Temple", "Kol Dam Viewpoint", "Haridham",
        "Deoli Fish Farm", "Gobind Sagar Water Sports",
    ],
    una: [
        "Chintpurni Temple", "Dera Baba Bharbhag Singh", "Pong Dam Lake",
        "Dhyunsar Mahadev Temple", "Kila Baba Bedi Ji", "Kutlehar Fort Ruins",
        "Gagret", "Amb", "Behdala", "Bangana Hills",
        "Dholwah Waterfall", "Sheetla Devi Temple", "Suhin Top",
        "Bharwain", "Una City Park",
    ],
    sirmaur: [
        "Renuka Lake", "Churdhar Peak", "Haripurdhar", "Nahan",
        "Rani Tal", "Suketi Fossil Park", "Jaitak Fort", "Trilokpur Temple",
        "Paonta Sahib", "Habban Valley", "Rajgarh Valley", "Dhaula Kuan",
        "Simbalbara National Park", "Jamta Hills", "Shivalik Fossil Park",
    ],
    kinnaur: [
        "Kalpa", "Sangla Valley", "Chitkul", "Reckong Peo", "Nako Lake",
        "Kinnaur Kailash Viewpoint", "Roghi Village", "Kamru Fort",
        "Ribba Village", "Pooh", "Charang Village", "Lippa",
        "Rarang Monastery", "Moorang Fort", "Baspa River Bank",
    ],
    chamba: [
        "Khajjiar", "Chamera Lake", "Bhuri Singh Museum",
        "Laxmi Narayan Temple Chamba", "Chamunda Devi Temple Chamba",
        "Kalatop Wildlife Sanctuary", "Dalhousie", "Dainkund Peak",
        "Panchpula", "Sach Pass", "Manimahesh Lake",
        "Bhalei Mata Temple", "Rang Mahal", "Akhand Chandi Palace",
        "Surara Bhatori",
    ],
    kangra: [
        "Kangra Fort", "Brajeshwari Devi Temple", "Masroor Rock Cut Temples",
        "Kareri Lake", "Palampur Tea Gardens", "Bir Billing",
        "Andretta Artists Village", "Tashi Jong Monastery", "Baijnath Temple",
        "Pong Lake", "Nagarkot Viewpoint", "Pragpur Heritage Village",
        "Jwalamukhi Temple", "Chamunda Devi Temple Kangra", "Gopalpur Zoo",
    ],
    lahaulspiti: [
        "Key Monastery", "Kibber Village", "Chandratal Lake", "Kaza",
        "Tabo Monastery", "Dhankar Monastery", "Pin Valley National Park",
        "Kunzum Pass", "Langza", "Hikkim",
        "Komic", "Gue Mummy Monastery", "Sissu",
        "Trilokinath Temple Udaipur", "Suraj Tal",
    ],
};

const DESTINATION_ALIASES = {
    manali: ["manali", "amnali"],
    shimla: ["shimla"],
    solan: ["solan"],
    dharamshala: ["dharamshala", "dharamshalaa", "dharamshalla"],
    kullu: ["kullu", "kulu"],
    mandi: ["mandi"],
    hamirpur: ["hamirpur"],
    bilaspur: ["bilaspur"],
    una: ["una"],
    sirmaur: ["sirmaur", "sirmour"],
    kinnaur: ["kinnaur"],
    chamba: ["chamba"],
    kangra: ["kangra"],
    lahaulspiti: ["lahaul spiti", "lahaulspiti", "spiti", "lahaul"],
};

function normalizeQuery(query) {
    return String(query || "").toLowerCase().replace(/[^a-z\s]/g, "").trim();
}

function getPlacesForQuery(query) {
    const normalized = normalizeQuery(query);
    for (const [key, aliases] of Object.entries(DESTINATION_ALIASES)) {
        if (aliases.some((alias) => normalized.includes(alias))) {
            return DESTINATION_PLACES[key];
        }
    }
    return [];
}

function buildFallbackPlan({ query, budget, days, properties }) {
    const safeDays = Math.max(1, Number(days) || 1);
    const perDayBudget = Math.max(1000, Math.floor((Number(budget) || 0) / safeDays));
    const places = getPlacesForQuery(query);
    const fallbackStay = properties[0]
        ? {
            _id: properties[0]._id,
            name: properties[0].title,
            price: properties[0].price,
        }
        : {
            _id: null,
            name: `${query} Local Homestay`,
            price: Math.min(perDayBudget, 2500),
        };

    const itinerary = [];
    for (let day = 1; day <= safeDays; day++) {
        const start = ((day - 1) * 3) % (places.length || 1);
        const activityPlaces = places.length
            ? [places[start], places[(start + 1) % places.length], places[(start + 2) % places.length]]
            : ["Local sightseeing", "Try Himachali food", "Evening market walk"];

        itinerary.push({
            day,
            title: day === 1 ? `Arrival and Explore ${query}` : `Day ${day} Highlights`,
            activities: activityPlaces,
            staySuggestion: fallbackStay,
        });
    }

    return {
        itinerary,
        totalCost: Math.min(Number(budget) || 0, safeDays * (fallbackStay.price || perDayBudget)),
        tips: [
            "Start early to avoid traffic in hills.",
            "Carry warm clothes for evening weather.",
            "Keep local cash for small shops.",
        ],
        source: "fallback",
    };
}

router.post("/plan", async (req, res) => {
    try {
        const { query, budget, days } = req.body;

        if (!query || !budget || !days) {
            return res.status(400).json({ error: "query, budget, and days are required" });
        }

        const properties = await Listing.find({
            location: { $regex: query, $options: "i" },
        }).select("_id title price location country description image");

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: "GEMINI_API_KEY is missing" });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const modelNames = ["gemini-1.5-flash-latest", "gemini-1.5-flash", "gemini-2.0-flash"];

        const prompt = `You are Himachal travel expert. User wants ${days} day trip to ${query} with budget Rs${budget}.
Available homestays: ${JSON.stringify(properties)}.
Return JSON: {itinerary: [{day:1, title:'', activities:[], staySuggestion: {_id, name, price}}], totalCost: number, tips: []}
Only return valid JSON, no markdown.`;

        let result;
        let lastError;
        for (const modelName of modelNames) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                result = await model.generateContent(prompt);
                break;
            } catch (e) {
                lastError = e;
            }
        }
        if (!result) {
            throw lastError || new Error("No compatible Gemini model available");
        }
        const text = result.response.text().trim();

        // Gemini may wrap JSON in markdown fences. Strip them first.
        const cleaned = text.replace(/```json|```/gi, "").trim();
        const jsonStart = cleaned.indexOf("{");
        const jsonEnd = cleaned.lastIndexOf("}");
        const jsonText = jsonStart !== -1 && jsonEnd !== -1
            ? cleaned.slice(jsonStart, jsonEnd + 1)
            : cleaned;

        const parsed = JSON.parse(jsonText);
        return res.json(parsed);
    } catch (err) {
        console.error("AI planner error:", err);
        const details = err && err.message ? err.message : "Unknown error";
        const lowerDetails = details.toLowerCase();
        const isQuotaOrRateLimit = details.includes("429") || lowerDetails.includes("quota");
        const isInvalidKey = lowerDetails.includes("api_key_invalid")
            || lowerDetails.includes("api key expired")
            || lowerDetails.includes("invalid api key");

        if (isQuotaOrRateLimit || isInvalidKey) {
            const { query, budget, days } = req.body;
            const properties = await Listing.find({
                location: { $regex: query || "", $options: "i" },
            }).select("_id title price");
            const fallback = buildFallbackPlan({ query, budget, days, properties });
            return res.json(fallback);
        }

        return res.status(500).json({
            error: "Failed to generate AI trip plan",
            details,
        });
    }
});

module.exports = router;
