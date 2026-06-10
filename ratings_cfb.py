"""
CFB draft-game rating engine — "The 15-0 Game".

Pulls CollegeFootballData.com data (2001-2024, the window with reliable
player stats) via the official `cfbd` package, computes era-relative
z-score ratings per position, re-standardizes across seasons, appends a
curated legend pool (pre-2001 greats), and writes players_cfb.json in the
exact schema the shared web engine consumes (same as the NFL players.json).

METHOD (mirrors ratings.py):
  1. Within each (position, season): z-score each input stat against that
     season's qualifiers, combine with fixed weights into a composite.
     Rating vs your own season's peers is what makes eras comparable —
     a 1-SD-above QB in 2003 and one in 2023 land on the same scale.
  2. Re-standardize the composite ACROSS all seasons (prevents clustering).
  3. Map z -> 0-99 rating with the same curve as the NFL game
     (avg starter ~76, +1SD ~85, +2SD ~94, clamp 56-99).
  Conference-strength adjustment is a known future iteration; season-relative
  z-scores absorb most era variance and ship a solid first pass.

API BUDGET (free tier ~1,000 calls/month — be frugal):
  Every response is cached to data/cfbd_cache/<name>_<year>.json on first
  pull and NEVER re-fetched. A full re-run on a warm cache makes ZERO API
  calls. Cold pull: 6 calls/season x 24 seasons ~= 144 calls.
  The API client is only constructed on a cache miss, so cache-only runs
  don't even need CFBD_API_KEY set.

USAGE:
  CFBD_API_KEY=... .venv-cfb/bin/python ratings_cfb.py            # full run
  CFBD_API_KEY=... .venv-cfb/bin/python ratings_cfb.py --probe 2023
      # pull/cache one season and dump available stat categories + types
      # (used to validate field names before trusting the composites)
"""
import json
import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd

from cfb_legends import LEGENDS, legend_records

START, END = 2001, 2025  # 2025 = the completed 2025-26 season (Indiana 15-0).
# Years before ~2004 come back hollow from the API and are skipped at runtime;
# they're covered by the curated 1999-2003 gap entries in cfb_legends.py.
SEASONS = list(range(START, END + 1))
# CFBD_SEASONS="2023" or "2019,2023" limits the run (dev/testing on cache)
if os.environ.get("CFBD_SEASONS"):
    SEASONS = [int(y) for y in os.environ["CFBD_SEASONS"].split(",")]
CACHE_DIR = Path(__file__).parent / "data" / "cfbd_cache"
OUT_PATH = Path(__file__).parent / "players_cfb.json"

# ---- rating curve (identical to the NFL pipeline) ---------------------------

def to_rating(z):
    return int(np.clip(round(76 + 9 * z), 56, 99))

def zscore(arr):
    arr = np.asarray(arr, dtype=float)
    sd = arr.std()
    return (arr - arr.mean()) / sd if sd > 0 else np.zeros_like(arr)

# ---- cached CFBD access ------------------------------------------------------

_api_client = None

def _client():
    """Build the cfbd ApiClient lazily — only on a cache miss."""
    global _api_client
    if _api_client is None:
        import cfbd
        key = os.environ.get("CFBD_API_KEY")
        if not key:
            sys.exit(
                "CFBD_API_KEY is not set and the cache is missing data.\n"
                "Export your free key from collegefootballdata.com first."
            )
        conf = cfbd.Configuration(access_token=key)
        _api_client = cfbd.ApiClient(conf)
    return _api_client

