This experiment was meant to test how the cost of parsing JSON would compare to
parsing the HTML to be generated from that JSON, if it were sent rendered ahead
of time.

[asJSON.html](./asJSON.html), which just includes the JSON inline in a script.
Calling the global function `generateItems` will generate the actual HTML. The
result of `document.body.innerHTML` is copied into
[asHTML.html](./asHTML.html), along with the styles from asJSON.html and one
additional style which applies `display: none;` to all of the items. The styles
appear before the generated HTML so that the style engine would ideally notice
that it doesn't need to render any of the HTML. The full JSON page is about
3.5M and the page with the prerendered HTML, which renders each field of the
JSON items into 3 nodes, turns out to be about 18M. Unsurprisingly, the JSON
page takes significantly less time to load (~0.5s vs ~4s) and the HTML page
spends the majority of its time in parsing. This doesn't seem particularly
compelling as a real world - except as a worst-case scenario.

Given that the amount of content in that JSON was (unusually?) large (81 keys /
object * ~10 nodes / key, for every item) I tried using a smaller subset of the
data. In the new test, the new JSON's content was pruned down to the used
subset and each item only generates about 15 nodes total using all of the
remaining data. The page containing JSON
([asJSON_small.html](./asJSON_small.html)) ended up at about 300K and the page
containing the rendered HTML ([asHTML_small.html](./asHTML_small.html)) ended
up at about 450K. The JSON version of the page seems to get to DOMContentLoaded
in ~90ms, the prerendered HTML version usually takes ~135ms.

### Sources

The JSON used is in exoplanets_kepler_field.json, pulled from a NASA site
because I figured they would be a good place to grab large blob of public
domain data.

API Docs:
https://exoplanetarchive.ipac.caltech.edu/docs/API_queries.html

Query used to retrieve the JSON:
https://exoplanetarchive.ipac.caltech.edu/cgi-bin/nstedAPI/nph-nstedAPI?table=exoplanets&format=json&where=pl_kepflag=1
