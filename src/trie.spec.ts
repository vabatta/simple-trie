import { describe, it, expect } from 'bun:test';

import { Trie } from './trie';

describe("Trie", () => {
	describe("lookup", () => {
		it("should handle static paths", () => {
			const trie = new Trie<string>();
			trie.insert("/", "index");
			trie.insert("/users/dashboard", "users/dashboard");

			expect(trie.lookup("/")).toEqual([{ data: "index" }]);
			expect(trie.lookup("/users/dashboard")).toEqual([{ data: "users/dashboard" }]);

			expect(trie.lookup("/not/found")).toBeUndefined();
		});

		it("should handle param paths", () => {
			const trie = new Trie<string>();
			trie.insert("/:id", ":id");
			trie.insert("/:id/:org", ":id/:org");

			expect(trie.lookup("/1")).toEqual([{ data: ":id", parameters: { id: "1" } }]);
			expect(trie.lookup("/1/abc")).toEqual([{ data: ":id/:org", parameters: { id: "1", org: "abc" } }]);

			expect(trie.lookup("/not/found/nested")).toBeUndefined();
		});

		it("should handle param paths with different names", () => {
			const trie = new Trie<string>();
			trie.insert("/:id/:org", ":id/:org");
			trie.insert("/:name/:surname", ":name/:surname");

			expect(trie.lookup("/1/abc")).toEqual([{ data: ":id/:org", parameters: { id: "1", org: "abc" } }, { data: ":name/:surname", parameters: { name: "1", surname: "abc" } }]);
			expect(trie.lookup("/john/doe")).toEqual([{ data: ":id/:org", parameters: { id: "john", org: "doe" } }, { data: ":name/:surname", parameters: { name: "john", surname: "doe" } }]);
		});

		it("should handle mixed static and params paths", () => {
			const trie = new Trie<string>();
			trie.insert("/users/:id/admin/:org", "users/:id/admin/:org");
			trie.insert("/users/:id/dashboard", "users/:id/dashboard");
			trie.insert("/users/:id", "users/:id");

			expect(trie.lookup("/users/1/admin/4")).toEqual([{ data: "users/:id/admin/:org", parameters: { id: "1", org: "4" } }]);
			expect(trie.lookup("/users/1/dashboard")).toEqual([{ data: "users/:id/dashboard", parameters: { id: "1" } }]);
			expect(trie.lookup("/users/1")).toEqual([{ data: "users/:id", parameters: { id: "1" } }]);

			expect(trie.lookup("/users/not/found")).toBeUndefined();
		});

		it("should handle wildcard paths", () => {
			const trie = new Trie<string>();
			trie.insert("/*wildcard", "*wildcard");

			expect(trie.lookup("/anything/even/deeply/nested")).toEqual([{ data: "*wildcard", parameters: { wildcard: "anything/even/deeply/nested" } }]);
		});

		it("should handle wildcard paths with different names", () => {
			const trie = new Trie<string>();
			trie.insert("/*wildcard", "*wildcard");
			trie.insert("/*resource", "*resource");

			expect(trie.lookup("/deeply/nested")).toEqual([{ data: "*wildcard", parameters: { wildcard: "deeply/nested" } }, { data: "*resource", parameters: { resource: "deeply/nested" } }]);
		});

		it("should handle mixed static and wildcard paths", () => {
			const trie = new Trie<string>();
			trie.insert("/users/*wildcard", "users/*wildcard");
			trie.insert("/users/assets/*wildcard", "users/assets/*wildcard");

			expect(trie.lookup("/users/1")).toEqual([{ data: "users/*wildcard", parameters: { wildcard: "1" } }]);
			expect(trie.lookup("/users/some/other")).toEqual([{ data: "users/*wildcard", parameters: { wildcard: "some/other" } }]);
			expect(trie.lookup("/users/assets/profile")).toEqual([{ data: "users/assets/*wildcard", parameters: { wildcard: "profile" } }]);
			expect(trie.lookup("/users/assets/deeply/nested")).toEqual([{ data: "users/assets/*wildcard", parameters: { wildcard: "deeply/nested" } }]);
		});

		it("should handle mixed param and wildcard paths", () => {
			const trie = new Trie<string>();
			trie.insert("/:id/*wildcard", ":id/*wildcard");

			expect(trie.lookup("/1/assets/tag")).toEqual([{ data: ":id/*wildcard", parameters: { id: "1", wildcard: "assets/tag" } }]);
			expect(trie.lookup("/1/assets/deeply/nested/tag")).toEqual([{ data: ":id/*wildcard", parameters: { id: "1", wildcard: "assets/deeply/nested/tag" } }]);

			expect(trie.lookup("/unavailable")).toBeUndefined();
		});

		it("should handle mixed static, param and wildcard paths", () => {
			const trie = new Trie<string>();
			trie.insert("/users/dashboard/admin/overview", "users/dashboard/admin/overview");
			trie.insert("/users/:id/admin/:org", "users/:id/admin/:org");
			trie.insert("/users/*wildcard", "users/*wildcard");
			trie.insert("/users/:id/metadata/*wildcard", "users/:id/metadata/*wildcard");

			expect(trie.lookup("/users/dashboard/admin/overview")).toEqual([{ data: "users/dashboard/admin/overview" }]);
			expect(trie.lookup("/users/1/admin/4")).toEqual([{ data: "users/:id/admin/:org", parameters: { id: "1", org: "4" } }]);
			expect(trie.lookup("/users/not/found")).toEqual([{ data: "users/*wildcard", parameters: { wildcard: "not/found" } }]);
			expect(trie.lookup("/users/1/metadata/availability/monday")).toEqual([{ data: "users/:id/metadata/*wildcard", parameters: { id: "1", wildcard: "availability/monday" } }]);

			expect(trie.lookup("/users/dashboard/customer/overview")).toEqual([{ data: "users/*wildcard", parameters: { wildcard: "dashboard/customer/overview" } }]);
			expect(trie.lookup("/users/4/admin")).toEqual([{ data: "users/*wildcard", parameters: { wildcard: "4/admin" } }]);
		});
	});
});