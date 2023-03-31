import GLState from "./GLState";

type StripFront<S extends string, T extends string> = S extends `${T}${infer U}`
  ? U
  : S;

type BindableResourceLiteral = StripFront<
  keyof WebGL2RenderingContext & `bind${string}`,
  "bind"
>;
export type BindableState = Omit<GLState, "type"> & {
  bind: () => void;
  unbind: () => void;
};

export function autobound(
  method: Function,
  context: ClassMethodDecoratorContext<BindableState>
) {
  return function (this: BindableState, ...args: any[]) {
    this.bind();
    method.call(this, ...args);
    this.unbind();
  };
}
