export abstract class TrieNode<D extends unknown> {
	readonly name: string;
	readonly children: Map<string, TrieNode<D>> = new Map();
	readonly data: D[] = [];
	readonly names: string[][] = [];
	end: boolean = false;

	constructor(name: string) {
		this.name = name;
	}
}

export class StaticTrieNode<D extends unknown> extends TrieNode<D> { }
export class ParamTrieNode<D extends unknown> extends TrieNode<D> { }
export class WildcardTrieNode<D extends unknown> extends TrieNode<D> { }
type Params<P extends ReadonlyArray<string>, V = string> = {
	[K in P[number]]: V;
} & Record<string, V>;

type ParamsKeys = ReadonlyArray<string>;

export class Trie<D extends unknown> {
	readonly #root: Readonly<TrieNode<D>> = new StaticTrieNode("<root>");

	public get root(): Readonly<TrieNode<D>> {
		return this.#root;
	}

	public insert(path: string, data: D): void {
		let currentNode: TrieNode<D> = this.#root;
		const parts = path.split("/");

		const names: string[] = [];

		for (const part of parts) {
			if (part.startsWith(":")) {
				if (!currentNode.children.has(":")) {
					currentNode.children.set(":", new ParamTrieNode(part));
				}
				currentNode = currentNode.children.get(":")!;
				names.push(part.slice(1));
			} else if (part.startsWith("*")) {
				if (!currentNode.children.has("*")) {
					currentNode.children.set("*", new WildcardTrieNode(part));
				}
				currentNode = currentNode.children.get("*")!;
				names.push(part.slice(1));
				break; // Wildcard nodes are always the last node
			} else {
				if (!currentNode.children.has(part)) {
					currentNode.children.set(part, new StaticTrieNode(part));
				}
				currentNode = currentNode.children.get(part)!;
			}
		}

		currentNode.data.push(data);
		currentNode.names.push(names);
		currentNode.end = true;
	}

	public lookup<K extends ParamsKeys>(path: string): [data: D[], parameters: Params<K>[]] | undefined {
		const parts = path.split("/");

		return this.#lookup<K>(parts, [], this.#root);
	}

	#lookup<K extends ParamsKeys>(parts: string[], paramValues: string[], node: TrieNode<D>): [data: D[], parameters: Params<K>[]] | undefined {
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

