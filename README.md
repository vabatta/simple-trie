# Trie

A simple slash path-based Trie which can be used to store arbitrary data lists in a tree structure, allowing repeated elements at the same location.
  
Supports multiple named :param and trailing *wildcards.

## Order of precedence

Insertion order is independent of the order of precedence. The order of precedence is determined by the following:

1. Exact match (aka static)
2. :param
3. *wildcard

This means that at every level, the trie will first look for an exact match, then a :param match, and finally a *wildcard match without bubbling back up for previous precendece levels.

```ts
import { Trie } from "trie";

const trie = new Trie<string>();

trie.insert("/users/:id/admin/:org/view", "users/:id/admin/:org/view");
trie.insert("/users/assets/*resource", "users/assets/*resource");

// assets is static, hence will take precedence over :id at the same level
trie.lookup("/users/assets/admin/js/view"); // [{ data: "users/assets/*resource", params: { resource: "admin/js/view" } }]
```

## Usage

```ts
import { Trie } from "trie";

const trie = new Trie<string>();

trie.insert("/users/assets/*resource", "users/assets/*resource");
trie.insert("/users", "users");
trie.insert("/users/:id", "users/:id");
trie.insert("/users/:id/admin/:org/view", "users/:id/admin/:org/view");
trie.insert("/users/:id/admin/:org/edit", "users/:id/admin/:org/edit");
trie.insert("/tenants/:id", "tenants/:id");
trie.insert("/tenants/:org", "tenants/:org");

trie.lookup("/users/assets/admin/js/view"); // [{ data: "users/assets/*resource", params: { resource: "admin/js/view" } }]
trie.lookup("/users/123/admin/456/view"); // [{ data: "users/:id/admin/:org/view", params: { id: "123", org: "456" } }]
trie.lookup("/users"); // [{ data: "users" }]
trie.lookup("/users/123"); // [{ data: "users/:id", params: { id: "123" } }]
trie.lookup("/tenants/123"); // [{ data: "tenants/:id", params: { id: "123" } }, { data: "tenants/:org", params: { org: "123" } }]
```
