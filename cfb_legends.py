"""
Curated pre-2001 CFB legends — hand-rated all-time greats for The 15-0 Game.

CFBD player stats are only reliable from ~2001, so earlier eras are curated
by hand, exactly like the NFL game's pre-1999 legend pool. EDITABLE: add or
re-rate freely; this file is the single source of truth for legends.

RULES:
- Every (name, school, year, position) is a real, documented season —
  typically the player's signature/Heisman year. Never invent a season.
- Overall + attribute numbers are editorial ratings on the shared 56-99
  scale (matching the modern pipeline's curve), like Madden ratings — they
  are judgments, not statistics. No fabricated stat lines are shown for
  legends (same as the NFL game's legend pool).
- Attribute keys must match the modern pipeline's per-position keys:
    QB:  ARM ACC AWR DEEP RUN     RB: SPD BTK CAR CTH
    WR/TE: SPD CTH RTE RZN        DC(DL): PRS RDF BLH
    DC(LB): TAK RDF PRS COV       DC(DB): COV INT TAK
    OL: RBK PBK                   DEF: STP PRS COV TAK

Format: (name, school, year, pos, overall, {attrs}[, real defensive pos])
"""

DPOS_ROLE = {
    "CB": "DB", "DB": "DB", "FS": "DB", "SS": "DB", "S": "DB",
    "LB": "LB", "ILB": "LB", "MLB": "LB", "OLB": "LB",
    "DE": "DL", "DT": "DL", "NT": "DL", "DL": "DL",
}