def cached(name, year, fetch):
    """Cache-first fetch: data/cfbd_cache/<name>_<year>.json or API once."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = CACHE_DIR / f"{name}_{year}.json"
    if path.exists():
        return json.loads(path.read_text())
    print(f"  API call: {name} {year}")
    data = fetch()
    # cfbd models -> plain dicts (camelCase keys, like the raw REST API)
    plain = [d.to_dict() if hasattr(d, "to_dict") else d for d in data]
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(plain, default=str))
    tmp.rename(path)  # atomic: an interrupted run never corrupts the cache
    return json.loads(path.read_text())

def pull_season(year):
    """All raw data for one season, cache-first. 6 API calls when cold."""
    import cfbd
    c = _client if True else None  # client built lazily inside fetchers

    def stats_api():
        import cfbd
        return cfbd.StatsApi(_client())

    def games_api():
        import cfbd
        return cfbd.GamesApi(_client())

    def teams_api():
        import cfbd
        return cfbd.TeamsApi(_client())

    # NB: player_season rows carry their own `position` column (probed 2023),
    # so no roster pull is needed — 4 calls per cold season.
    return {
        "players": cached("player_season", year,
            lambda: stats_api().get_player_season_stats(year=year, season_type="regular")),
        "team_stats": cached("team_season", year,
            lambda: stats_api().get_team_stats(year=year)),
        "games": cached("games", year,
            lambda: games_api().get_games(year=year, season_type="regular")),
        "fbs": cached("fbs_teams", year,
            lambda: teams_api().get_fbs_teams(year=year)),
    }

# ---- probe mode --------------------------------------------------------------

def probe(year):
    """Pull one season and dump the actual field/category/stat-type names so
    the composites below can be validated against reality, not memory."""
    raw = pull_season(year)
    pdf = pd.DataFrame(raw["players"])
    print("player_season columns:", list(pdf.columns))
    if "category" in pdf.columns:
        for cat, g in pdf.groupby("category"):
            types = sorted(g["statType"].unique()) if "statType" in g else "?"
            print(f"  {cat}: {types}")
    tdf = pd.DataFrame(raw["team_stats"])
    print("team_season columns:", list(tdf.columns))
    if "statName" in tdf.columns:
        print("  statNames:", sorted(tdf["statName"].unique()))
    gdf = pd.DataFrame(raw["games"])
    print("games columns:", list(gdf.columns))

# ---- transforms ---------------------------------------------------------------

# CFBD position -> game position / captain role
OFF_POS = {"QB": "QB", "RB": "RB", "FB": "RB", "WR": "WR", "TE": "TE"}
DPOS_ROLE = {
    "CB": "DB", "DB": "DB", "FS": "DB", "SS": "DB", "S": "DB", "SAF": "DB",
    "LB": "LB", "ILB": "LB", "MLB": "LB", "OLB": "LB", "EDGE": "DL",
    "DE": "DL", "DT": "DL", "NT": "DL", "DL": "DL",
}

def pivot_players(rows, fbs_names):
    """player_season rows (player/team/category/statType/stat) ->
    one row per (player, team) with columns like passing_YDS, defensive_TFL."""
    df = pd.DataFrame(rows)
    df = df[df["team"].isin(fbs_names)]
    df["col"] = df["category"] + "_" + df["statType"]
    df["stat"] = pd.to_numeric(df["stat"], errors="coerce").fillna(0)
    pos = df.groupby("playerId")["position"].first()
    wide = df.pivot_table(index=["playerId", "player", "team"],
                          columns="col", values="stat", aggfunc="sum").reset_index()
    wide["cfbd_pos"] = wide["playerId"].map(pos)
    return wide

def col(df, name):
    """Stat column or zeros — keeps composites NaN-proof across API quirks."""
    return pd.to_numeric(df[name], errors="coerce").fillna(0) if name in df.columns else pd.Series(0.0, index=df.index)

def gi(r, k):
    """NaN-safe int from a pivoted row (missing stat columns pivot to NaN)."""
    v = r.get(k, 0)
    return int(v) if v == v and v is not None else 0

def gf(r, k, n=1):
    v = r.get(k, 0)
    return round(float(v), n) if v == v and v is not None else 0.0

# Per-position composites. Volume thresholds are scaled to a 12-game season
# (NFL pipeline used 17-game thresholds). Weights mirror the NFL pipeline;
# CFBD has no EPA in season stats, so efficiency uses yards-per-attempt
# style rates instead.
SKILL_SPECS = {
    "QB": dict(
        qualify=lambda d: col(d, "passing_ATT") >= 150,
        inputs={
            "eff": lambda d: col(d, "passing_YDS") / col(d, "passing_ATT").clip(lower=1),
            "vol": lambda d: col(d, "passing_YDS"),
            "td": lambda d: col(d, "passing_TD"),
            "diff": lambda d: col(d, "passing_TD") - col(d, "passing_INT"),
            # dual-threat credit — college QBs run
            "rush": lambda d: col(d, "rushing_YDS").clip(lower=0),
        },
        weights={"eff": 0.30, "vol": 0.25, "td": 0.20, "diff": 0.10, "rush": 0.15},
        attrs=[("ARM", "z_vol"), ("ACC", "z_diff"), ("AWR", "z_eff"), ("DEEP", "z_td"), ("RUN", "z_rush")],
        stats=lambda r: {"Yds": gi(r, "passing_YDS"), "TD": gi(r, "passing_TD"),
                         "INT": gi(r, "passing_INT"), "Rush Yds": gi(r, "rushing_YDS")},
    ),
    "RB": dict(
        qualify=lambda d: col(d, "rushing_CAR") >= 80,
        inputs={
            "vol": lambda d: col(d, "rushing_YDS"),
            "ypc": lambda d: col(d, "rushing_YDS") / col(d, "rushing_CAR").clip(lower=1),
            "td": lambda d: col(d, "rushing_TD") + col(d, "receiving_TD"),
            "rec": lambda d: col(d, "receiving_YDS"),
        },
        weights={"vol": 0.40, "ypc": 0.25, "td": 0.20, "rec": 0.15},
        attrs=[("SPD", "z_ypc"), ("BTK", "z_vol"), ("CAR", "z_vol"), ("CTH", "z_rec")],
        stats=lambda r: {"Rush Yds": gi(r, "rushing_YDS"),
                         "TD": gi(r, "rushing_TD") + gi(r, "receiving_TD"),
                         "YPC": round(gi(r, "rushing_YDS") / max(gi(r, "rushing_CAR"), 1), 1),
                         "Rec": gi(r, "receiving_REC")},
    ),
    "WR": dict(
        qualify=lambda d: col(d, "receiving_REC") >= 20,
        inputs={
            "vol": lambda d: col(d, "receiving_YDS"),
            "td": lambda d: col(d, "receiving_TD"),
            "rec": lambda d: col(d, "receiving_REC"),
            "ypr": lambda d: col(d, "receiving_YDS") / col(d, "receiving_REC").clip(lower=1),
        },
        weights={"vol": 0.40, "td": 0.25, "rec": 0.20, "ypr": 0.15},
        attrs=[("SPD", "z_ypr"), ("CTH", "z_rec"), ("RTE", "z_vol"), ("RZN", "z_td")],
        stats=lambda r: {"Rec": gi(r, "receiving_REC"), "Yds": gi(r, "receiving_YDS"),
                         "TD": gi(r, "receiving_TD"),
                         "YPR": round(gi(r, "receiving_YDS") / max(gi(r, "receiving_REC"), 1), 1)},
    ),
}
SKILL_SPECS["TE"] = dict(SKILL_SPECS["WR"], qualify=lambda d: col(d, "receiving_REC") >= 15)

DC_SPECS = {
    "DL": dict(
        qualify=lambda d: col(d, "defensive_SACKS") >= 2.5,
        inputs={
            "sack": lambda d: col(d, "defensive_SACKS"),
            "tfl": lambda d: col(d, "defensive_TFL"),
            "qbh": lambda d: col(d, "defensive_QB HUR"),
        },
        weights={"sack": 0.50, "tfl": 0.35, "qbh": 0.15},
        attrs=[("PRS", "z_sack"), ("RDF", "z_tfl"), ("BLH", "z_qbh")],
        stats=lambda r: {"Sacks": gf(r, "defensive_SACKS"),
                         "TFL": gi(r, "defensive_TFL"),
                         "QBH": gi(r, "defensive_QB HUR")},
    ),
    "LB": dict(
        qualify=lambda d: col(d, "defensive_TOT") >= 45,
        inputs={
            "tak": lambda d: col(d, "defensive_TOT"),
            "tfl": lambda d: col(d, "defensive_TFL"),
            "sack": lambda d: col(d, "defensive_SACKS"),
            "cov": lambda d: col(d, "interceptions_INT") * 3 + col(d, "defensive_PD"),
        },
        weights={"tak": 0.35, "tfl": 0.25, "sack": 0.20, "cov": 0.20},
        attrs=[("TAK", "z_tak"), ("RDF", "z_tfl"), ("PRS", "z_sack"), ("COV", "z_cov")],
        stats=lambda r: {"Tk": gi(r, "defensive_TOT"), "TFL": gi(r, "defensive_TFL"),
                         "Sacks": gf(r, "defensive_SACKS"),
                         "INT": gi(r, "interceptions_INT")},
    ),
    "DB": dict(
        qualify=lambda d: (col(d, "interceptions_INT") * 3 + col(d, "defensive_PD")) >= 8,
        inputs={
            "int": lambda d: col(d, "interceptions_INT"),
            "pd": lambda d: col(d, "defensive_PD"),
            "tak": lambda d: col(d, "defensive_TOT"),
        },
        weights={"int": 0.45, "pd": 0.35, "tak": 0.20},
        attrs=[("COV", "z_pd"), ("INT", "z_int"), ("TAK", "z_tak")],
        stats=lambda r: {"INT": gi(r, "interceptions_INT"), "PD": gi(r, "defensive_PD"),
                         "Tk": gi(r, "defensive_TOT")},
    ),
}

def run_group(allg, attrs_spec):
    """Cross-season re-standardize + attribute ratings for a concat'd group."""
    allg = allg.reset_index(drop=True)
    allg["_z"] = zscore(allg["_comp"].to_numpy())
    rated = {}
    for label, zcol in attrs_spec:
        arr = allg[zcol].fillna(0).to_numpy() if zcol in allg.columns else np.zeros(len(allg))
        rated[label] = [to_rating(z) for z in zscore(arr)]
    return allg, rated

