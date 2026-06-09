"""
NFL draft-game rating engine.
Pulls nflverse data (1999-2025), computes era-relative z-score ratings per
position, re-standardizes, maps to 0-100, appends a curated legend pool,
writes one flat players.json the web app consumes.
"""
import json
import nflreadpy as nfl
import polars as pl
import numpy as np

START, END = 1999, 2024  # 2025 not complete yet; bump when it is
SEASONS = list(range(START, END + 1))

# z -> rating, tuned to feel like Madden: an average qualifying STARTER sits
# ~76, a good season (+1SD) ~85, a great one (+2SD) ~94, the elite clamp at 99.
# (Pool is starters who cleared volume thresholds, so the floor is 56.)
def to_rating(z):
    return int(np.clip(round(76 + 9 * z), 56, 99))

# standardize a numpy array, guarding against zero variance
def zscore(arr):
    arr = np.asarray(arr, dtype=float)
    sd = arr.std()
    return (arr - arr.mean()) / sd if sd > 0 else np.zeros_like(arr)

# weighted composite of pre-computed per-stat z columns, then RE-standardize
# (this second standardize is the step that stops everyone clustering at ~70)
def composite(df, weights):
    comp = sum(df[f"z_{c}"] * w for c, w in weights.items())
    return zscore(comp.to_numpy())

# Madden-style attribute ratings, mirroring the headline ratings Madden shows
# per position. Each maps to one of the per-stat z columns already computed in
# the rating pipeline; re-standardizing that column across all seasons and
# mapping it through to_rating() yields an era-relative 50-99 attribute that
# stays consistent with the player's overall.
#   QB  -> ARM (arm/yards) ACC (TD:INT care) AWR (EPA decisions) DEEP (TD rate)
#   RB  -> SPD (ypc) BTK (EPA power) CAR (workload) CTH (receiving)
#   WR  -> SPD (yds/target) CTH (receptions) RTE (EPA separation) RZN (TDs)
#   EDGE-> PRS (sacks) RDF (TFL) BLH (forced fumbles)
#   DEF -> STP (pts allowed) PRS (sacks) COV (passes defended) TAK (INTs)
#   OL  -> RBK (rush ypc) PBK (inverse sack rate)
ATTR_SPECS = {
    "QB": [("ARM", "z_vol"), ("ACC", "z_diff"), ("AWR", "z_eff"), ("DEEP", "z_td")],
    "RB": [("SPD", "z_ypc"), ("BTK", "z_epa"), ("CAR", "z_vol"), ("CTH", "z_rec")],
    "WR": [("SPD", "z_ypr"), ("CTH", "z_rec"), ("RTE", "z_epa"), ("RZN", "z_td")],
    "TE": [("SPD", "z_ypr"), ("CTH", "z_rec"), ("RTE", "z_epa"), ("RZN", "z_td")],
}

# build, for each (label, zcol) spec, a list of 50-99 attribute ratings aligned
# to allg's row order (allg should be reset_index'd by the caller)
def make_attrs(allg, specs):
    rated = {}
    for label, zcol in specs:
        arr = (
            allg[zcol].fillna(0).to_numpy()
            if zcol in allg.columns
            else np.zeros(len(allg))
        )
        rated[label] = [to_rating(z) for z in zscore(arr)]
    return rated

# NaN-safe scalar helpers + real-stat lines (shown in Expert Mode).
def si(x):  # safe int
    try:
        return int(x) if x == x else 0
    except (TypeError, ValueError):
        return 0

def sf(x, n=1):  # safe float, rounded
    try:
        return round(float(x), n) if x == x else 0.0
    except (TypeError, ValueError):
        return 0.0

def skill_stats(pos, r):
    if pos == "QB":
        att = si(r["attempts"])
        cmp_ = si(r["completions"]) if "completions" in r else 0
        return {"Yds": si(r["passing_yards"]), "TD": si(r["passing_tds"]),
                "INT": si(r["passing_interceptions"]),
                "Cmp%": round(cmp_ / att * 100, 1) if att else 0.0}
    if pos == "RB":
        car = si(r["carries"])
        return {"Rush Yds": si(r["rushing_yards"]),
                "TD": si(r["rushing_tds"]) + si(r["receiving_tds"]),
                "YPC": round(r["rushing_yards"] / car, 1) if car else 0.0,
                "Rec": si(r["receptions"])}
    # WR / TE
    rec = si(r["receptions"])
    return {"Rec": rec, "Yds": si(r["receiving_yards"]),
            "TD": si(r["receiving_tds"]),
            "YPR": round(r["receiving_yards"] / rec, 1) if rec else 0.0}

