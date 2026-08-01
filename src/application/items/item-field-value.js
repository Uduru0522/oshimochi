export function getItemFieldValue(item, field) {
  if (!field.isBuiltIn) {
    return item.customValues[field.id];
  }

  switch (field.key) {
    case "id":
      return item.id;
    case "name":
      return item.name;
    case "image":
      return item.imageAssetId;
    default:
      return undefined;
  }
}