def main():
    if len(sys.argv) >= 3 and sys.argv[1] == "--probe":
        probe(int(sys.argv[2]))
        return

    records = []
    season_frames = {p: [] for p in list(SKILL_SPECS) + list(DC_SPECS) + ["DEF", "OL"]}

    skipped = []
    for year in SEASONS:
        raw = pull_season(year)
        # Early seasons exist in the API but are hollow or near-empty
        # (2001-03: zero player rows; 2004: 54 rows; 2005: 451). Skip them;
        # the cache still remembers the pull, so zero future API calls.
        team_stat_names = {r.get("statName") for r in raw["team_stats"]}
        if len(raw["players"]) < 3000 or len(team_stat_names) < 5:
            skipped.append(year)
            print(f"  {year}: no usable player/team stats — skipped")
            continue
        # Individual defensive stats (tackles/sacks/TFL/PD) only exist from
        # 2016 on — confirmed against the API, including with an explicit
        # category=defensive request. Earlier seasons get no individual DC
        # pool (curated defensive legends in cfb_legends.py cover 2004-15);
        # team DEF/OL units still rate fine from team stats + schedules.
        has_def_stats = any(r["category"] == "defensive" for r in raw["players"])
        fbs = pd.DataFrame(raw["fbs"])
        fbs_names = set(fbs["school"]) if "school" in fbs.columns else set()
        wide = pivot_players(raw["players"], fbs_names)

        # offense: the stats feed's own position decides the bucket
        for pos, spec in SKILL_SPECS.items():
            grp = wide[wide["cfbd_pos"].map(lambda p: OFF_POS.get(p)) == pos].copy()
            grp = grp[spec["qualify"](grp)]
            if grp.empty:
                continue
            for nm, fn in spec["inputs"].items():
                grp[f"z_{nm}"] = zscore(fn(grp).to_numpy())
            grp["_comp"] = sum(grp[f"z_{nm}"] * w for nm, w in spec["weights"].items())
            grp["season"] = year
            season_frames[pos].append(grp)

        # defense individuals -> captain pool, bucketed by role
        for role, spec in (DC_SPECS.items() if has_def_stats else []):
            grp = wide[wide["cfbd_pos"].map(lambda p: DPOS_ROLE.get(p)) == role].copy()
            grp = grp[spec["qualify"](grp)]
            if grp.empty:
                continue
            for nm, fn in spec["inputs"].items():
                grp[f"z_{nm}"] = zscore(fn(grp).to_numpy())
            grp["_comp"] = sum(grp[f"z_{nm}"] * w for nm, w in spec["weights"].items())
            grp["season"] = year
            season_frames[role].append(grp)

        # team units (DEF from points allowed + havoc, OL from rushing)
        season_frames["DEF"].append(team_def_frame(raw, fbs_names, year))
        season_frames["OL"].append(team_ol_frame(raw, fbs_names, year))

    # ---- emit: re-standardize each bucket across all seasons ----
    for pos, spec in SKILL_SPECS.items():
        if not season_frames[pos]:
            continue
        allg, attrs = run_group(pd.concat(season_frames[pos]), spec["attrs"])
        for i, r in allg.iterrows():
            records.append({
                "name": r["player"], "team": r["team"], "year": int(r["season"]),
                "pos": pos, "rating": to_rating(r["_z"]), "tier": "modern",
                "ratings": {label: attrs[label][i] for label, _ in spec["attrs"]},
                "stats": spec["stats"](r),
            })
        top = allg.sort_values("_z", ascending=False).head(5)
        print(f"\nTOP {pos}:")
        for _, r in top.iterrows():
            print(f"  {to_rating(r['_z'])}  {r['player']} ({r['team']} {int(r['season'])})")

    for role, spec in DC_SPECS.items():
        if not season_frames[role]:
            continue
        allg, attrs = run_group(pd.concat(season_frames[role]), spec["attrs"])
        for i, r in allg.iterrows():
            records.append({
                "name": r["player"], "team": r["team"], "year": int(r["season"]),
                "pos": "DC", "rating": to_rating(r["_z"]), "tier": "modern",
                "dpos": r["cfbd_pos"], "role": role,
                "ratings": {label: attrs[label][i] for label, _ in spec["attrs"]},
                "stats": spec["stats"](r),
            })
        print(f"\nTOP DC ({role}):")
        for _, r in allg.sort_values("_z", ascending=False).head(5).iterrows():
            print(f"  {to_rating(r['_z'])}  {r['player']} ({r['team']} {int(r['season'])}, {r['cfbd_pos']})")

    for unit, attr_spec in [("DEF", [("STP", "z_pa"), ("PRS", "z_sack"), ("COV", "z_pd"), ("TAK", "z_int")]),
                            ("OL", [("RBK", "z_ypc"), ("PBK", "z_vol")])]:
        frames = [f for f in season_frames[unit] if f is not None and not f.empty]
        if not frames:
            continue
        allg, attrs = run_group(pd.concat(frames), attr_spec)
        for i, r in allg.iterrows():
            records.append({
                "name": f"{r['team']} {'Defense' if unit == 'DEF' else 'O-Line'}",
                "team": r["team"], "year": int(r["season"]), "pos": unit,
                "rating": to_rating(r["_z"]), "tier": "modern",
                "ratings": {label: attrs[label][i] for label, _ in attr_spec},
                "stats": r["_stats"],
            })
        print(f"\nTOP {unit}:")
        for _, r in allg.sort_values("_z", ascending=False).head(5).iterrows():
            print(f"  {to_rating(r['_z'])}  {r['team']} ({int(r['season'])})")

    if skipped:
        print(f"\nskipped seasons with no usable data: {skipped}")

    legends = legend_records()
    records.extend(legends)
    print(f"\nadded {len(legends)} pre-2001 legends")

    OUT_PATH.write_text(json.dumps(records))
    print(f"\nwrote {len(records)} records to {OUT_PATH.name}")

