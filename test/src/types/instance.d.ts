interface Instance {
    FindFirstAncestor<T extends Instance = Instance>(name: number | string): N<T>;
    FindFirstChild<K extends ExtractKeys<this, Instance> = ExtractKeys<this, Instance>>(
        childName: K,
        recursive?: boolean
    ): this[K];
    FindFirstChild<T extends Instance = Instance>(
        childName: number | string,
        recursive?: boolean
    ): N<T>;
    FindFirstDescendant<T extends Instance = Instance>(name: number | string): N<T>;
    GetAttribute<T extends AttributeValue = AttributeValue>(attribute: string): N<T>;
    WaitForChild<K extends ExtractKeys<this, Instance> = ExtractKeys<this, Instance>>(
        childName: K,
        timeout: number
    ): N<this[K]>;
    WaitForChild<K extends ExtractKeys<this, Instance> = ExtractKeys<this, Instance>>(
        childName: K
    ): this[K];
    WaitForChild<T extends Instance = Instance>(childName: string): T;
    WaitForChild<T extends Instance = Instance>(childName: string, timeout: number): N<T>;
}
