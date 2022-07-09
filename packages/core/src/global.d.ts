type IndexedMap<Key extends string | number | symbol, Value extends Object> = {
  [key in Key]: Value;
};
