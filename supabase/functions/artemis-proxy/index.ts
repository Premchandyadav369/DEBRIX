const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Scrape latest Artemis II blog updates from NASA RSS/blog
const NASA_BLOG_URL = "https://www.nasa.gov/feeds/iotd-feed/";
const NASA_ARTEMIS_BLOG = "https://blogs.nasa.gov/artemis/feed/";

interface MissionUpdate {
  title: string;
  link: string;
  date: string;
  excerpt: string;
}

async function fetchNASABlogUpdates(): Promise<MissionUpdate[]> {
  const updates: MissionUpdate[] = [];

  // Try the Artemis mission blog feed first
  try {
    const res = await fetch("https://blogs.nasa.gov/artemis/feed/", {
      headers: { "User-Agent": "Debrix-Space-Tracker/1.0" },
    });
    if (res.ok) {
      const text = await res.text();
      // Simple XML parsing for RSS items
      const items = text.split("<item>").slice(1, 6);
      for (const item of items) {
        const title = item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] || 
                      item.match(/<title>(.*?)<\/title>/)?.[1] || "";
        const link = item.match(/<link>(.*?)<\/link>/)?.[1] || "";
        const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
        const desc = item.match(/<description><!\[CDATA\[(.*?)\]\]>/)?.[1] || 
                     item.match(/<description>(.*?)<\/description>/)?.[1] || "";
        // Strip HTML from description
        const excerpt = desc.replace(/<[^>]*>/g, "").trim().slice(0, 200);
        if (title) {
          updates.push({ title, link, date: pubDate, excerpt });
        }
      }
    }
  } catch (e) {
    console.error("Failed to fetch Artemis blog:", e);
  }

  // Fallback: NASA general mission blog
  if (updates.length === 0) {
    try {
      const res = await fetch("https://www.nasa.gov/feeds/iotd-feed/", {
        headers: { "User-Agent": "Debrix-Space-Tracker/1.0" },
      });
      if (res.ok) {
        const text = await res.text();
        const items = text.split("<item>").slice(1, 4);
        for (const item of items) {
          const title = item.match(/<title>(.*?)<\/title>/)?.[1] || "";
          const link = item.match(/<link>(.*?)<\/link>/)?.[1] || "";
          const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
          if (title.toLowerCase().includes("artemis")) {
            updates.push({ title, link, date: pubDate, excerpt: "" });
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch NASA feed:", e);
    }
  }

  return updates;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const updates = await fetchNASABlogUpdates();

    // Real mission constants computed from actual launch
    const LAUNCH_UTC = new Date("2026-04-01T22:35:00Z");
    const TLI_UTC = new Date("2026-04-02T23:49:00Z");
    const now = new Date();
    const missionElapsedMs = now.getTime() - LAUNCH_UTC.getTime();
    const missionElapsedHours = missionElapsedMs / 3600000;

    // Approximate Orion position based on real trajectory phases
    // Phase 1: Earth orbit (0-25h) - orbiting at ~200km altitude
    // Phase 2: TLI + outbound (25h-96h) - accelerating toward Moon
    // Phase 3: Lunar flyby (96h-120h) - closest approach ~8,900km
    // Phase 4: Return (120h-216h) - coasting back
    // Phase 5: Re-entry (216h-240h) - final approach + splashdown

    let phase = "pre-launch";
    let distanceFromEarthKm = 0;
    let distanceFromMoonKm = 384400; // avg Earth-Moon distance
    let velocityKmh = 0;
    let phaseDescription = "";
    let phaseProgress = 0;

    const TOTAL_MISSION_HOURS = 240;
    const MOON_DIST = 384400;

    if (missionElapsedHours < 0) {
      phase = "pre-launch";
      phaseDescription = "Awaiting launch from LC-39B";
    } else if (missionElapsedHours < 25) {
      // Earth orbit phase
      phase = "earth-orbit";
      phaseDescription = "Orbiting Earth — systems checkout";
      distanceFromEarthKm = 200 + Math.sin(missionElapsedHours * 0.5) * 50;
      distanceFromMoonKm = MOON_DIST;
      velocityKmh = 27800;
      phaseProgress = (missionElapsedHours / 25) * 100;
    } else if (missionElapsedHours < 96) {
      // Outbound transit
      phase = "outbound-transit";
      phaseDescription = "Trans-lunar coast — heading to the Moon";
      const transitProgress = (missionElapsedHours - 25) / (96 - 25);
      // Non-linear: starts fast, slows down as it approaches Moon
      const easedProgress = 1 - Math.pow(1 - transitProgress, 1.8);
      distanceFromEarthKm = 200 + easedProgress * (MOON_DIST - 8900);
      distanceFromMoonKm = MOON_DIST - distanceFromEarthKm;
      // Velocity decreases as it moves away from Earth
      velocityKmh = 39000 - transitProgress * 35000 + 1000;
      phaseProgress = transitProgress * 100;
    } else if (missionElapsedHours < 120) {
      // Lunar flyby
      phase = "lunar-flyby";
      phaseDescription = "Lunar flyby — closest approach to the Moon";
      const flybyProgress = (missionElapsedHours - 96) / (120 - 96);
      // Goes past moon, closest at midpoint
      const closestApproach = 8900;
      const distFromMoon = closestApproach + Math.abs(flybyProgress - 0.5) * 2 * 50000;
      distanceFromMoonKm = distFromMoon;
      distanceFromEarthKm = MOON_DIST - distFromMoon + closestApproach;
      velocityKmh = 5000 + Math.abs(flybyProgress - 0.5) * 8000;
      phaseProgress = flybyProgress * 100;
    } else if (missionElapsedHours < 216) {
      // Return transit
      phase = "return-transit";
      phaseDescription = "Return coast — heading back to Earth";
      const returnProgress = (missionElapsedHours - 120) / (216 - 120);
      const easedReturn = Math.pow(returnProgress, 1.8);
      distanceFromEarthKm = (MOON_DIST - 8900) * (1 - easedReturn) + 200;
      distanceFromMoonKm = MOON_DIST - distanceFromEarthKm;
      velocityKmh = 3000 + easedReturn * 37000;
      phaseProgress = returnProgress * 100;
    } else if (missionElapsedHours < TOTAL_MISSION_HOURS) {
      // Re-entry
      phase = "reentry";
      phaseDescription = "Re-entry and splashdown approach";
      const reentryProgress = (missionElapsedHours - 216) / (TOTAL_MISSION_HOURS - 216);
      distanceFromEarthKm = 200 * (1 - reentryProgress);
      distanceFromMoonKm = MOON_DIST;
      velocityKmh = 40000 * (1 - reentryProgress * 0.8);
      phaseProgress = reentryProgress * 100;
    } else {
      phase = "complete";
      phaseDescription = "Mission complete — crew safely recovered";
      distanceFromEarthKm = 0;
      distanceFromMoonKm = MOON_DIST;
      velocityKmh = 0;
      phaseProgress = 100;
    }

    const responseData = {
      mission: {
        name: "Artemis II",
        status: phase === "complete" ? "COMPLETE" : "ACTIVE",
        launchTime: LAUNCH_UTC.toISOString(),
        tliTime: TLI_UTC.toISOString(),
        missionElapsedSeconds: Math.floor(missionElapsedMs / 1000),
        missionElapsedHours: Math.round(missionElapsedHours * 10) / 10,
        totalMissionHours: TOTAL_MISSION_HOURS,
        overallProgress: Math.min(100, Math.round((missionElapsedHours / TOTAL_MISSION_HOURS) * 1000) / 10),
      },
      telemetry: {
        phase,
        phaseDescription,
        phaseProgress: Math.round(phaseProgress * 10) / 10,
        distanceFromEarthKm: Math.round(distanceFromEarthKm),
        distanceFromMoonKm: Math.round(distanceFromMoonKm),
        velocityKmh: Math.round(velocityKmh),
        velocityMach: Math.round((velocityKmh / 1235) * 10) / 10,
      },
      crew: [
        { name: "Reid Wiseman", role: "Commander", agency: "NASA", nation: "US" },
        { name: "Victor Glover", role: "Pilot", agency: "NASA", nation: "US" },
        { name: "Christina Koch", role: "Mission Specialist 1", agency: "NASA", nation: "US" },
        { name: "Jeremy Hansen", role: "Mission Specialist 2", agency: "CSA", nation: "CA" },
      ],
      updates: updates.slice(0, 3),
      links: {
        arow: "https://www.nasa.gov/trackartemis",
        nasaLive: "https://www.youtube.com/nasa",
        blog: "https://blogs.nasa.gov/artemis/",
      },
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
