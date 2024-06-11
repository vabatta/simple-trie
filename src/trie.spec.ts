import { test } from "@japa/runner";

import { Trie } from "./trie.ts";

test.group("trailing slash option", () => {
	test("should consider trailing slashes", ({ expect }) => {
		const trie = new Trie<string>({ ignoreTrailingSlashes: false });
		trie.insert("/users/", "users trailing");
		trie.insert("/nested//", "nested trailing");

		expect(trie.lookup("/users/")).toEqual([{ data: "users trailing" }]);
		expect(trie.lookup("/users")).toBeUndefined();
		expect(trie.lookup("/nested//")).toEqual([{ data: "nested trailing" }]);
		expect(trie.lookup("/nested/")).toBeUndefined();
		expect(trie.lookup("/nested")).toBeUndefined();
	});

	test("should ignore trailing slashes", ({ expect }) => {
		const trie = new Trie<string>({ ignoreTrailingSlashes: true });
		trie.insert("/users/", "users trailing");
		trie.insert("/nested//", "nested trailing");

		expect(trie.lookup("/users/")).toEqual([{ data: "users trailing" }]);
		expect(trie.lookup("/users")).toEqual([{ data: "users trailing" }]);

		expect(trie.lookup("/nested//")).toEqual([{ data: "nested trailing" }]);
		expect(trie.lookup("/nested/")).toEqual([{ data: "nested trailing" }]);
		expect(trie.lookup("/nested")).toEqual([{ data: "nested trailing" }]);
	});
});

test.group("consecutive slashes option", () => {
	test("should consider consecutive slashes", ({ expect }) => {
		const trie = new Trie<string>({ ignoreConsecutiveSlashes: false });
		trie.insert("/users//dashboard", "users//dashboard");

		expect(trie.lookup("/users//dashboard")).toEqual([{ data: "users//dashboard" }]);
		expect(trie.lookup("/users/dashboard")).toBeUndefined();
	});

	test("should ignore consecutive slashes", ({ expect }) => {
		const trie = new Trie<string>({ ignoreConsecutiveSlashes: true });
		trie.insert("/users//dashboard", "users/dashboard");
		trie.insert("/some//test////", "some/test/");

		expect(trie.lookup("/users//dashboard")).toEqual([{ data: "users/dashboard" }]);
		expect(trie.lookup("/users/dashboard")).toEqual([{ data: "users/dashboard" }]);
		expect(trie.lookup("/some//test////")).toEqual([{ data: "some/test/" }]);
		expect(trie.lookup("/some//test")).toBeUndefined();
	});
});