# Curated pre-1999 legends (nflverse box-score data only starts in 1999, so the
# all-time greats are hand-rated on the same scale). Format:
# (name, team, year, pos, overall, {attribute ratings})
LEGENDS = [
    # ---- QB ----
    ("Joe Montana", "SF", 1989, "QB", 99, {"ARM": 88, "ACC": 99, "AWR": 99, "DEEP": 90}),
    ("Dan Marino", "MIA", 1984, "QB", 99, {"ARM": 99, "ACC": 95, "AWR": 92, "DEEP": 97}),
    ("Steve Young", "SF", 1994, "QB", 97, {"ARM": 92, "ACC": 96, "AWR": 95, "DEEP": 90}),
    ("John Elway", "DEN", 1987, "QB", 95, {"ARM": 99, "ACC": 87, "AWR": 90, "DEEP": 95}),
    ("Johnny Unitas", "BAL", 1964, "QB", 95, {"ARM": 90, "ACC": 92, "AWR": 96, "DEEP": 90}),
    ("Brett Favre", "GB", 1996, "QB", 96, {"ARM": 97, "ACC": 88, "AWR": 90, "DEEP": 93}),
    ("Troy Aikman", "DAL", 1993, "QB", 93, {"ARM": 90, "ACC": 93, "AWR": 92, "DEEP": 88}),
    ("Dan Fouts", "SD", 1982, "QB", 92, {"ARM": 92, "ACC": 90, "AWR": 90, "DEEP": 92}),
    ("Jim Kelly", "BUF", 1991, "QB", 92, {"ARM": 90, "ACC": 90, "AWR": 91, "DEEP": 88}),
    ("Roger Staubach", "DAL", 1977, "QB", 92, {"ARM": 88, "ACC": 89, "AWR": 92, "DEEP": 88}),
    ("Terry Bradshaw", "PIT", 1978, "QB", 91, {"ARM": 95, "ACC": 84, "AWR": 88, "DEEP": 95}),
    ("Warren Moon", "HOU", 1990, "QB", 91, {"ARM": 95, "ACC": 88, "AWR": 88, "DEEP": 92}),
    # ---- RB ----
    ("Barry Sanders", "DET", 1997, "RB", 99, {"SPD": 98, "BTK": 99, "CAR": 95, "CTH": 84}),
    ("Walter Payton", "CHI", 1985, "RB", 99, {"SPD": 92, "BTK": 97, "CAR": 99, "CTH": 90}),
    ("Jim Brown", "CLE", 1963, "RB", 99, {"SPD": 94, "BTK": 99, "CAR": 99, "CTH": 85}),
    ("Emmitt Smith", "DAL", 1995, "RB", 97, {"SPD": 88, "BTK": 92, "CAR": 97, "CTH": 82}),
    ("Eric Dickerson", "LA", 1984, "RB", 97, {"SPD": 95, "BTK": 90, "CAR": 99, "CTH": 78}),
    ("O.J. Simpson", "BUF", 1973, "RB", 95, {"SPD": 97, "BTK": 90, "CAR": 97, "CTH": 72}),
    ("Earl Campbell", "HOU", 1980, "RB", 94, {"SPD": 90, "BTK": 99, "CAR": 95, "CTH": 70}),
    ("Gale Sayers", "CHI", 1966, "RB", 94, {"SPD": 99, "BTK": 92, "CAR": 90, "CTH": 84}),
    ("Marcus Allen", "LA", 1985, "RB", 93, {"SPD": 88, "BTK": 90, "CAR": 92, "CTH": 90}),
    ("Thurman Thomas", "BUF", 1991, "RB", 93, {"SPD": 90, "BTK": 88, "CAR": 90, "CTH": 92}),
    ("Tony Dorsett", "DAL", 1981, "RB", 92, {"SPD": 94, "BTK": 86, "CAR": 92, "CTH": 82}),
    ("Franco Harris", "PIT", 1975, "RB", 90, {"SPD": 86, "BTK": 90, "CAR": 91, "CTH": 80}),
    # ---- WR ----
    ("Jerry Rice", "SF", 1987, "WR", 99, {"SPD": 92, "CTH": 99, "RTE": 99, "RZN": 99}),
    ("Don Hutson", "GB", 1942, "WR", 97, {"SPD": 90, "CTH": 97, "RTE": 96, "RZN": 99}),
    ("Lance Alworth", "SD", 1965, "WR", 95, {"SPD": 95, "CTH": 94, "RTE": 95, "RZN": 90}),
    ("Steve Largent", "SEA", 1985, "WR", 93, {"SPD": 84, "CTH": 96, "RTE": 97, "RZN": 90}),
    ("Michael Irvin", "DAL", 1991, "WR", 93, {"SPD": 86, "CTH": 92, "RTE": 95, "RZN": 88}),
    ("Cris Carter", "MIN", 1995, "WR", 93, {"SPD": 84, "CTH": 97, "RTE": 93, "RZN": 95}),
    ("Tim Brown", "LA", 1997, "WR", 91, {"SPD": 90, "CTH": 92, "RTE": 90, "RZN": 88}),
    ("James Lofton", "GB", 1984, "WR", 89, {"SPD": 94, "CTH": 88, "RTE": 88, "RZN": 84}),
    ("Andre Reed", "BUF", 1991, "WR", 89, {"SPD": 88, "CTH": 90, "RTE": 89, "RZN": 85}),
    # ---- TE ----
    ("Kellen Winslow", "SD", 1980, "TE", 96, {"SPD": 86, "CTH": 95, "RTE": 94, "RZN": 92}),
    ("Shannon Sharpe", "DEN", 1996, "TE", 92, {"SPD": 84, "CTH": 93, "RTE": 90, "RZN": 90}),
    ("Ozzie Newsome", "CLE", 1984, "TE", 91, {"SPD": 80, "CTH": 93, "RTE": 90, "RZN": 86}),
    ("Mike Ditka", "CHI", 1964, "TE", 90, {"SPD": 80, "CTH": 90, "RTE": 88, "RZN": 88}),
    ("John Mackey", "BAL", 1966, "TE", 90, {"SPD": 88, "CTH": 88, "RTE": 86, "RZN": 86}),
    # ---- EDGE ----
    ("Reggie White", "PHI", 1987, "EDGE", 99, {"PRS": 99, "RDF": 97, "BLH": 90}),
    ("Lawrence Taylor", "NYG", 1986, "EDGE", 99, {"PRS": 99, "RDF": 94, "BLH": 92}),
    ("Bruce Smith", "BUF", 1990, "EDGE", 97, {"PRS": 97, "RDF": 95, "BLH": 88}),
    ("Deacon Jones", "LA", 1967, "EDGE", 96, {"PRS": 99, "RDF": 95, "BLH": 85}),
    ("Derrick Thomas", "KC", 1990, "EDGE", 95, {"PRS": 99, "RDF": 84, "BLH": 95}),
    ("Chris Doleman", "MIN", 1989, "EDGE", 90, {"PRS": 93, "RDF": 88, "BLH": 85}),
    ("Kevin Greene", "PIT", 1994, "EDGE", 90, {"PRS": 94, "RDF": 82, "BLH": 86}),
    ("Howie Long", "LA", 1985, "EDGE", 90, {"PRS": 88, "RDF": 93, "BLH": 84}),
    # ---- OL (units) ----
    ("WAS O-Line", "WAS", 1991, "OL", 97, {"RBK": 97, "PBK": 95}),  # The Hogs
    ("DAL O-Line", "DAL", 1992, "OL", 96, {"RBK": 96, "PBK": 96}),  # Great Wall
    ("SF O-Line", "SF", 1989, "OL", 91, {"RBK": 90, "PBK": 93}),
    ("BUF O-Line", "BUF", 1991, "OL", 91, {"RBK": 92, "PBK": 92}),
    ("MIA O-Line", "MIA", 1984, "OL", 90, {"RBK": 84, "PBK": 96}),
    # ---- DEF (units) ----
    ("CHI Defense", "CHI", 1985, "DEF", 99, {"STP": 99, "PRS": 99, "COV": 90, "TAK": 95}),  # 46 D
    ("PIT Defense", "PIT", 1976, "DEF", 98, {"STP": 99, "PRS": 95, "COV": 90, "TAK": 92}),  # Steel Curtain
    ("MIN Defense", "MIN", 1969, "DEF", 95, {"STP": 97, "PRS": 95, "COV": 88, "TAK": 90}),  # Purple People Eaters
    ("NYG Defense", "NYG", 1986, "DEF", 94, {"STP": 94, "PRS": 96, "COV": 88, "TAK": 90}),
    ("DAL Defense", "DAL", 1977, "DEF", 94, {"STP": 95, "PRS": 92, "COV": 90, "TAK": 90}),  # Doomsday
    ("SF Defense", "SF", 1994, "DEF", 93, {"STP": 93, "PRS": 90, "COV": 95, "TAK": 92}),
    # ---- QB (more) ----
    ("Bart Starr", "GB", 1966, "QB", 92, {"ARM": 84, "ACC": 92, "AWR": 95, "DEEP": 85}),
    ("Ken Stabler", "OAK", 1976, "QB", 91, {"ARM": 85, "ACC": 90, "AWR": 90, "DEEP": 86}),
    ("Randall Cunningham", "PHI", 1990, "QB", 90, {"ARM": 95, "ACC": 82, "AWR": 84, "DEEP": 92}),
    ("Boomer Esiason", "CIN", 1988, "QB", 90, {"ARM": 90, "ACC": 86, "AWR": 88, "DEEP": 88}),
    ("Joe Theismann", "WAS", 1983, "QB", 90, {"ARM": 86, "ACC": 88, "AWR": 88, "DEEP": 86}),
    ("Phil Simms", "NYG", 1986, "QB", 88, {"ARM": 88, "ACC": 87, "AWR": 87, "DEEP": 85}),
    # ---- RB (more) ----
    ("Terrell Davis", "DEN", 1998, "RB", 98, {"SPD": 90, "BTK": 94, "CAR": 97, "CTH": 82}),
    ("John Riggins", "WAS", 1983, "RB", 92, {"SPD": 82, "BTK": 95, "CAR": 94, "CTH": 72}),
    ("Roger Craig", "SF", 1985, "RB", 92, {"SPD": 88, "BTK": 86, "CAR": 88, "CTH": 95}),
    ("Curtis Martin", "NE", 1995, "RB", 91, {"SPD": 87, "BTK": 88, "CAR": 92, "CTH": 84}),
    ("Herschel Walker", "DAL", 1988, "RB", 90, {"SPD": 92, "BTK": 90, "CAR": 90, "CTH": 85}),
    ("Jerome Bettis", "PIT", 1997, "RB", 90, {"SPD": 80, "BTK": 95, "CAR": 92, "CTH": 72}),
    # ---- WR (more) ----
    ("Paul Warfield", "MIA", 1971, "WR", 92, {"SPD": 95, "CTH": 90, "RTE": 92, "RZN": 90}),
    ("Sterling Sharpe", "GB", 1992, "WR", 92, {"SPD": 88, "CTH": 93, "RTE": 92, "RZN": 90}),
    ("Art Monk", "WAS", 1984, "WR", 91, {"SPD": 85, "CTH": 93, "RTE": 92, "RZN": 86}),
    ("Fred Biletnikoff", "OAK", 1972, "WR", 90, {"SPD": 80, "CTH": 95, "RTE": 94, "RZN": 88}),
    ("Charlie Joiner", "SD", 1980, "WR", 89, {"SPD": 86, "CTH": 90, "RTE": 92, "RZN": 82}),
    ("Drew Pearson", "DAL", 1977, "WR", 89, {"SPD": 86, "CTH": 90, "RTE": 90, "RZN": 85}),
    # ---- TE (more) ----
    ("Dave Casper", "OAK", 1976, "TE", 92, {"SPD": 80, "CTH": 92, "RTE": 90, "RZN": 90}),
    ("Todd Christensen", "LA", 1983, "TE", 90, {"SPD": 80, "CTH": 93, "RTE": 88, "RZN": 86}),
    ("Keith Jackson", "PHI", 1988, "TE", 89, {"SPD": 86, "CTH": 90, "RTE": 87, "RZN": 86}),
    ("Ben Coates", "NE", 1994, "TE", 89, {"SPD": 80, "CTH": 90, "RTE": 86, "RZN": 88}),
    # ---- EDGE (more) ----
    ("Mean Joe Greene", "PIT", 1972, "EDGE", 97, {"PRS": 94, "RDF": 99, "BLH": 85}),
    ("Alan Page", "MIN", 1971, "EDGE", 95, {"PRS": 95, "RDF": 94, "BLH": 88}),
    ("Randy White", "DAL", 1978, "EDGE", 94, {"PRS": 92, "RDF": 96, "BLH": 85}),
    ("Richard Dent", "CHI", 1985, "EDGE", 94, {"PRS": 96, "RDF": 88, "BLH": 92}),
    ("Jack Youngblood", "LA", 1976, "EDGE", 92, {"PRS": 92, "RDF": 92, "BLH": 84}),
    ("Charles Haley", "SF", 1990, "EDGE", 92, {"PRS": 93, "RDF": 88, "BLH": 86}),
    ("Cortez Kennedy", "SEA", 1992, "EDGE", 92, {"PRS": 90, "RDF": 95, "BLH": 82}),
    # ---- OL (more units) ----
    ("DEN O-Line", "DEN", 1998, "OL", 93, {"RBK": 96, "PBK": 88}),
    ("OAK O-Line", "OAK", 1976, "OL", 92, {"RBK": 93, "PBK": 92}),
    ("PIT O-Line", "PIT", 1978, "OL", 91, {"RBK": 92, "PBK": 90}),
    # ---- DEF (more units) ----
    ("PIT Defense", "PIT", 1978, "DEF", 96, {"STP": 96, "PRS": 94, "COV": 90, "TAK": 92}),
    ("PHI Defense", "PHI", 1991, "DEF", 95, {"STP": 95, "PRS": 96, "COV": 90, "TAK": 88}),  # Gang Green
    ("BUF Defense", "BUF", 1990, "DEF", 90, {"STP": 88, "PRS": 90, "COV": 86, "TAK": 88}),
    ("DEN Defense", "DEN", 1998, "DEF", 90, {"STP": 90, "PRS": 86, "COV": 88, "TAK": 86}),
]

