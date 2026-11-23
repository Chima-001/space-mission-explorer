// Converts one raw Launch Library 2 launch into the flat mission model used
// everywhere else. Anything from the optional `mission` object may be missing.
export function toMission(launch) {
  const mission = launch.mission ?? null;
  const agency = mission?.agencies?.[0] ?? null;
  return {
    id: String(launch.id),
    name: launch.name ?? "Unnamed launch",
    date: launch.net ?? null,
    status: launch.status?.name ?? "Unknown",
    failReason: launch.failreason || "",
    description:
      mission?.description ||
      "No description is available for this mission yet.",
    missionType: mission?.type ?? "Not specified",
    orbit: mission?.orbit?.name ?? "Not specified",
    rocket: launch.rocket?.configuration?.full_name ?? "Unknown rocket",
    provider: launch.launch_service_provider?.name ?? "Unknown provider",
    pad: launch.pad?.name ?? "Unknown pad",
    location: launch.pad?.location?.name ?? "Unknown location",
    imageUrl: typeof launch.image === "string" ? launch.image : "",
    webcast: Boolean(launch.webcast_live),
    sourceUrl: agency?.info_url || agency?.wiki_url || "",
  };
}

// Status is always shown as text; this only picks the accent colour.
export function statusTone(status = "") {
  if (/success/i.test(status)) return "ok";
  if (/fail/i.test(status)) return "bad";
  if (/hold/i.test(status)) return "hold";
  return "go";
}

// Planet artwork used when a launch has no photo. Same id, same planet.
const WORLDS = ["earth", "moon", "mars", "venus", "jupiter", "nebula"];

export function worldFor(id = "") {
  let sum = 0;
  for (const char of String(id)) sum += char.charCodeAt(0);
  return WORLDS[sum % WORLDS.length];
}