test.group("lookup", () => {
	test("should handle static paths", ({ expect }) => {
		const trie = new Trie<string>();
		trie.insert("/", "index");
		trie.insert("/users/dashboard", "users/dashboard");

		expect(trie.lookup("/")).toEqual([{ data: "index" }]);
		expect(trie.lookup("/users/dashboard")).toEqual([{
			data: "users/dashboard",
		}]);

		expect(trie.lookup("/not/found")).toBeUndefined();
	});

	test("should handle param paths", ({ expect }) => {
		const trie = new Trie<string>();
		trie.insert("/:id", ":id");
		trie.insert("/:id/:org", ":id/:org");

		expect(trie.lookup("/1")).toEqual([{
			data: ":id",
			parameters: { id: "1" },
		}]);
		expect(trie.lookup("/1/abc")).toEqual([{
			data: ":id/:org",
			parameters: { id: "1", org: "abc" },
		}]);

		expect(trie.lookup("/not/found/nested")).toBeUndefined();
	});

	test("should handle param paths with different names", ({ expect }) => {
		const trie = new Trie<string>();
		trie.insert("/:id/:org", ":id/:org");
		trie.insert("/:name/:surname", ":name/:surname");

		expect(trie.lookup("/1/abc")).toEqual([{
			data: ":id/:org",
			parameters: { id: "1", org: "abc" },
		}, { data: ":name/:surname", parameters: { name: "1", surname: "abc" } }]);
		expect(trie.lookup("/john/doe")).toEqual([{
			data: ":id/:org",
			parameters: { id: "john", org: "doe" },
		}, {
			data: ":name/:surname",
			parameters: { name: "john", surname: "doe" },
		}]);
	});

	test("should handle mixed static and params paths", ({ expect }) => {
		const trie = new Trie<string>();
		trie.insert("/users/:id/admin/:org", "users/:id/admin/:org");
		trie.insert("/users/:id/dashboard", "users/:id/dashboard");
		trie.insert("/users/:id", "users/:id");

		expect(trie.lookup("/users/1/admin/4")).toEqual([{
			data: "users/:id/admin/:org",
			parameters: { id: "1", org: "4" },
		}]);
		expect(trie.lookup("/users/1/dashboard")).toEqual([{
			data: "users/:id/dashboard",
			parameters: { id: "1" },
		}]);
		expect(trie.lookup("/users/1")).toEqual([{
			data: "users/:id",
			parameters: { id: "1" },
		}]);

		expect(trie.lookup("/users/not/found")).toBeUndefined();
	});

	test("should handle wildcard paths", ({ expect }) => {
		const trie = new Trie<string>();
		trie.insert("/*wildcard", "*wildcard");

		expect(trie.lookup("/anything/even/deeply/nested")).toEqual([{
			data: "*wildcard",
			parameters: { wildcard: "anything/even/deeply/nested" },
		}]);
	});

	test("should handle wildcard paths with different names", ({ expect }) => {
		const trie = new Trie<string>();
		trie.insert("/*wildcard", "*wildcard");
		trie.insert("/*resource", "*resource");

		expect(trie.lookup("/deeply/nested")).toEqual([{
			data: "*wildcard",
			parameters: { wildcard: "deeply/nested" },
		}, { data: "*resource", parameters: { resource: "deeply/nested" } }]);
	});

	test("should handle mixed static and wildcard paths", ({ expect }) => {
		const trie = new Trie<string>();
		trie.insert("/users/*wildcard", "users/*wildcard");
		trie.insert("/users/assets/*wildcard", "users/assets/*wildcard");

		expect(trie.lookup("/users/1")).toEqual([{
			data: "users/*wildcard",
			parameters: { wildcard: "1" },
		}]);
		expect(trie.lookup("/users/some/other")).toEqual([{
			data: "users/*wildcard",
			parameters: { wildcard: "some/other" },
		}]);
		expect(trie.lookup("/users/assets/profile")).toEqual([{
			data: "users/assets/*wildcard",
			parameters: { wildcard: "profile" },
		}]);
		expect(trie.lookup("/users/assets/deeply/nested")).toEqual([{
			data: "users/assets/*wildcard",
			parameters: { wildcard: "deeply/nested" },
		}]);
	});

	test("should handle mixed param and wildcard paths", ({ expect }) => {
		const trie = new Trie<string>();
		trie.insert("/:id/*wildcard", ":id/*wildcard");

		expect(trie.lookup("/1/assets/tag")).toEqual([{
			data: ":id/*wildcard",
			parameters: { id: "1", wildcard: "assets/tag" },
		}]);
		expect(trie.lookup("/1/assets/deeply/nested/tag")).toEqual([{
			data: ":id/*wildcard",
			parameters: { id: "1", wildcard: "assets/deeply/nested/tag" },
		}]);

		expect(trie.lookup("/unavailable")).toBeUndefined();
	});

	test("should handle mixed static, param and wildcard paths", ({ expect }) => {
		const trie = new Trie<string>();
		trie.insert(
			"/users/dashboard/admin/overview",
			"users/dashboard/admin/overview",
		);
		trie.insert("/users/:id/admin/:org", "users/:id/admin/:org");
		trie.insert("/users/*wildcard", "users/*wildcard");
		trie.insert(
			"/users/:id/metadata/*wildcard",
			"users/:id/metadata/*wildcard",
		);

		expect(trie.lookup("/users/dashboard/admin/overview")).toEqual([{
			data: "users/dashboard/admin/overview",
		}]);
		expect(trie.lookup("/users/1/admin/4")).toEqual([{
			data: "users/:id/admin/:org",
			parameters: { id: "1", org: "4" },
		}]);
		expect(trie.lookup("/users/not/found")).toEqual([{
			data: "users/*wildcard",
			parameters: { wildcard: "not/found" },
		}]);
		expect(trie.lookup("/users/1/metadata/availability/monday")).toEqual([{
			data: "users/:id/metadata/*wildcard",
			parameters: { id: "1", wildcard: "availability/monday" },
		}]);

		expect(trie.lookup("/users/dashboard/customer/overview")).toEqual([{
			data: "users/*wildcard",
			parameters: { wildcard: "dashboard/customer/overview" },
		}]);
		expect(trie.lookup("/users/4/admin")).toEqual([{
			data: "users/*wildcard",
			parameters: { wildcard: "4/admin" },
		}]);
	});
});