def legend_records():
    return [
        {"name": n, "team": t, "year": y, "pos": pos,
         "rating": ovr, "tier": "legend", "ratings": attrs}
        for (n, t, y, pos, ovr, attrs) in LEGENDS
    ]

def main():
    print("loading nflverse data...")
    # Use WEEKLY player stats and aggregate by the ACTUAL team each week, so a
    # player is credited to the team he really played for that season (the
    # season-summary `recent_team` lumps a whole year under a player's final
    # team, which scrambled rosters and left many teams with no WR/TE).
    wk = nfl.load_player_stats(SEASONS, summary_level="week").to_pandas()
    if "season_type" in wk.columns:
        wk = wk[wk["season_type"] == "REG"]
    SUM_COLS = [
        "passing_yards", "passing_tds", "passing_interceptions", "attempts",
        "completions", "passing_epa", "carries", "rushing_yards", "rushing_tds",
        "rushing_epa", "receptions", "receiving_yards", "receiving_tds",
        "targets", "receiving_epa", "def_sacks", "def_tackles_for_loss",
        "def_fumbles_forced",
    ]
    sum_cols = [c for c in SUM_COLS if c in wk.columns]
    agg = wk.groupby(["season", "team", "player_display_name"], as_index=False).agg(
        {**{c: "sum" for c in sum_cols}, "position": "first",
         "position_group": "first"}
    )
    agg["recent_team"] = agg["team"]  # downstream code reads recent_team
    ps = agg
    ts = nfl.load_team_stats(SEASONS, summary_level="reg").to_pandas()
    sched = nfl.load_schedules(SEASONS).to_pandas()
    sched = sched[sched["game_type"] == "REG"]

    records = []

    # ---- skill positions: z computed WITHIN position WITHIN season ----
    skill_specs = {
        "QB": dict(thresh=("attempts", 200), inputs={
            "eff": lambda d: d["passing_epa"] / d["attempts"].clip(lower=1),
            "vol": lambda d: d["passing_yards"],
            "td":  lambda d: d["passing_tds"],
            "diff":lambda d: d["passing_tds"] - d["passing_interceptions"],
        }, weights={"eff":0.40,"vol":0.30,"td":0.20,"diff":0.10}),
        "RB": dict(thresh=("carries", 100), inputs={
            "vol": lambda d: d["rushing_yards"],
            "ypc": lambda d: d["rushing_yards"]/d["carries"].clip(lower=1),
            "epa": lambda d: d["rushing_epa"].fillna(0)+d["receiving_epa"].fillna(0),
            "td":  lambda d: d["rushing_tds"]+d["receiving_tds"],
            "rec": lambda d: d["receiving_yards"],
        }, weights={"vol":0.35,"ypc":0.20,"epa":0.20,"td":0.15,"rec":0.10}),
        "WR": dict(thresh=("receptions", 25), inputs={
            "vol": lambda d: d["receiving_yards"],
            "td":  lambda d: d["receiving_tds"],
            "epa": lambda d: d["receiving_epa"].fillna(0),
            "rec": lambda d: d["receptions"],
            "ypr": lambda d: d["receiving_yards"]/d["receptions"].clip(lower=1),
        }, weights={"vol":0.35,"td":0.20,"epa":0.20,"rec":0.15,"ypr":0.10}),
        "TE": dict(thresh=("receptions", 20), inputs={  # rated in own pool
            "vol": lambda d: d["receiving_yards"],
            "td":  lambda d: d["receiving_tds"],
            "epa": lambda d: d["receiving_epa"].fillna(0),
            "rec": lambda d: d["receptions"],
            "ypr": lambda d: d["receiving_yards"]/d["receptions"].clip(lower=1),
        }, weights={"vol":0.35,"td":0.20,"epa":0.20,"rec":0.15,"ypr":0.10}),
    }

    for pos, spec in skill_specs.items():
        sub = ps[ps["position"] == pos].copy()
        tcol, tmin = spec["thresh"]
        sub = sub[sub[tcol] >= tmin]
        out = []
        for season, g in sub.groupby("season"):
            g = g.copy()
            for name, fn in spec["inputs"].items():
                g[f"z_{name}"] = zscore(fn(g).to_numpy())
            g = pl.from_pandas(g)
            comp = composite(g, spec["weights"])
            g = g.to_pandas()
            g["_comp"] = comp
            out.append(g)
        allg = __import__("pandas").concat(out)
        # re-standardize composite ACROSS all seasons so eras share a scale
        allg["_z"] = zscore(allg["_comp"].to_numpy())
        allg = allg.reset_index(drop=True)
        attrs = make_attrs(allg, ATTR_SPECS[pos])
        for i, r in allg.iterrows():
            records.append({
                "name": r["player_display_name"], "team": r["recent_team"],
                "year": int(r["season"]), "pos": pos,
                "rating": to_rating(r["_z"]), "tier": "modern",
                "ratings": {label: attrs[label][i] for label, _ in ATTR_SPECS[pos]},
                "stats": skill_stats(pos, r),
            })
        top = allg.sort_values("_z", ascending=False).head(5)
        print(f"\nTOP {pos}:")
        for _, r in top.iterrows():
            print(f"  {to_rating(r['_z'])}  {r['player_display_name']} ({r['recent_team']} {int(r['season'])})")

    # ---- pass rusher: individual defenders, z across all DL/LB in season ----
    dl = ps[ps["position_group"].isin(["DL","LB"])].copy()
    dl = dl[dl["def_sacks"] >= 3]
    out=[]
    for season,g in dl.groupby("season"):
        g=g.copy()
        g["z_sack"]=zscore(g["def_sacks"].to_numpy())
        g["z_tfl"]=zscore(g["def_tackles_for_loss"].fillna(0).to_numpy())
        g["z_ff"]=zscore(g["def_fumbles_forced"].fillna(0).to_numpy())
        g["_comp"]=0.60*g["z_sack"]+0.25*g["z_tfl"]+0.15*g["z_ff"]
        out.append(g)
    allg=__import__("pandas").concat(out)
    allg["_z"]=zscore(allg["_comp"].to_numpy())
    allg=allg.reset_index(drop=True)
    eattrs=make_attrs(allg,[("PRS","z_sack"),("RDF","z_tfl"),("BLH","z_ff")])
    for i,r in allg.iterrows():
        records.append({"name":r["player_display_name"],"team":r["recent_team"],
            "year":int(r["season"]),"pos":"EDGE","rating":to_rating(r["_z"]),"tier":"modern",
            "ratings":{"PRS":eattrs["PRS"][i],"RDF":eattrs["RDF"][i],"BLH":eattrs["BLH"][i]},
            "stats":{"Sacks":sf(r["def_sacks"]),"TFL":si(r["def_tackles_for_loss"]),
                     "FF":si(r["def_fumbles_forced"])}})
    print("\nTOP EDGE:")
    for _,r in allg.sort_values("_z",ascending=False).head(5).iterrows():
        print(f"  {to_rating(r['_z'])}  {r['player_display_name']} ({r['recent_team']} {int(r['season'])})")

    # ---- defense UNIT: z across the 32 teams within each season ----
    pa = []  # points allowed per team-season from schedules
    for season,g in sched.groupby("season"):
        d={}
        for _,row in g.iterrows():
            d[row["home_team"]]=d.get(row["home_team"],0)+row["away_score"]
            d[row["away_team"]]=d.get(row["away_team"],0)+row["home_score"]
        gp={}
        for _,row in g.iterrows():
            gp[row["home_team"]]=gp.get(row["home_team"],0)+1
            gp[row["away_team"]]=gp.get(row["away_team"],0)+1
        for t in d: pa.append({"season":season,"team":t,"ppg":d[t]/gp[t]})
    pa=__import__("pandas").DataFrame(pa)
    tsd=ts.merge(pa,on=["season","team"])
    out=[]
    for season,g in tsd.groupby("season"):
        g=g.copy()
        g["z_pa"]=zscore(-g["ppg"].to_numpy())           # fewer points = better
        g["z_sack"]=zscore(g["def_sacks"].to_numpy())
        g["z_int"]=zscore(g["def_interceptions"].to_numpy())
        g["z_pd"]=zscore(g["def_pass_defended"].to_numpy())
        g["_comp"]=0.45*g["z_pa"]+0.25*g["z_sack"]+0.15*g["z_int"]+0.15*g["z_pd"]
        out.append(g)
    allg=__import__("pandas").concat(out)
    allg["_z"]=zscore(allg["_comp"].to_numpy())
    allg=allg.reset_index(drop=True)
    dattrs=make_attrs(allg,[("STP","z_pa"),("PRS","z_sack"),("COV","z_pd"),("TAK","z_int")])
    for i,r in allg.iterrows():
        records.append({"name":f"{r['team']} Defense","team":r["team"],
            "year":int(r["season"]),"pos":"DEF","rating":to_rating(r["_z"]),"tier":"modern",
            "ratings":{"STP":dattrs["STP"][i],"PRS":dattrs["PRS"][i],
                       "COV":dattrs["COV"][i],"TAK":dattrs["TAK"][i]},
            "stats":{"PPG":sf(r["ppg"]),"Sacks":si(r["def_sacks"]),
                     "INT":si(r["def_interceptions"]),"PD":si(r["def_pass_defended"])}})
    print("\nTOP DEFENSE:")
    for _,r in allg.sort_values("_z",ascending=False).head(5).iterrows():
        print(f"  {to_rating(r['_z'])}  {r['team']} Defense ({int(r['season'])})  [{r['ppg']:.1f} ppg]")

    # ---- O-line UNIT: team rush YPC + inverse sack rate, z across 32 ----
    out=[]
    for season,g in ts.groupby("season"):
        g=g.copy()
        ypc=g["rushing_yards"]/g["carries"].clip(lower=1)
        sackrate=g["sacks_suffered"]/(g["attempts"]+g["sacks_suffered"]).clip(lower=1)
        g["z_ypc"]=zscore(ypc.to_numpy())
        g["z_sr"]=zscore((-sackrate).to_numpy())
        g["_comp"]=0.5*g["z_ypc"]+0.5*g["z_sr"]
        out.append(g)
    allg=__import__("pandas").concat(out)
    allg["_z"]=zscore(allg["_comp"].to_numpy())
    allg=allg.reset_index(drop=True)
    oattrs=make_attrs(allg,[("RBK","z_ypc"),("PBK","z_sr")])
    for i,r in allg.iterrows():
        records.append({"name":f"{r['team']} O-Line","team":r["team"],
            "year":int(r["season"]),"pos":"OL","rating":to_rating(r["_z"]),"tier":"modern",
            "ratings":{"RBK":oattrs["RBK"][i],"PBK":oattrs["PBK"][i]},
            "stats":{"Rush YPC":sf(r["rushing_yards"]/max(r["carries"],1)),
                     "Sacks Alwd":si(r["sacks_suffered"])}})

    legends = legend_records()
    records.extend(legends)
    print(f"\nadded {len(legends)} pre-1999 legends")

    with open("players.json","w") as f:
        json.dump(records,f)
    print(f"\nwrote {len(records)} records to players.json")

if __name__=="__main__":
    main()
