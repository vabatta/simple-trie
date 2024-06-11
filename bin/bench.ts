import { baseline, bench, group, run } from "mitata";
import { createRouter } from "radix3";
import { Trie as RouteTrie } from "route-trie";
import { Trie } from "..";

const router = createRouter(/* options */);

router.insert("/path", { payload: "this path" });
router.insert("/path/:name", { payload: "named route" });
router.insert("/path/foo/**:name", { payload: "named wildcard route" });

group("radix3", () => {
	baseline("static path", () => router.lookup("/path"));
	bench("param path", () => router.lookup("/path/123"));
	bench("wildcard path", () => router.lookup("/path/foo/123"));
	bench("not found", () => router.lookup("/not/found"));
});

const routeTrie = new RouteTrie();

routeTrie.define("/path");
routeTrie.define("/path/:name");
routeTrie.define("/path/foo/:wildcard*");

group("route-trie", () => {
	baseline("static path", () => routeTrie.match("/path"));
	bench("param path", () => routeTrie.match("/path/123"));
	bench("wildcard path", () => routeTrie.match("/path/foo/123"));
	bench("not found", () => routeTrie.match("/not/found"));
});

const trie = new Trie<string>();

trie.insert("/path", "this path");
trie.insert("/path/:name", "named route");
trie.insert("/path/foo/*wildcard", "named wildcard route");

group("trie", () => {
	baseline("static path", () => trie.lookup("/path"));
	bench("param path", () => trie.lookup("/path/123"));
	bench("wildcard path", () => trie.lookup("/path/foo/123"));
	bench("not found", () => router.lookup("/not/found"));
});

await run();
