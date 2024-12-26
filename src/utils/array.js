export function getIndexFromArray(arr, value) {
  const index = arr.findIndex(
    (item) => value.toLowerCase() === item.toLowerCase()
  );
  return index !== -1 ? index : -1;
}

export function removeItemOnce(arr, value) {
  var index = arr.indexOf(value);
  if (index > -1) {
    arr.splice(index, 1);
  }
  return arr;
}
