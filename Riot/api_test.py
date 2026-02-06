import os
import requests
from dotenv import load_dotenv
from urllib.parse import quote  # für URL-Encoding

# .env laden
load_dotenv()
API_KEY = os.getenv("RIOT_API_KEY")
if not API_KEY:
    raise RuntimeError("RIOT_API_KEY fehlt in .env")

HEADERS = {"X-Riot-Token": API_KEY}

# 1️⃣ Riot-ID in Summoner Name auflösen
riot_game_name = "Blood Oranges"
riot_tag_line = "Top"

# URL encode für Leerzeichen und Sonderzeichen (#)
encoded_name = quote(riot_game_name)
encoded_tag = quote(riot_tag_line)

# Endpoint für Summoner-Info (EUW)
summoner_url = f"https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/{encoded_name}"

response = requests.get(summoner_url, headers=HEADERS)

if response.status_code != 200:
    raise RuntimeError(f"Summoner nicht gefunden: {response.status_code} - {response.text}")

summoner_data = response.json()
summoner_id = summoner_data["id"]
summoner_name = summoner_data["name"]

print(f"✅ Summoner gefunden: {summoner_name}")

# 2️⃣ Ranked Stats abrufen
ranked_url = f"https://euw1.api.riotgames.com/lol/league/v4/entries/by-summoner/{summoner_id}"
response = requests.get(ranked_url, headers=HEADERS)

if response.status_code != 200:
    raise RuntimeError(f"Ranked Stats nicht abrufbar: {response.status_code} - {response.text}")

ranked_entries = response.json()

# 3️⃣ Solo/Duo Eintrag filtern
solo_entry = next((e for e in ranked_entries if e["queueType"] == "RANKED_SOLO_5x5"), None)

if solo_entry:
    tier = solo_entry["tier"]
    division = solo_entry["rank"]
    lp = solo_entry["leaguePoints"]
    wins = solo_entry["wins"]
    losses = solo_entry["losses"]
    print(f"Solo/Duo: {tier} {division}, {lp} LP ({wins}W/{losses}L)")
else:
    print("Keine Solo/Duo Stats gefunden (unranked)")
