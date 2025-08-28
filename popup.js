document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("summarize").addEventListener("click", () => {
    const resultDiv = document.getElementById("result");
    const summaryType = document.getElementById("summary-type").value;

    // Show loader
    resultDiv.innerHTML = '<div class="loader"></div>';

    // 1. Get API key
    chrome.storage.sync.get(["geminiApiKey"], ({ geminiApiKey }) => {
      if (!geminiApiKey) {
        resultDiv.textContent = "❌ No API key set in options.";
        return;
      }

      // 2. Get active tab
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (!tab) {
          resultDiv.textContent = "❌ No active tab found.";
          return;
        }
        chrome.tabs.sendMessage(
        tab.id,
        { type: "GET_ARTICLE_TEXT" },
        async (response) => {
            if (!response || !response.text) {
            resultDiv.textContent = "❌ Couldn't extract text from this page.";
            return;
            }

            try {
            const summary = await getGeminiSummary(
                response.text,
                summaryType,
                geminiApiKey
            );
            resultDiv.textContent = summary;
            } catch (error) {
            resultDiv.textContent = "⚠️ Gemini Error: " + error.message;
            }
        }
        );
      });
    });
  });
});

// --- Gemini API Caller ---
async function getGeminiSummary(text, summaryType, apiKey) {
  const maxLength = 20000;
  const truncatedText =
    text.length > maxLength ? text.substring(0, maxLength) + "..." : text;

  let prompt;
  switch (summaryType) {
    case "brief":
      prompt = `Provide a brief summary of the following article in 2-3 sentences:\n\n${truncatedText}`;
      break;
    case "detailed":
      prompt = `Provide a detailed summary of the following article, covering all main points and key details:\n\n${truncatedText}`;
      break;
    case "bullets":
      prompt = `Summarize the following article in 5-7 key points. Format each point as a line starting with "- ".\n\n${truncatedText}`;
      break;
    default:
      prompt = `Summarize the following article:\n\n${truncatedText}`;
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2 },
        }),
      }
    );

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error?.message || "API request failed");
    }

    const data = await res.json();
    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No summary available."
    );
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate summary. Please try again later.");
  }
}
