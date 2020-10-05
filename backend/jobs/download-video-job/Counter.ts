/**
 * Needed a pass-by-reference counter to share state during the
 * recursive descent parsing of M3U8 files and their children.
 * I figured I shouldn't stick `atomic` in here without a good reason.
 */
export class Counter {
  private _value: number = 0;
  get value() { return this._value; }

  getAndIncrement() {
    return (this._value++);
  }
}
