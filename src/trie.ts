export abstract class TrieNode<T extends unknown> {
	readonly children: Map<string, TrieNode<T>> = new Map();
	data: T;
	names: string[][] = [];
	end: boolean = false;

	constructor(data: T) {
		this.data = data;
	}
}

export class StaticTrieNode<T extends unknown> extends TrieNode<T> { }
export class ParamTrieNode<T extends unknown> extends TrieNode<T> { }
export class WildcardTrieNode<T extends unknown> extends TrieNode<T> { }
type Params<T extends ReadonlyArray<string>, V = string> = {
	[K in T[number]]: V;
} & Record<string, V>;

export class Trie<T extends unknown, D extends unknown> {
	readonly #root: Readonly<TrieNode<T>>;
	readonly #store: () => T;
	readonly #set: (store: T, data: D, path: string) => T;

	public constructor(store: () => T, set: (store: T, data: D, path: string) => T) {
		this.#store = store;
		this.#set = set;
		this.#root = new StaticTrieNode(this.#store());
	}

	public get root(): Readonly<TrieNode<T>> {
		return this.#root;
	}

	public insert(path: string, data: D): void {
		let currentNode: TrieNode<T> = this.#root;
		const parts = path.split("/");

		const names: string[] = [];

		for (const part of parts) {
			if (part.startsWith(":")) {
				if (!currentNode.children.has(":")) {
					currentNode.children.set(":", new ParamTrieNode(this.#store()));
				}
				currentNode = currentNode.children.get(":")!;
				names.push(part.slice(1));
			} else if (part.startsWith("*")) {
				if (!currentNode.children.has("*")) {
					currentNode.children.set("*", new WildcardTrieNode(this.#store()));
				}
				currentNode = currentNode.children.get("*")!;
				names.push(part.slice(1));
				break; // Wildcard nodes are always the last node
			} else {
				if (!currentNode.children.has(part)) {
					currentNode.children.set(part, new StaticTrieNode(this.#store()));
				}
				currentNode = currentNode.children.get(part)!;
			}
		}

		currentNode.names.push(names);
		currentNode.end = true;
		currentNode.data = this.#set(currentNode.data, data, path);
	}

	public lookup<K extends ReadonlyArray<string>>(path: string): [data: T, parameters: Params<K>[]] | undefined {
		const parts = path.split("/");

		return this.#lookup<K>(parts, [], this.#root);
	}

	#lookup<K extends ReadonlyArray<string>>(parts: string[], paramValues: string[], node: TrieNode<T>): [data: T, parameters: Params<K>[]] | undefined {
		if (parts.length === 0) {
			const params = paramValues.length > 0 ? node.names.map((names) => {
				const result: Record<string, string> = {};

				names.forEach((name, index) => {
					// TODO: handle multiple values for the same param name?
					result[name] = paramValues[index];
				});

				return result as Params<K>;
			}) : [];

			return node.end ? [node.data, params] : undefined;
		}

		const [currentPart, ...restParts] = parts;

		// Try static path first
		if (node.children.has(currentPart)) {
			const result = this.#lookup<K>(restParts, paramValues, node.children.get(currentPart)!);
			if (result !== undefined) {
				return result;
			}
		}

		// Try parameterized path second
		if (node.children.has(":") && currentPart) {
			const result = this.#lookup<K>(restParts, [...paramValues, currentPart], node.children.get(":")!);
			if (result !== undefined) {
				return result;
			}
		}

		// Try wildcard path last
		if (node.children.has("*") && currentPart) {
			const wildcardNode = node.children.get("*")!;

			const params = wildcardNode.names.map((names) => {
				const result: Record<string, string> = {};
				let walkParamIndex = 0;

				names.forEach((name) => {
					// TODO: handle multiple values for the same param name?
					const value = walkParamIndex < paramValues.length ? paramValues[walkParamIndex++] : parts.join("/");
					result[name] = value;
				});

				return result as Params<K>;
			});

			return wildcardNode.end ? [wildcardNode.data, params] : undefined;
		}

		return undefined;
	}
}

export function* prettyPrint<T extends unknown>(node: TrieNode<T>, prefix: string = '', isRoot: boolean = false): Generator<string> {
	if (isRoot) yield '┬';

	// TODO: sort static paths by their weight (numbers of children)
	// sort children by static, param, wildcard
	const sortedChildren = Array.from(node.children.entries()).sort(([a], [b]) => {
		if (a === "*") return 1;
		if (b === "*") return -1;
		if (a === ":") return 1;
		if (b === ":") return -1;
		return 0;
	});

	for (const [key, childNode] of sortedChildren) {
		if (childNode instanceof StaticTrieNode) {
			yield `${prefix}├── /${key}`;
		} else if (childNode instanceof ParamTrieNode) {
			yield `${prefix}├── /:param`;
		} else if (childNode instanceof WildcardTrieNode) {
			yield `${prefix}├── /*wildcard`;
		}

		yield* prettyPrint(childNode, `${prefix}│   `);

		if (childNode.end) {
			yield `${prefix}│   └── (end)`;
		} else {
			yield `${prefix}│   ┴`;
		}
	}

	if (isRoot) yield '┴';
}

