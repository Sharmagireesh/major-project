const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Listing = require("../models/listing");

const router = express.Router();

function buildFallbackPlan({ query, budget, days, properties }) {
    const safeDays = Math.max(1, Number(days) || 1);
    const perDayBudget = Math.max(1000, Math.floor((Number(budget) || 0) / safeDays));
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
        itinerary.push({
            day,
            title: day === 1 ? `Arrival and Explore ${query}` : `Day ${day} Highlights`,
            activities: [
                "Local sightseeing",
                "Try Himachali food",
                "Evening market walk",
            ],
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
