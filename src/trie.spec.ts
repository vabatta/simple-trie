import { describe, it, expect } from 'bun:test';

import { Trie } from './trie';

describe("Trie", () => {
	describe("lookup", () => {
		it("should handle static paths", () => {
			const trie = new Trie<string>();
			trie.insert("/", "index");
			trie.insert("/users/dashboard", "users/dashboard");

			expect(trie.lookup("/")).toEqual([["index"], []]);
			expect(trie.lookup("/users/dashboard")).toEqual([["users/dashboard"], []]);

			expect(trie.lookup("/not/found")).toBeUndefined();
		});

		it("should handle param paths", () => {
			const trie = new Trie<string>();
			trie.insert("/:id", ":id");
			trie.insert("/:id/:org", ":id/:org");

			expect(trie.lookup("/1")).toEqual([[":id"], [{ id: "1" }]]);
			expect(trie.lookup("/1/abc")).toEqual([[":id/:org"], [{ id: "1", org: "abc" }]]);

			expect(trie.lookup("/not/found/nested")).toBeUndefined();
		});

		it("should handle param paths with different names", () => {
			const trie = new Trie<string>();
			trie.insert("/:id/:org", ":id/:org");
			trie.insert("/:name/:surname", ":name/:surname");

			expect(trie.lookup("/1/abc")).toEqual([[":id/:org", ":name/:surname"], [{ id: "1", org: "abc" }, { name: "1", surname: "abc" }]]);
			expect(trie.lookup("/john/doe")).toEqual([[":id/:org", ":name/:surname"], [{ id: "john", org: "doe" }, { name: "john", surname: "doe" }]]);
		});

		it("should handle mixed static and params paths", () => {
			const trie = new Trie<string>();
			trie.insert("/users/:id/admin/:org", "users/:id/admin/:org");
			trie.insert("/users/:id/dashboard", "users/:id/dashboard");
			trie.insert("/users/:id", "users/:id");

			expect(trie.lookup("/users/1/admin/4")).toEqual([["users/:id/admin/:org"], [{ id: "1", org: "4" }]]);
			expect(trie.lookup("/users/1/dashboard")).toEqual([["users/:id/dashboard"], [{ id: "1" }]]);
			expect(trie.lookup("/users/1")).toEqual([["users/:id"], [{ id: "1" }]]);

			expect(trie.lookup("/users/not/found")).toBeUndefined();
		});

		it("should handle wildcard paths", () => {
			const trie = new Trie<string>();
			trie.insert("/*wildcard", "*wildcard");

			expect(trie.lookup("/anything/even/deeply/nested")).toEqual([["*wildcard"], [{ wildcard: "anything/even/deeply/nested" }]]);
		});

		it("should handle wildcard paths with different names", () => {
			const trie = new Trie<string>();
			trie.insert("/*wildcard", "*wildcard");
			trie.insert("/*resource", "*resource");

			expect(trie.lookup("/deeply/nested")).toEqual([["*wildcard", "*resource"], [{ wildcard: "deeply/nested" }, { resource: "deeply/nested" }]]);
		});

		it("should handle mixed static and wildcard paths", () => {
			const trie = new Trie<string>();
			trie.insert("/users/*wildcard", "users/*wildcard");
			trie.insert("/users/assets/*wildcard", "users/assets/*wildcard");

			expect(trie.lookup("/users/1")).toEqual([["users/*wildcard"], [{ wildcard: "1" }]]);
			expect(trie.lookup("/users/some/other")).toEqual([["users/*wildcard"], [{ wildcard: "some/other" }]]);
			expect(trie.lookup("/users/assets/profile")).toEqual([["users/assets/*wildcard"], [{ wildcard: "profile" }]]);
			expect(trie.lookup("/users/assets/deeply/nested")).toEqual([["users/assets/*wildcard"], [{ wildcard: "deeply/nested" }]]);
		});

		it("should handle mixed param and wildcard paths", () => {
			const trie = new Trie<string>();
			trie.insert("/:id/*wildcard", ":id/*wildcard");

			expect(trie.lookup("/1/assets/tag")).toEqual([[":id/*wildcard"], [{ id: "1", wildcard: "assets/tag" }]]);
			expect(trie.lookup("/1/assets/deeply/nested/tag")).toEqual([[":id/*wildcard"], [{ id: "1", wildcard: "assets/deeply/nested/tag" }]]);

			expect(trie.lookup("/unavailable")).toBeUndefined();
		});

		it("should handle mixed static, param and wildcard paths", () => {
			const trie = new Trie<string>();
			trie.insert("/users/dashboard/admin/overview", "users/dashboard/admin/overview");
			trie.insert("/users/:id/admin/:org", "users/:id/admin/:org");
			trie.insert("/users/*wildcard", "users/*wildcard");
			trie.insert("/users/:id/metadata/*wildcard", "users/:id/metadata/*wildcard");

			expect(trie.lookup("/users/dashboard/admin/overview")).toEqual([["users/dashboard/admin/overview"], []]);
			expect(trie.lookup("/users/1/admin/4")).toEqual([["users/:id/admin/:org"], [{ id: "1", org: "4" }]]);
			expect(trie.lookup("/users/not/found")).toEqual([["users/*wildcard"], [{ wildcard: "not/found" }]]);
			expect(trie.lookup("/users/1/metadata/availability/monday")).toEqual([["users/:id/metadata/*wildcard"], [{ id: "1", wildcard: "availability/monday" }]]);

			expect(trie.lookup("/users/dashboard/customer/overview")).toEqual([["users/*wildcard"], [{ wildcard: "dashboard/customer/overview" }]]);
			expect(trie.lookup("/users/4/admin")).toEqual([["users/*wildcard"], [{ wildcard: "4/admin" }]]);
		});
	});
});