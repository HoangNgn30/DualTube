import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
// GoogleGenAI import removed

dotenv.config();

// No AI client initialization needed

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Scrape YouTube search page directly for fast, up-to-date, non-API search results
async function scrapeYouTubeSearch(query: string) {
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch YouTube search page: ${response.status}`);
    }

    const html = await response.text();

    // Extract ytInitialData object from the html response
    const ytInitialDataMatch = html.match(/ytInitialData\s*=\s*({[\s\S]*?});\s*<\/script>/) || 
                               html.match(/window\["ytInitialData"\]\s*=\s*({[\s\S]*?});/);

    if (!ytInitialDataMatch) {
      console.warn("Could not match ytInitialData in YouTube HTML.");
      return null;
    }

    const ytInitialData = JSON.parse(ytInitialDataMatch[1]);
    
    // Safely traverse ytInitialData to extract video renderers
    // Pathway is generally: ytInitialData.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents
    const sectionList = ytInitialData?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    if (!sectionList || !Array.isArray(sectionList)) {
      console.warn("Empty section list in YouTube data structure");
      return null;
    }

    const results: any[] = [];
    
    for (const section of sectionList) {
      const items = section?.itemSectionRenderer?.contents;
      if (!items || !Array.isArray(items)) continue;

      for (const item of items) {
        const videoRenderer = item?.videoRenderer;
        if (!videoRenderer) continue;

        const videoId = videoRenderer?.videoId;
        const titleText = videoRenderer?.title?.runs?.[0]?.text || videoRenderer?.title?.simpleText;
        const thumbnail = videoRenderer?.thumbnail?.thumbnails?.[0]?.url;
        const channelName = videoRenderer?.ownerText?.runs?.[0]?.text || videoRenderer?.shortBylineText?.runs?.[0]?.text;
        const duration = videoRenderer?.lengthText?.simpleText || "";
        const viewCount = videoRenderer?.viewCountText?.simpleText || "";
        const publishedTime = videoRenderer?.publishedTimeText?.simpleText || "";

        if (videoId && titleText) {
          results.push({
            videoId,
            title: titleText,
            thumbnail: thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            channelName: channelName || "YouTube",
            duration,
            viewCount,
            publishedTime,
          });
        }

        // Limit to 100 solid results for a nice group pool
        if (results.length >= 100) break;
      }
      if (results.length >= 100) break;
    }

    return results.length > 0 ? results : null;
  } catch (error) {
    console.error("Error scraping YouTube search:", error);
    return null;
  }
}

// searchYouTubeViaGemini fallback removed

// API endpoint for searching YouTube videos
app.get("/api/search", async (req, res) => {
  const query = req.query.q as string;
  if (!query) {
    return res.status(400).json({ error: "Missing search query parameter 'q'" });
  }

  // 1. Try direct YouTube scraping (best quality, direct real-time videos, very fast)
  let results = await scrapeYouTubeSearch(query);

  // Fallback to empty array if scraping returned nothing or failed
  if (!results) {
    results = [];
  }

  return res.json({ results });
});

// API endpoint for YouTube Autocomplete Suggestions
app.get("/api/suggest", async (req, res) => {
  const query = req.query.q as string;
  if (!query) {
    return res.json({ suggestions: [] });
  }

  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
      },
    });

    if (!response.ok) {
      return res.json({ suggestions: [] });
    }

    const data = await response.json();
    // Google autocomplete format: [query, [suggest1, suggest2, ...]]
    const suggestions = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];
    return res.json({ suggestions });
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return res.json({ suggestions: [] });
  }
});

// Configure Vite middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;

if (!process.env.NETLIFY && !process.env.LAMBDA_TASK_ROOT) {
  startServer();
}
