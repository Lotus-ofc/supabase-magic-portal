/** Compositor genérico de snapshots read-model. */
export class SnapshotBuilder<TInput, TSnapshot> {
  constructor(
    private readonly buildFn: (input: TInput) => TSnapshot | Promise<TSnapshot>,
  ) {}

  async build(input: TInput): Promise<TSnapshot> {
    return this.buildFn(input);
  }

  /** Encadeia transformações sem acoplar módulos. */
  pipe<TNext>(next: (snapshot: TSnapshot) => TNext | Promise<TNext>): SnapshotBuilder<TInput, TNext> {
    return new SnapshotBuilder(async (input) => {
      const snapshot = await this.build(input);
      return next(snapshot);
    });
  }
}

export function createSnapshotBuilder<TInput, TSnapshot>(
  buildFn: (input: TInput) => TSnapshot | Promise<TSnapshot>,
): SnapshotBuilder<TInput, TSnapshot> {
  return new SnapshotBuilder(buildFn);
}
