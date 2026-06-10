"""
Heisman Trophy winners, 1935-2025 — (name, season) pairs.

Used by ratings_cfb.py to set `heisman: true` on any player record (modern
or legend) whose (name, year) matches; the game shows a Heisman badge and a
recap callout. Names must match CFBD's player_display_name spelling for the
modern era — the pipeline warns about any 2006+ winner it can't find so
spelling drift is caught instead of silently dropped.

2005 (Reggie Bush) was later vacated; kept here because he won the vote —
remove if you'd rather honor the vacatur.
"""

HEISMAN = {
    ("Jay Berwanger", 1935), ("Larry Kelley", 1936), ("Clint Frank", 1937),
    ("Davey O'Brien", 1938), ("Nile Kinnick", 1939), ("Tom Harmon", 1940),
    ("Bruce Smith", 1941), ("Frank Sinkwich", 1942), ("Angelo Bertelli", 1943),
    ("Les Horvath", 1944), ("Doc Blanchard", 1945), ("Glenn Davis", 1946),
    ("Johnny Lujack", 1947), ("Doak Walker", 1948), ("Leon Hart", 1949),
    ("Vic Janowicz", 1950), ("Dick Kazmaier", 1951), ("Billy Vessels", 1952),
    ("Johnny Lattner", 1953), ("Alan Ameche", 1954), ("Howard Cassady", 1955),
    ("Paul Hornung", 1956), ("John David Crow", 1957), ("Pete Dawkins", 1958),
    ("Billy Cannon", 1959), ("Joe Bellino", 1960), ("Ernie Davis", 1961),
    ("Terry Baker", 1962), ("Roger Staubach", 1963), ("John Huarte", 1964),
    ("Mike Garrett", 1965), ("Steve Spurrier", 1966), ("Gary Beban", 1967),
    ("O.J. Simpson", 1968), ("Steve Owens", 1969), ("Jim Plunkett", 1970),
    ("Pat Sullivan", 1971), ("Johnny Rodgers", 1972), ("John Cappelletti", 1973),
    ("Archie Griffin", 1974), ("Archie Griffin", 1975), ("Tony Dorsett", 1976),
    ("Earl Campbell", 1977), ("Billy Sims", 1978), ("Charles White", 1979),
    ("George Rogers", 1980), ("Marcus Allen", 1981), ("Herschel Walker", 1982),
    ("Mike Rozier", 1983), ("Doug Flutie", 1984), ("Bo Jackson", 1985),
    ("Vinny Testaverde", 1986), ("Tim Brown", 1987), ("Barry Sanders", 1988),
    ("Andre Ware", 1989), ("Ty Detmer", 1990), ("Desmond Howard", 1991),
    ("Gino Torretta", 1992), ("Charlie Ward", 1993), ("Rashaan Salaam", 1994),
    ("Eddie George", 1995), ("Danny Wuerffel", 1996), ("Charles Woodson", 1997),
    ("Ricky Williams", 1998), ("Ron Dayne", 1999), ("Chris Weinke", 2000),
    ("Eric Crouch", 2001), ("Carson Palmer", 2002), ("Jason White", 2003),
    ("Matt Leinart", 2004), ("Reggie Bush", 2005), ("Troy Smith", 2006),
    ("Tim Tebow", 2007), ("Sam Bradford", 2008), ("Mark Ingram", 2009),
    ("Cam Newton", 2010), ("Robert Griffin III", 2011), ("Johnny Manziel", 2012),
    ("Jameis Winston", 2013), ("Marcus Mariota", 2014), ("Derrick Henry", 2015),
    ("Lamar Jackson", 2016), ("Baker Mayfield", 2017), ("Kyler Murray", 2018),
    ("Joe Burrow", 2019), ("DeVonta Smith", 2020), ("Bryce Young", 2021),
    ("Caleb Williams", 2022), ("Jayden Daniels", 2023), ("Travis Hunter", 2024),
    ("Fernando Mendoza", 2025),
}