def team_def_frame(raw, fbs_names, year):
    """Defense unit: points allowed per game (from schedules) + sacks/INTs/PD
    from team season stats, z-scored across that season's FBS teams."""
    games = pd.DataFrame(raw["games"])
    pa, gp = {}, {}
    hp = "homePoints" if "homePoints" in games.columns else "home_points"
    ap = "awayPoints" if "awayPoints" in games.columns else "away_points"
    ht = "homeTeam" if "homeTeam" in games.columns else "home_team"
    at = "awayTeam" if "awayTeam" in games.columns else "away_team"
    for _, g in games.iterrows():
        if g.get(hp) is None or g.get(ap) is None:
            continue
        for team, allowed in [(g[ht], g[ap]), (g[at], g[hp])]:
            if team in fbs_names:
                pa[team] = pa.get(team, 0) + allowed
                gp[team] = gp.get(team, 0) + 1

    ts = pd.DataFrame(raw["team_stats"])
    stat = ts.pivot_table(index="team", columns="statName", values="statValue",
                          aggfunc="first").reset_index()
    stat = stat[stat["team"].isin(pa.keys())].copy()
    stat["ppg"] = stat["team"].map(lambda t: pa[t] / max(gp[t], 1))
    stat["z_pa"] = zscore(-stat["ppg"].to_numpy())
    stat["z_sack"] = zscore(col(stat, "sacks").to_numpy())
    stat["z_int"] = zscore(col(stat, "passesIntercepted").to_numpy())
    stat["z_pd"] = zscore(col(stat, "tacklesForLoss").to_numpy())  # havoc proxy
    stat["_comp"] = 0.5 * stat["z_pa"] + 0.2 * stat["z_sack"] + 0.15 * stat["z_int"] + 0.15 * stat["z_pd"]
    stat["season"] = year
    stat["_stats"] = stat.apply(lambda r: {
        "PPG": round(r["ppg"], 1), "Sacks": gi(r, "sacks"),
        "INT": gi(r, "passesIntercepted"),
        "TFL": gi(r, "tacklesForLoss")}, axis=1)
    return stat[["team", "season", "_comp", "z_pa", "z_sack", "z_int", "z_pd", "_stats"]]

def team_ol_frame(raw, fbs_names, year):
    """O-line unit: team rush YPC + rushing volume (CFBD season stats carry no
    clean sacks-allowed; volume rewards lines that move people — iterate later
    with advanced stats line-yards if needed)."""
    ts = pd.DataFrame(raw["team_stats"])
    stat = ts.pivot_table(index="team", columns="statName", values="statValue",
                          aggfunc="first").reset_index()
    stat = stat[stat["team"].isin(fbs_names)].copy()
    ypc = col(stat, "rushingYards") / col(stat, "rushingAttempts").clip(lower=1)
    stat["z_ypc"] = zscore(ypc.to_numpy())
    stat["z_vol"] = zscore(col(stat, "rushingYards").to_numpy())
    stat["_comp"] = 0.65 * stat["z_ypc"] + 0.35 * stat["z_vol"]
    stat["season"] = year
    stat["_stats"] = stat.apply(lambda r: {
        "Rush YPC": round(gi(r, "rushingYards") / max(gi(r, "rushingAttempts"), 1), 1),
        "Rush Yds": gi(r, "rushingYards")}, axis=1)
    return stat[["team", "season", "_comp", "z_ypc", "z_vol", "_stats"]]

if __name__ == "__main__":
    main()