LEGENDS = [
    # ---- QB ----
    ("Tommie Frazier", "Nebraska", 1995, "QB", 97, {"ARM": 82, "ACC": 86, "AWR": 96, "DEEP": 84, "RUN": 99}),
    ("Danny Wuerffel", "Florida", 1996, "QB", 95, {"ARM": 88, "ACC": 95, "AWR": 95, "DEEP": 92, "RUN": 65}),
    ("Peyton Manning", "Tennessee", 1997, "QB", 95, {"ARM": 92, "ACC": 95, "AWR": 97, "DEEP": 88, "RUN": 58}),
    ("Charlie Ward", "Florida State", 1993, "QB", 94, {"ARM": 85, "ACC": 92, "AWR": 95, "DEEP": 85, "RUN": 93}),
    ("Ty Detmer", "BYU", 1990, "QB", 94, {"ARM": 88, "ACC": 94, "AWR": 93, "DEEP": 93, "RUN": 68}),
    ("Doug Flutie", "Boston College", 1984, "QB", 93, {"ARM": 86, "ACC": 90, "AWR": 95, "DEEP": 92, "RUN": 88}),
    ("Steve Young", "BYU", 1983, "QB", 93, {"ARM": 90, "ACC": 94, "AWR": 90, "DEEP": 86, "RUN": 92}),
    ("Joe Namath", "Alabama", 1964, "QB", 91, {"ARM": 95, "ACC": 88, "AWR": 90, "DEEP": 92, "RUN": 62}),
    ("Archie Manning", "Ole Miss", 1969, "QB", 90, {"ARM": 90, "ACC": 87, "AWR": 88, "DEEP": 86, "RUN": 84}),
    ("Tony Rice", "Notre Dame", 1988, "QB", 89, {"ARM": 76, "ACC": 78, "AWR": 92, "DEEP": 80, "RUN": 95}),
    ("Jim McMahon", "BYU", 1980, "QB", 91, {"ARM": 88, "ACC": 92, "AWR": 92, "DEEP": 90, "RUN": 70}),
    ("Major Harris", "West Virginia", 1988, "QB", 88, {"ARM": 82, "ACC": 80, "AWR": 88, "DEEP": 82, "RUN": 93}),
    # ---- RB ----
    ("Herschel Walker", "Georgia", 1982, "RB", 99, {"SPD": 97, "BTK": 98, "CAR": 99, "CTH": 75}),
    ("Barry Sanders", "Oklahoma State", 1988, "RB", 99, {"SPD": 98, "BTK": 99, "CAR": 99, "CTH": 80}),
    ("Bo Jackson", "Auburn", 1985, "RB", 99, {"SPD": 99, "BTK": 97, "CAR": 95, "CTH": 74}),
    ("Tony Dorsett", "Pittsburgh", 1976, "RB", 97, {"SPD": 96, "BTK": 90, "CAR": 96, "CTH": 80}),
    ("Earl Campbell", "Texas", 1977, "RB", 97, {"SPD": 90, "BTK": 99, "CAR": 96, "CTH": 68}),
    ("Ricky Williams", "Texas", 1998, "RB", 96, {"SPD": 91, "BTK": 95, "CAR": 98, "CTH": 80}),
    ("Marcus Allen", "USC", 1981, "RB", 96, {"SPD": 92, "BTK": 92, "CAR": 99, "CTH": 86}),
    ("O.J. Simpson", "USC", 1968, "RB", 96, {"SPD": 97, "BTK": 92, "CAR": 97, "CTH": 76}),
    ("Ron Dayne", "Wisconsin", 1999, "RB", 94, {"SPD": 82, "BTK": 98, "CAR": 98, "CTH": 62}),
    ("Mike Rozier", "Nebraska", 1983, "RB", 94, {"SPD": 92, "BTK": 92, "CAR": 94, "CTH": 70}),
    ("Eddie George", "Ohio State", 1995, "RB", 93, {"SPD": 89, "BTK": 92, "CAR": 96, "CTH": 78}),
    ("Archie Griffin", "Ohio State", 1974, "RB", 93, {"SPD": 90, "BTK": 88, "CAR": 95, "CTH": 76}),
    # ---- WR ----
    ("Randy Moss", "Marshall", 1997, "WR", 99, {"SPD": 99, "CTH": 94, "RTE": 90, "RZN": 99}),
    ("Tim Brown", "Notre Dame", 1987, "WR", 96, {"SPD": 94, "CTH": 92, "RTE": 92, "RZN": 88}),
    ("Desmond Howard", "Michigan", 1991, "WR", 96, {"SPD": 95, "CTH": 92, "RTE": 92, "RZN": 94}),
    ("Johnny Rodgers", "Nebraska", 1972, "WR", 94, {"SPD": 94, "CTH": 90, "RTE": 90, "RZN": 90}),
    ("Raghib Ismail", "Notre Dame", 1990, "WR", 93, {"SPD": 99, "CTH": 85, "RTE": 84, "RZN": 84}),
    ("Lynn Swann", "USC", 1973, "WR", 92, {"SPD": 90, "CTH": 95, "RTE": 92, "RZN": 88}),
    ("Cris Carter", "Ohio State", 1986, "WR", 92, {"SPD": 86, "CTH": 97, "RTE": 90, "RZN": 94}),
    # ---- TE ----
    ("Kellen Winslow", "Missouri", 1978, "TE", 94, {"SPD": 88, "CTH": 93, "RTE": 90, "RZN": 90}),
    ("Tony Gonzalez", "California", 1996, "TE", 93, {"SPD": 85, "CTH": 95, "RTE": 90, "RZN": 92}),
    ("Keith Jackson", "Oklahoma", 1987, "TE", 92, {"SPD": 87, "CTH": 90, "RTE": 86, "RZN": 88}),
    ("Dave Casper", "Notre Dame", 1973, "TE", 90, {"SPD": 78, "CTH": 90, "RTE": 86, "RZN": 88}),
    # ---- DC (defensive linemen) ----
    ("Bruce Smith", "Virginia Tech", 1984, "DC", 98, {"PRS": 99, "RDF": 95, "BLH": 88}, "DE"),
    ("Hugh Green", "Pittsburgh", 1980, "DC", 97, {"PRS": 97, "RDF": 95, "BLH": 88}, "DE"),
    ("Lee Roy Selmon", "Oklahoma", 1975, "DC", 96, {"PRS": 94, "RDF": 98, "BLH": 85}, "DT"),
    ("Reggie White", "Tennessee", 1983, "DC", 96, {"PRS": 96, "RDF": 94, "BLH": 86}, "DE"),
    ("Warren Sapp", "Miami", 1994, "DC", 95, {"PRS": 94, "RDF": 95, "BLH": 84}, "DT"),
    ("Steve Emtman", "Washington", 1991, "DC", 95, {"PRS": 92, "RDF": 97, "BLH": 84}, "DT"),
    # ---- DC (linebackers) ----
    ("Dick Butkus", "Illinois", 1964, "DC", 98, {"TAK": 99, "RDF": 96, "PRS": 80, "COV": 82}, "LB"),
    ("Lawrence Taylor", "North Carolina", 1980, "DC", 98, {"TAK": 92, "RDF": 94, "PRS": 99, "COV": 80}, "LB"),
    ("Derrick Thomas", "Alabama", 1988, "DC", 97, {"TAK": 86, "RDF": 90, "PRS": 99, "COV": 72}, "LB"),
    ("Brian Bosworth", "Oklahoma", 1986, "DC", 95, {"TAK": 98, "RDF": 94, "PRS": 78, "COV": 84}, "LB"),
    ("Mike Singletary", "Baylor", 1980, "DC", 95, {"TAK": 99, "RDF": 92, "PRS": 76, "COV": 82}, "LB"),
    ("Tommy Nobis", "Texas", 1965, "DC", 94, {"TAK": 97, "RDF": 92, "PRS": 78, "COV": 84}, "LB"),
    ("Chris Spielman", "Ohio State", 1987, "DC", 93, {"TAK": 96, "RDF": 90, "PRS": 75, "COV": 84}, "LB"),
    # ---- DC (defensive backs) ----
    ("Charles Woodson", "Michigan", 1997, "DC", 99, {"COV": 99, "INT": 95, "TAK": 86}, "CB"),
    ("Deion Sanders", "Florida State", 1988, "DC", 98, {"COV": 99, "INT": 94, "TAK": 60}, "CB"),
    ("Ronnie Lott", "USC", 1980, "DC", 96, {"COV": 92, "INT": 95, "TAK": 95}, "S"),
    ("Champ Bailey", "Georgia", 1998, "DC", 95, {"COV": 96, "INT": 88, "TAK": 82}, "CB"),
    ("Jack Tatum", "Ohio State", 1970, "DC", 94, {"COV": 88, "INT": 85, "TAK": 99}, "S"),
    ("Bennie Blades", "Miami", 1987, "DC", 93, {"COV": 90, "INT": 94, "TAK": 90}, "S"),
    # ---- OL (units) ----
    ("Nebraska O-Line", "Nebraska", 1995, "OL", 99, {"RBK": 99, "PBK": 90}),  # The Pipeline
    ("Washington O-Line", "Washington", 1991, "OL", 94, {"RBK": 93, "PBK": 94}),
    ("Ohio State O-Line", "Ohio State", 1995, "OL", 93, {"RBK": 94, "PBK": 92}),  # Orlando Pace
    ("USC O-Line", "USC", 1979, "OL", 93, {"RBK": 96, "PBK": 86}),  # Student Body Right
    ("Alabama O-Line", "Alabama", 1992, "OL", 91, {"RBK": 92, "PBK": 88}),
    # ---- DEF (units) ----
    ("Alabama Defense", "Alabama", 1992, "DEF", 98, {"STP": 98, "PRS": 94, "COV": 96, "TAK": 94}),
    ("Miami Defense", "Miami", 1991, "DEF", 97, {"STP": 98, "PRS": 92, "COV": 92, "TAK": 92}),
    ("Nebraska Defense", "Nebraska", 1995, "DEF", 96, {"STP": 94, "PRS": 95, "COV": 88, "TAK": 94}),  # Blackshirts
    ("Penn State Defense", "Penn State", 1986, "DEF", 95, {"STP": 95, "PRS": 88, "COV": 93, "TAK": 92}),
    ("Michigan Defense", "Michigan", 1997, "DEF", 95, {"STP": 96, "PRS": 88, "COV": 95, "TAK": 90}),
    ("Florida State Defense", "Florida State", 1993, "DEF", 94, {"STP": 95, "PRS": 92, "COV": 90, "TAK": 90}),
    ("Oklahoma Defense", "Oklahoma", 1986, "DEF", 94, {"STP": 96, "PRS": 90, "COV": 88, "TAK": 92}),

    # ================= 1999-2003 gap =================
    # CFBD player stats are hollow before ~2004, so the turn-of-the-century
    # stars are curated here too (still gold-badged as legends in-game).
    # ---- QB ----
    ("Michael Vick", "Virginia Tech", 1999, "QB", 97, {"ARM": 95, "ACC": 84, "AWR": 88, "DEEP": 92, "RUN": 99}),
    ("Carson Palmer", "USC", 2002, "QB", 94, {"ARM": 94, "ACC": 92, "AWR": 92, "DEEP": 90, "RUN": 60}),
    ("Eric Crouch", "Nebraska", 2001, "QB", 92, {"ARM": 78, "ACC": 80, "AWR": 90, "DEEP": 80, "RUN": 97}),
    ("Chris Weinke", "Florida State", 2000, "QB", 92, {"ARM": 90, "ACC": 90, "AWR": 93, "DEEP": 90, "RUN": 50}),
    ("Ken Dorsey", "Miami", 2001, "QB", 92, {"ARM": 84, "ACC": 90, "AWR": 96, "DEEP": 86, "RUN": 52}),
    ("Drew Brees", "Purdue", 2000, "QB", 93, {"ARM": 86, "ACC": 95, "AWR": 95, "DEEP": 86, "RUN": 66}),
    ("Jason White", "Oklahoma", 2003, "QB", 91, {"ARM": 88, "ACC": 92, "AWR": 90, "DEEP": 88, "RUN": 45}),
    # ---- RB ----
    ("LaDainian Tomlinson", "TCU", 2000, "RB", 97, {"SPD": 93, "BTK": 92, "CAR": 99, "CTH": 88}),
    ("Larry Johnson", "Penn State", 2002, "RB", 94, {"SPD": 90, "BTK": 93, "CAR": 95, "CTH": 78}),
    ("Willis McGahee", "Miami", 2002, "RB", 93, {"SPD": 92, "BTK": 90, "CAR": 92, "CTH": 82}),
    ("Shaun Alexander", "Alabama", 1999, "RB", 92, {"SPD": 88, "BTK": 92, "CAR": 93, "CTH": 80}),
    # ---- WR ----
    ("Larry Fitzgerald", "Pittsburgh", 2003, "WR", 98, {"SPD": 88, "CTH": 99, "RTE": 94, "RZN": 99}),
    ("Charles Rogers", "Michigan State", 2002, "WR", 93, {"SPD": 94, "CTH": 90, "RTE": 88, "RZN": 92}),
    ("Peter Warrick", "Florida State", 1999, "WR", 93, {"SPD": 93, "CTH": 90, "RTE": 92, "RZN": 90}),
    # ---- TE ----
    ("Kellen Winslow II", "Miami", 2003, "TE", 93, {"SPD": 88, "CTH": 92, "RTE": 90, "RZN": 88}),
    ("Jeremy Shockey", "Miami", 2001, "TE", 92, {"SPD": 86, "CTH": 90, "RTE": 88, "RZN": 90}),
    ("Dallas Clark", "Iowa", 2002, "TE", 90, {"SPD": 85, "CTH": 91, "RTE": 88, "RZN": 86}),
    # ---- DC ----
    ("Julius Peppers", "North Carolina", 2001, "DC", 96, {"PRS": 97, "RDF": 92, "BLH": 88}, "DE"),
    ("Terrell Suggs", "Arizona State", 2002, "DC", 96, {"PRS": 99, "RDF": 90, "BLH": 90}, "DE"),
    ("Dwight Freeney", "Syracuse", 2001, "DC", 94, {"PRS": 97, "RDF": 84, "BLH": 92}, "DE"),
    ("David Pollack", "Georgia", 2002, "DC", 92, {"PRS": 93, "RDF": 90, "BLH": 85}, "DE"),
    ("LaVar Arrington", "Penn State", 1999, "DC", 95, {"TAK": 93, "RDF": 94, "PRS": 92, "COV": 80}, "LB"),
    ("Dan Morgan", "Miami", 2000, "DC", 94, {"TAK": 97, "RDF": 92, "PRS": 80, "COV": 88}, "LB"),
    ("Ed Reed", "Miami", 2001, "DC", 97, {"COV": 95, "INT": 99, "TAK": 86}, "S"),
    ("Roy Williams", "Oklahoma", 2001, "DC", 95, {"COV": 88, "INT": 88, "TAK": 97}, "S"),
    ("Sean Taylor", "Miami", 2003, "DC", 95, {"COV": 90, "INT": 94, "TAK": 96}, "S"),
    ("Terence Newman", "Kansas State", 2002, "DC", 93, {"COV": 96, "INT": 85, "TAK": 80}, "CB"),
    # ---- units ----
    ("Miami O-Line", "Miami", 2001, "OL", 95, {"RBK": 92, "PBK": 97}),  # Bryant McKinnie
    ("Nebraska O-Line", "Nebraska", 1999, "OL", 93, {"RBK": 96, "PBK": 86}),
    ("Miami Defense", "Miami", 2001, "DEF", 99, {"STP": 98, "PRS": 95, "COV": 97, "TAK": 96}),
    ("Oklahoma Defense", "Oklahoma", 2000, "DEF", 96, {"STP": 97, "PRS": 92, "COV": 92, "TAK": 92}),
    ("LSU Defense", "LSU", 2003, "DEF", 96, {"STP": 98, "PRS": 92, "COV": 92, "TAK": 90}),
    ("Ohio State Defense", "Ohio State", 2002, "DEF", 95, {"STP": 96, "PRS": 90, "COV": 92, "TAK": 90}),
    ("Virginia Tech Defense", "Virginia Tech", 1999, "DEF", 93, {"STP": 93, "PRS": 94, "COV": 88, "TAK": 90}),

    # ================= deeper pre-1970s history =================
    ("Jim Brown", "Syracuse", 1956, "RB", 98, {"SPD": 95, "BTK": 99, "CAR": 95, "CTH": 78}),
    ("Red Grange", "Illinois", 1924, "RB", 97, {"SPD": 98, "BTK": 92, "CAR": 95, "CTH": 75}),
    ("Ernie Davis", "Syracuse", 1961, "RB", 94, {"SPD": 93, "BTK": 93, "CAR": 92, "CTH": 76}),
    ("Gale Sayers", "Kansas", 1964, "RB", 95, {"SPD": 99, "BTK": 92, "CAR": 90, "CTH": 84}),
    ("Billy Cannon", "LSU", 1959, "RB", 93, {"SPD": 94, "BTK": 90, "CAR": 90, "CTH": 78}),
    ("Doak Walker", "SMU", 1948, "RB", 93, {"SPD": 90, "BTK": 88, "CAR": 92, "CTH": 86}),
    ("Billy Sims", "Oklahoma", 1978, "RB", 94, {"SPD": 93, "BTK": 93, "CAR": 94, "CTH": 74}),
    ("Charles White", "USC", 1979, "RB", 93, {"SPD": 89, "BTK": 91, "CAR": 97, "CTH": 75}),
    ("Marshall Faulk", "San Diego State", 1992, "RB", 95, {"SPD": 94, "BTK": 88, "CAR": 94, "CTH": 93}),
    ("Rashaan Salaam", "Colorado", 1994, "RB", 92, {"SPD": 89, "BTK": 91, "CAR": 95, "CTH": 74}),
    ("Sammy Baugh", "TCU", 1936, "QB", 94, {"ARM": 93, "ACC": 94, "AWR": 94, "DEEP": 90, "RUN": 78}),
    ("Roger Staubach", "Navy", 1963, "QB", 93, {"ARM": 87, "ACC": 90, "AWR": 93, "DEEP": 86, "RUN": 92}),
    ("Jim Plunkett", "Stanford", 1970, "QB", 91, {"ARM": 92, "ACC": 88, "AWR": 90, "DEEP": 90, "RUN": 64}),
    ("Anthony Carter", "Michigan", 1981, "WR", 92, {"SPD": 95, "CTH": 90, "RTE": 90, "RZN": 88}),
    ("Howard Twilley", "Tulsa", 1965, "WR", 90, {"SPD": 82, "CTH": 95, "RTE": 92, "RZN": 88}),
    ("Bubba Smith", "Michigan State", 1966, "DC", 95, {"PRS": 95, "RDF": 96, "BLH": 84}, "DE"),

    # ---- API data holes (seasons CFBD is simply missing) ----
    ("Cam Newton", "Auburn", 2010, "QB", 99, {"ARM": 92, "ACC": 88, "AWR": 92, "DEEP": 90, "RUN": 99}),
    ("Troy Smith", "Ohio State", 2006, "QB", 92, {"ARM": 88, "ACC": 92, "AWR": 92, "DEEP": 88, "RUN": 80}),

    # ================= 2004-2015 defensive gap =================
    # CFBD has NO individual defensive stats before 2016 (verified against
    # the API, including explicit category=defensive requests), so the great
    # defenders of 2004-2015 are curated here. Offense for those years comes
    # from the API as normal.
    ("Ndamukong Suh", "Nebraska", 2009, "DC", 98, {"PRS": 96, "RDF": 99, "BLH": 88}, "DT"),
    ("Aaron Donald", "Pittsburgh", 2013, "DC", 97, {"PRS": 96, "RDF": 99, "BLH": 86}, "DT"),
    ("Jadeveon Clowney", "South Carolina", 2012, "DC", 95, {"PRS": 96, "RDF": 92, "BLH": 90}, "DE"),
    ("Glenn Dorsey", "LSU", 2007, "DC", 94, {"PRS": 88, "RDF": 96, "BLH": 82}, "DT"),
    ("Von Miller", "Texas A&M", 2010, "DC", 96, {"TAK": 86, "RDF": 92, "PRS": 99, "COV": 76}, "LB"),
    ("Luke Kuechly", "Boston College", 2011, "DC", 96, {"TAK": 99, "RDF": 92, "PRS": 74, "COV": 90}, "LB"),
    ("Patrick Willis", "Ole Miss", 2006, "DC", 95, {"TAK": 98, "RDF": 92, "PRS": 78, "COV": 86}, "LB"),
    ("Khalil Mack", "Buffalo", 2013, "DC", 94, {"TAK": 92, "RDF": 94, "PRS": 94, "COV": 82}, "LB"),
    ("Manti Te'o", "Notre Dame", 2012, "DC", 94, {"TAK": 96, "RDF": 90, "PRS": 76, "COV": 92}, "LB"),
    ("James Laurinaitis", "Ohio State", 2007, "DC", 93, {"TAK": 96, "RDF": 88, "PRS": 78, "COV": 86}, "LB"),
    ("Tyrann Mathieu", "LSU", 2011, "DC", 96, {"COV": 94, "INT": 90, "TAK": 92}, "CB"),
    ("Patrick Peterson", "LSU", 2010, "DC", 96, {"COV": 99, "INT": 88, "TAK": 82}, "CB"),
    ("Eric Berry", "Tennessee", 2008, "DC", 95, {"COV": 92, "INT": 96, "TAK": 90}, "S"),
    ("Earl Thomas", "Texas", 2009, "DC", 94, {"COV": 92, "INT": 94, "TAK": 88}, "S"),
]


def legend_records():
    out = []
    for entry in LEGENDS:
        # DC legends carry a 7th element: the real position (CB/S/LB/DE/DT),
        # shown on the card and mapped to the captain matchup role.
        n, t, y, pos, ovr, attrs = entry[:6]
        rec = {"name": n, "team": t, "year": y, "pos": pos,
               "rating": ovr, "tier": "legend", "ratings": attrs}
        if len(entry) == 7:
            rec["dpos"] = entry[6]
            rec["role"] = DPOS_ROLE[entry[6]]
        out.append(rec)
    return out
