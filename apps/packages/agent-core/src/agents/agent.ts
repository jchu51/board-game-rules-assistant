export abstract class Agent<Output = string> {
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  abstract run(input: string): Promise<Output>;
}
