import React, { useState } from "react";

export default function AITripPlanner() {
  const [query, setQuery] = useState("");
  const [days, setDays] = useState(2);
  const [budget, setBudget] = useState(5000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setPlan(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query,
          budget: Number(budget),
          days: Number(days),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setPlan(data);
    } catch (err) {
      setError(err.message || "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">AI Trip Planner</h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl shadow">
        <input
          className="border rounded-lg p-2 md:col-span-2"
          placeholder="Destination (e.g. Manali)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          required
        />
        <input
          type="number"
          min="1"
          className="border rounded-lg p-2"
          placeholder="Days"
          value={days}
          onChange={(e) => setDays(e.target.value)}
          required
        />
        <input
          type="number"
          min="1000"
          className="border rounded-lg p-2"
          placeholder="Budget"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="md:col-span-4 bg-blue-600 text-white rounded-lg p-2 hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Generating..." : "Generate Plan"}
        </button>
      </form>

      {error && <p className="text-red-600 mt-3">{error}</p>}

      {plan && (
        <div className="mt-6 space-y-4">
          <div className="bg-green-50 p-3 rounded-lg border">
            <p className="font-semibold">Estimated Total Cost: Rs{plan.totalCost}</p>
          </div>

          {Array.isArray(plan.itinerary) &&
            plan.itinerary.map((dayPlan, idx) => (
              <div key={idx} className="border rounded-xl p-4 bg-white shadow-sm">
                <h3 className="text-lg font-bold mb-2">
                  Day {dayPlan.day}: {dayPlan.title}
                </h3>
                <ul className="list-disc pl-5 space-y-1">
                  {(dayPlan.activities || []).map((act, i) => (
                    <li key={i}>{act}</li>
                  ))}
                </ul>

                {dayPlan.staySuggestion && (
                  <div className="mt-3 p-3 border rounded-lg bg-gray-50">
                    <p className="font-semibold">{dayPlan.staySuggestion.name}</p>
                    <p className="text-sm text-gray-600">Price: Rs{dayPlan.staySuggestion.price}</p>
                    <a
                      href={`/listings/${dayPlan.staySuggestion._id}`}
                      className="inline-block mt-2 bg-orange-500 text-white px-3 py-1 rounded-md text-sm"
                    >
                      Book Now
                    </a>
                  </div>
                )}
              </div>
            ))}

          {Array.isArray(plan.tips) && plan.tips.length > 0 && (
            <div className="border rounded-xl p-4 bg-white shadow-sm">
              <h4 className="font-bold mb-2">Tips</h4>
              <ul className="list-disc pl-5 space-y-1">
                {plan.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
